import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import LoadingScreen from "./LoadingScreen";
import LoginPage from "./components/LoginPage/LoginPage";
import ReportAnalysis from "./components/ReportAnalysis/ReportAnalysis";

type Phase = "idle" | "fetching" | "ready" | "error";
type SharePhase = "idle" | "loading" | "ready" | "error";

type ShareArtist = {
  id?: string;
  name: string;
  image?: string;
};

type ShareGenre = {
  name: string;
  count: number;
};

type SharePayload = {
  id: string;
  createdAt: string;
  displayName?: string;
  artists: ShareArtist[];
  genres: ShareGenre[];
};

const API_BASE = "https://127.0.0.1:5001";

const buildTopGenres = (items: any[], limit = 8): ShareGenre[] => {
  const counts = new Map<string, number>();

  items.forEach((artist) => {
    if (!Array.isArray(artist?.genres)) return;
    artist.genres.forEach((genre: string) => {
      if (typeof genre !== "string") return;
      const key = genre.trim();
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
};

function App() {
  const [status, setStatus] = useState<"loading" | "logged-in" | "logged-out">(
    "loading"
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [songs, setSongs] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  const [sharePhase, setSharePhase] = useState<SharePhase>("idle");
  const [shareData, setShareData] = useState<SharePayload | null>(null);
  const [shareViewError, setShareViewError] = useState<string | null>(null);

  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareCreateError, setShareCreateError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // loading progress shown on loadingscreen
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const shareId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const trimmed = window.location.pathname.replace(/\/+$/, "");
    const match = trimmed.match(/^\/share\/([^/]+)$/);
    if (match?.[1]) return decodeURIComponent(match[1]);
    const url = new URL(window.location.href);
    return url.searchParams.get("share");
  }, []);

  const isShareMode = Boolean(shareId);
  const topGenres = useMemo(() => buildTopGenres(artists), [artists]);

  const shareDateLabel = useMemo(() => {
    if (!shareData?.createdAt) return null;
    const parsed = new Date(shareData.createdAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [shareData]);

  const setProgressSafe = (updater: number | ((prev: number) => number)) => {
    const next =
      typeof updater === "function" ? updater(progressRef.current) : updater;
    const clamped = Math.max(0, Math.min(100, next));
    progressRef.current = clamped;
    setProgress(clamped);
  };

  // starts progress bar
  const startProgress = () => {
    setProgressSafe(5);

    const id = window.setInterval(() => {
      setProgressSafe((cur) => {
        const cap = 92;
        if (cur >= cap) return cur;

        const step =
          cur < 35 ? 0.85 : cur < 65 ? 0.55 : cur < 80 ? 0.28 : 0.14;

        return cur + step;
      });
    }, 60);

    return id;
  };

  const login = () => {
    window.location.href = `${API_BASE}/auth/spotify/login`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/spotify/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setStatus("logged-out");
      setPhase("idle");
      setSongs([]);
      setArtists([]);
      setErrorMsg(null);
      setProfileName(null);
      setProgressSafe(0);
      setShareLink(null);
      setShareBusy(false);
      setShareCreateError(null);
      setShareCopied(false);
    }
  };

  useEffect(() => {
    if (isShareMode) return;
    const checkStatus = async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/spotify/status`, {
          credentials: "include",
        });
        const j = await r.json();
        setStatus(j.loggedIn ? "logged-in" : "logged-out");
      } catch {
        setStatus("logged-out");
      }
    };

    checkStatus();
  }, [isShareMode]);

  useEffect(() => {
    if (status !== "logged-in" || isShareMode) return;

    let cancelled = false;

    const load = async () => {
      let fakeId: number | null = null;

      try {
        setErrorMsg(null);
        setPhase("fetching");
        fakeId = startProgress();

        const [tracksRes, artistsRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/auth/spotify/top-tracks`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/auth/spotify/top-artists`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/auth/spotify/me`, {
            credentials: "include",
          }),
        ]);

        if (!tracksRes.ok)
          throw new Error(`Top tracks failed: ${tracksRes.status}`);
        if (!artistsRes.ok)
          throw new Error(`Top artists failed: ${artistsRes.status}`);

        const [tracksData, artistsData] = await Promise.all([
          tracksRes.json(),
          artistsRes.json(),
        ]);
        const profileData = profileRes.ok
          ? await profileRes.json().catch(() => null)
          : null;

        if (cancelled) return;

        setSongs(tracksData.items || tracksData);
        setArtists(artistsData.items || artistsData);
        if (profileData) {
          const rawName =
            typeof profileData?.display_name === "string"
              ? profileData.display_name.trim()
              : "";
          const fallbackId =
            typeof profileData?.id === "string" ? profileData.id.trim() : "";
          setProfileName(rawName || fallbackId || null);
        }

        if (fakeId) window.clearInterval(fakeId);
        setProgressSafe(100);

        await new Promise((r) => setTimeout(r, 250));

        if (cancelled) return;
        setPhase("ready");
      } catch (e: any) {
        console.error(e);
        if (fakeId) window.clearInterval(fakeId);
        if (cancelled) return;

        setErrorMsg(e?.message ?? "Failed to load stats");
        setPhase("error");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [status, isShareMode]);

  useEffect(() => {
    if (!shareId) return;
    let cancelled = false;

    const loadShare = async () => {
      try {
        setShareViewError(null);
        setSharePhase("loading");

        const resp = await fetch(`${API_BASE}/share/${shareId}`);
        const data = await resp.json().catch(() => null);

        if (!resp.ok) {
          const message =
            typeof data?.error === "string"
              ? data.error
              : "Share not available";
          throw new Error(message);
        }

        if (cancelled) return;
        setShareData(data);
        setSharePhase("ready");
      } catch (err: any) {
        if (cancelled) return;
        setShareViewError(err?.message ?? "Share not available");
        setSharePhase("error");
      }
    };

    loadShare();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const createShareLink = async () => {
    if (shareBusy) return;
    if (artists.length === 0 && topGenres.length === 0) {
      setShareCreateError("No stats available to share yet.");
      return;
    }

    setShareBusy(true);
    setShareCreateError(null);
    setShareCopied(false);

    try {
      const payload = {
        artists: artists.map((artist) => ({
          id: artist?.id,
          name: artist?.name,
          image: artist?.images?.[0]?.url,
        })),
        genres: topGenres,
        displayName: profileName ?? undefined,
      };

      const resp = await fetch(`${API_BASE}/share`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : "Failed to create share link";
        throw new Error(message);
      }

      if (!data?.id) {
        throw new Error("Share link missing from response.");
      }

      const link = `${window.location.origin}/share/${data.id}`;
      setShareLink(link);
    } catch (err: any) {
      setShareCreateError(err?.message ?? "Failed to create share link");
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareLink) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        const input = document.createElement("input");
        input.value = shareLink;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }

      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2200);
    } catch {
      setShareCreateError("Failed to copy share link.");
    }
  };

  // ===== Render =====
  if (isShareMode) {
    return (
      <div className="page">
        <div className="card">
          <div className="card-header">
            <div>
              <h1>Shared AudioAura</h1>
              <p className="subtitle">Favorite artists and genre stats.</p>
            </div>
            <button
              className="button-ghost"
              onClick={() => (window.location.href = "/")}
            >
              Open AudioAura
            </button>
          </div>

          {(sharePhase === "idle" || sharePhase === "loading") && (
            <p className="muted">Loading shared stats...</p>
          )}

          {sharePhase === "error" && (
            <p className="error-text">
              {shareViewError ?? "Share not available."}
            </p>
          )}

          {sharePhase === "ready" && shareData && (
            <>
              {(shareData.displayName || shareDateLabel) && (
                <div className="share-meta">
                  {shareData.displayName
                    ? `Shared by ${shareData.displayName}`
                    : "Shared stats"}
                  {shareDateLabel ? ` - ${shareDateLabel}` : ""}
                </div>
              )}

              <section className="section">
                <h2>Top Artists</h2>
                {shareData.artists.length === 0 ? (
                  <p className="muted">No artists were shared.</p>
                ) : (
                  <ul className="stat-list">
                    {shareData.artists.map((artist, i) => (
                      <li key={artist.id || `${artist.name}-${i}`}>
                        <div className="artist-row">
                          <span className="rank">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {artist.image && (
                            <img
                              className="artist-avatar"
                              src={artist.image}
                              alt=""
                            />
                          )}
                          <span className="artist-name">{artist.name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="section">
                <h2>Top Genres</h2>
                {shareData.genres.length === 0 ? (
                  <p className="muted">No genres were shared.</p>
                ) : (
                  <div className="genre-grid">
                    {shareData.genres.map((genre) => (
                      <div key={genre.name} className="genre-card">
                        <div className="genre-name">{genre.name}</div>
                        <div className="genre-count">
                          {genre.count} artist
                          {genre.count === 1 ? "" : "s"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    );
  }

  if (status === "loading") return <LoadingScreen progress={12} />;

  if (status !== "logged-in") {
    return <LoginPage status={status} onLogin={login} />;
  }

  if (phase === "fetching") return <LoadingScreen progress={progress} />;

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div>
            <h1>AudioAura</h1>
            <p className="subtitle">Your top vibes, ready to share.</p>
            {profileName && (
              <p className="welcome">Welcome, {profileName}.</p>
            )}
          </div>
          <button className="button-ghost" onClick={logout}>
            Logout
          </button>
        </div>

        {phase === "error" && (
          <p className="error-text" style={{ marginTop: 16 }}>
            {errorMsg ?? "Something went wrong loading your stats."}
          </p>
        )}

        <section className="section">
          <h2>Your Top Songs</h2>
          <ul className="song-list">
            {songs.map((song, i) => (
              <li key={song.id || i} className="song-card">
                <div>
                  <strong>{song.name}</strong> -{" "}
                  {song.artists?.map((a: any) => a.name).join(", ")}
                </div>

                {song.soundnet_analysis && (
                  <div className="analysis-box">
                    BPM: {song.soundnet_analysis.tempo ?? "N/A"} | Key:{" "}
                    {song.soundnet_analysis.key ?? "?"}{" "}
                    {song.soundnet_analysis.scale ?? ""} | Danceability:{" "}
                    {song.soundnet_analysis.danceability ?? "Unknown"}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2>Your Top Artists</h2>
          <ul className="stat-list">
            {artists.map((artist, i) => (
              <li key={artist.id || i}>
                <div className="artist-row">
                  <span className="rank">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {artist.images?.[0]?.url && (
                    <img
                      className="artist-avatar"
                      src={artist.images[0].url}
                      alt=""
                    />
                  )}
                  <span className="artist-name">{artist.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2>Your Top Genres</h2>
          {topGenres.length === 0 ? (
            <p className="muted">No genres found yet.</p>
          ) : (
            <div className="genre-grid">
              {topGenres.map((genre) => (
                <div key={genre.name} className="genre-card">
                  <div className="genre-name">{genre.name}</div>
                  <div className="genre-count">
                    {genre.count} artist{genre.count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="share-panel">
          <div className="share-header">
            <div>
              <h3>Share your stats</h3>
              <p className="muted">
                Create a link to share your top artists and genres.
              </p>
            </div>
            <button
              className="button-secondary button-inline"
              onClick={createShareLink}
              disabled={
                shareBusy || (artists.length === 0 && topGenres.length === 0)
              }
            >
              {shareBusy ? "Creating..." : "Create Share Link"}
            </button>
          </div>

          {shareLink && (
            <div className="share-row">
              <input className="share-input" readOnly value={shareLink} />
              <button className="button-inline" onClick={copyShareLink}>
                {shareCopied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          {shareCreateError && (
            <p className="error-text">{shareCreateError}</p>
          )}
        </section>
      </div>
    </div>
    <ReportAnalysis
      songs={songs}
      artists={artists}
      errorMsg={phase === "error" ? errorMsg : null}
      onLogout={logout}
    />
  );
}

export default App;
