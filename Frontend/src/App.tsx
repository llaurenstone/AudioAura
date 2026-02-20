import { useEffect, useRef, useState } from "react";
import "./App.css";
import LoadingScreen from "./LoadingScreen";

type Phase = "idle" | "fetching" | "ready" | "error";

function App() {
  const [status, setStatus] = useState<"loading" | "logged-in" | "logged-out">(
    "loading"
  );


  const [phase, setPhase] = useState<Phase>("idle");

  const [songs, setSongs] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // loading progress shown on loadingscreen
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const setProgressSafe = (updater: number | ((prev: number) => number)) => {
    const next =
      typeof updater === "function" ? updater(progressRef.current) : updater;
    const clamped = Math.max(0, Math.min(100, next));
    progressRef.current = clamped;
    setProgress(clamped);
  };

  //starts progress bar
  const startProgress = () => {
    setProgressSafe(5);

    const id = window.setInterval(() => {
      setProgressSafe((cur) => {
        const cap = 92;
        if (cur >= cap) return cur;

        const step =
          cur < 35 ? 0.85 :
          cur < 65 ? 0.55 :
          cur < 80 ? 0.28 :
          0.14;

        return cur + step;
      });
    }, 60);

    return id;
  };

  const login = () => {
    window.location.href = "https://127.0.0.1:5001/auth/spotify/login";
  };

  const logout = async () => {
    try {
      await fetch("https://127.0.0.1:5001/auth/spotify/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setStatus("logged-out");
      setPhase("idle");
      setSongs([]);
      setArtists([]);
      setErrorMsg(null);
      setProgressSafe(0);
    }
  };


  useEffect(() => {
    const checkStatus = async () => {
      try {
        const r = await fetch("https://127.0.0.1:5001/auth/spotify/status", {
          credentials: "include",
        });
        const j = await r.json();
        setStatus(j.loggedIn ? "logged-in" : "logged-out");
      } catch {
        setStatus("logged-out");
      }
    };

    checkStatus();
  }, []);


  useEffect(() => {
    if (status !== "logged-in") return;

    let cancelled = false;

    const load = async () => {
      let fakeId: number | null = null;

      try {
        setErrorMsg(null);
        setPhase("fetching");
        fakeId = startProgress();

        const [tracksRes, artistsRes] = await Promise.all([
          fetch("https://127.0.0.1:5001/auth/spotify/top-tracks", {
            credentials: "include",
          }),
          fetch("https://127.0.0.1:5001/auth/spotify/top-artists", {
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

        if (cancelled) return;

        setSongs(tracksData.items || tracksData);
        setArtists(artistsData.items || artistsData);

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
  }, [status]);


  if (status === "loading") return <LoadingScreen progress={12} />;
  if (phase === "fetching") return <LoadingScreen progress={progress} />;

  if (status === "logged-out") {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>AudioAura</h1>
          <button onClick={login}>Login with Spotify</button>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>AudioAura</h1>
          <p style={{ color: "crimson" }}>{errorMsg}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={logout}>Logout</button>
            <button
              onClick={() => {

                setPhase("idle");
                setProgressSafe(0);
                setStatus("logged-in");
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }


 return (
   <div className="page">
        <div className="card">

       <h1>AudioAura</h1>
       <button onClick={logout}>Logout</button>

       <h2 style={{ marginTop: 40 }}>Your Top Songs</h2>

       <ul className="song-list">
         {songs.map((song, i) => (
           <li key={song.id || i} className="song-card">
             <div>
               <strong>{song.name}</strong> –{" "}
               {song.artists?.map((a: any) => a.name).join(", ")}
             </div>

             {song.soundnet_analysis && (
               <div className="analysis-box">
                 BPM: {song.soundnet_analysis.tempo ?? "N/A"} |{" "}
                 Key: {song.soundnet_analysis.key ?? "?"}{" "}
                 {song.soundnet_analysis.scale ?? ""} |{" "}
                 Danceability: {song.soundnet_analysis.danceability ?? "Unknown"}
               </div>
             )}
           </li>
         ))}
       </ul>

       <h2 style={{ marginTop: 40 }}>Your Top Artists</h2>

       <ul style={{ listStyle: "none", padding: 0 }}>
         {artists.map((artist, i) => (
           <li key={artist.id || i} style={{ margin: "8px 0" }}>
             <strong>{artist.name}</strong>
           </li>
         ))}
       </ul>

     </div>
   </div>
 );
};

export default App;
