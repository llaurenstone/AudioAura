import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import LoginPage from "./components/LoginPage/LoginPage";
import ReportAnalysis from "./components/ReportAnalysis/ReportAnalysis";

type Phase = "idle" | "fetching" | "ready" | "error";
type SharePhase = "idle" | "loading" | "ready" | "error";

type ShareImage = {
  url?: string;
};

type ShareArtist = {
  id?: string;
  name?: string;
  image?: string;
  images?: ShareImage[];
  genres?: string[];
};

type ShareGenre = {
  name: string;
  count: number;
};

type ShareSongAnalysis = {
  tempo?: number;
  key?: string | number;
  danceability?: number;
  energy?: number;
  happiness?: number;
  acousticness?: number;
  popularity?: number;
};

type ShareSong = {
  id?: string;
  name?: string;
  artist?: string;
  image?: string;
  album?: {
    images?: ShareImage[];
  };
  soundnet_analysis?: ShareSongAnalysis;
};

type SharePayload = {
  id: string;
  createdAt: string;
  displayName?: string;
  songs?: ShareSong[];
  artists?: ShareArtist[];
  genres?: ShareGenre[];
};

const API_BASE = "";
const LOGIN_URL = `${API_BASE}/auth/spotify/login`;

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

const buildGenreChartData = (
  items: any[],
  limit = 5
): Array<{ name: string; percentage: number }> => {
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

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  if (!total) return [];

  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      percentage: Math.max(1, Math.round((count / total) * 100)),
    }))
    .sort((left, right) => right.percentage - left.percentage)
    .slice(0, limit);
};

const isDefined = <T,>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

const normalizeSharedArtists = (items: ShareArtist[] = []) =>
  items
    .map((artist) => {
      if (typeof artist.name !== "string" || artist.name.trim().length === 0) {
        return null;
      }

      const imageUrl = artist.images?.[0]?.url ?? artist.image;
      const genres = Array.isArray(artist.genres)
        ? artist.genres.filter(
            (genre): genre is string =>
              typeof genre === "string" && genre.trim().length > 0
          )
        : [];

      return {
        id: artist.id,
        name: artist.name,
        genres,
        images: imageUrl ? [{ url: imageUrl }] : undefined,
      };
    })
    .filter(isDefined);

const normalizeSharedSongs = (items: ShareSong[] = []) =>
  items
    .map((song) => {
      if (typeof song.name !== "string" || song.name.trim().length === 0) {
        return null;
      }

      const imageUrl = song.album?.images?.[0]?.url ?? song.image;

      return {
        id: song.id,
        name: song.name,
        artist: song.artist,
        album: imageUrl ? { images: [{ url: imageUrl }] } : undefined,
        soundnet_analysis: song.soundnet_analysis,
      };
    })
    .filter(isDefined);

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
  const genreChartData = useMemo(() => buildGenreChartData(artists), [artists]);
  const sharedArtists = useMemo(
    () => normalizeSharedArtists(shareData?.artists ?? []),
    [shareData]
  );
  const sharedSongs = useMemo(
    () => normalizeSharedSongs(shareData?.songs ?? []),
    [shareData]
  );
  const sharedGenreData = useMemo(() => {
    const genres = shareData?.genres ?? [];
    if (!genres.length) return undefined;

    const total = genres.reduce((sum, genre) => sum + genre.count, 0);
    if (!total) return undefined;

    return genres
      .map((genre) => ({
        name: genre.name,
        percentage: Math.max(1, Math.round((genre.count / total) * 100)),
      }))
      .sort((left, right) => right.percentage - left.percentage)
      .slice(0, 5);
  }, [shareData]);

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

  const sharedHeroTitle = useMemo(() => {
    if (!shareData?.displayName) return "Shared AudioAura";

    return shareData.displayName.endsWith("s")
      ? `${shareData.displayName}' AudioAura`
      : `${shareData.displayName}'s AudioAura`;
  }, [shareData]);

  const sharedHeroCopy = useMemo(() => {
    if (sharePhase === "error") {
      return "This shared report is not available anymore. Open AudioAura to generate a fresh report link.";
    }

    if (shareData?.displayName && shareDateLabel) {
      return `${shareData.displayName} shared this AudioAura report on ${shareDateLabel}. The page uses the same layout as the original report and reflects the stats captured when the link was created.`;
    }

    if (shareData?.displayName) {
      return `${shareData.displayName} shared this AudioAura report. The page uses the same layout as the original report and reflects the stats captured when the link was created.`;
    }

    if (shareDateLabel) {
      return `This shared AudioAura report was captured on ${shareDateLabel} and uses the same layout as the original report page.`;
    }

    return "This shared AudioAura report uses the same layout as the original report page and reflects the stats captured when the link was created.";
  }, [shareData, shareDateLabel, sharePhase]);

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
    window.location.assign(LOGIN_URL);
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
    if (songs.length === 0 && artists.length === 0 && topGenres.length === 0) {
      setShareCreateError("No stats available to share yet.");
      return;
    }

    setShareBusy(true);
    setShareCreateError(null);
    setShareCopied(false);

    try {
      const payload = {
        songs: songs.map((song) => ({
          id: song?.id,
          name: song?.name,
          artist: song?.artist,
          album: song?.album,
          image: song?.image ?? song?.album?.images?.[0]?.url,
          soundnet_analysis: song?.soundnet_analysis,
        })),
        artists: artists.map((artist) => ({
          id: artist?.id,
          name: artist?.name,
          image: artist?.images?.[0]?.url,
          images: artist?.images?.map((image: any) => ({
            url: image?.url,
          })),
          genres: artist?.genres,
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

  const openAudioAuraHome = () => {
    window.location.href = "/";
  };

  // ===== Render =====
  if (isShareMode) {
    if (sharePhase === "idle" || sharePhase === "loading") {
      return <LoadingScreen progress={24} />;
    }

   return (
     <ReportAnalysis
        songs={sharedSongs}
         artists={sharedArtists}
         genreStats={sharedGenreData ?? []}
       genreDataOverride={sharedGenreData}
       errorMsg={sharePhase === "error" ? shareViewError : null}
       onLogout={openAudioAuraHome}
       headerActionLabel="Open AudioAura"
       heroLabel="Shared report"
       heroTitle={sharedHeroTitle}
       heroCopy={sharedHeroCopy}
       showSharePanel={false}
     />
   );
  }

  if (status === "loading") return <LoadingScreen progress={12} />;

  if (status !== "logged-in") {
    return <LoginPage status={status} onLogin={login} loginUrl={LOGIN_URL} />;
  }

  if (phase === "fetching") return <LoadingScreen progress={progress} />;

 return (
   <ReportAnalysis
     songs={songs}
     artists={artists}
     genreStats={genreChartData}
     genreDataOverride={genreChartData}
     errorMsg={phase === "error" ? errorMsg : null}
     onLogout={logout}
     shareBusy={shareBusy}
     shareLink={shareLink}
     shareCreateError={shareCreateError}
     shareCopied={shareCopied}
     onCreateShareLink={createShareLink}
     onCopyShareLink={copyShareLink}
   />
 );
}

export default App;
