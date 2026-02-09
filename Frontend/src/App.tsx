import { useEffect, useState } from "react";
import "./App.css";

type View = "songs" | "artists" | null;

function App() {
  const [status, setStatus] = useState<"loading" | "logged-in" | "logged-out">(
    "loading"
  );
  const [activeView, setActiveView] = useState<View>(null);

  // Login for user's spotify
  const login = () => {
    window.location.href = "https://127.0.0.1:5001/auth/spotify/login";
  };

  const logout = async () => {
    await fetch("https://127.0.0.1:5001/auth/spotify/logout", {
      method: "POST",
      credentials: "include",
    });
    setStatus("logged-out");
    setActiveView(null);
  };

  // Check Status of User login
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const r = await fetch(
          "https://127.0.0.1:5001/auth/spotify/status",
          { credentials: "include" }
        );
        const j = await r.json();
        setStatus(j.loggedIn ? "logged-in" : "logged-out");
      } catch {
        setStatus("logged-out");
      }
    };

    checkStatus();
  }, []);

  // 🔒 Top Songs
  const TopSongs = () => {
    const [songs, setSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch("https://127.0.0.1:5001/get/top-tracks", {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          setSongs(data.items || data);
          setLoading(false);
        });
    }, []);

    if (loading) return <p>Loading top songs...</p>;

    return (
      <div className="protected">
        <h2>Your Top Songs</h2>
        <ul>
          {songs.map((song, i) => (
            <li key={song.id || i}>
              <strong>{song.name}</strong> –{" "}
              {song.artists?.map((a: any) => a.name).join(", ")}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // 🔒 Top Artists
  const TopArtists = () => {
    const [artists, setArtists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch("https://127.0.0.1:5001/get/top-artists", {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          setArtists(data.items || data);
          setLoading(false);
        });
    }, []);

    if (loading) return <p>Loading top artists...</p>;

    return (
      <div className="protected">
        <h2>Your Top Artists</h2>
        <ul>
          {artists.map((artist, i) => (
            <li key={artist.id || i}>
              <strong>{artist.name}</strong>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="card">
        <h1>AudioAura</h1>

        {status === "loading" && <p>Checking login...</p>}

        {status === "logged-out" && (
          <button onClick={login}>Login with Spotify</button>
        )}

        {status === "logged-in" && (
          <>
            <button onClick={logout}>Logout</button>

            {/* Buttons side by side */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setActiveView("songs")}>
                Get Top Songs
              </button>
              <button onClick={() => setActiveView("artists")}>
                Get Top Artists
              </button>
            </div>

            {/* Only ONE renders at a time */}
            {activeView === "songs" && <TopSongs />}
            {activeView === "artists" && <TopArtists />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
