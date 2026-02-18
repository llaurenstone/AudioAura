import { useEffect, useState, useRef } from "react";
import "./App.css";

type View = "songs" | "artists" | null;

function App() {
  const [status, setStatus] = useState<"loading" | "logged-in" | "logged-out">(
    "loading"
  );
  const [activeView, setActiveView] = useState<View>(null);

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

 
 const TopSongs = () => {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  
  const hasFetched = useRef(false);

  useEffect(() => {

    if (hasFetched.current) return;
    
   
    hasFetched.current = true;

    fetch("https://127.0.0.1:5001/get/top-tracks", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setSongs(data.items || data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching songs:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading top songs & analysis (this may take ~10-20 seconds)...</p>;

  return (
    <div className="protected">
      <h2>Your Top Songs</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {songs.map((song, i) => (
          <li 
            key={song.id || i} 
            style={{ 
              marginBottom: "15px", 
              padding: "10px", 
              border: "1px solid #ccc", 
              borderRadius: "8px" 
            }}
          >
            <div style={{ fontSize: "1.1rem" }}>
              <strong>{song.name}</strong> –{" "}
              {song.artists?.map((a: any) => a.name).join(", ")}
            </div>

            {song.soundnet_analysis ? (
              <div style={{ 
                marginTop: "8px", 
                fontSize: "0.9rem", 
                color: "#555", 
                display: "flex", 
                gap: "15px",
                backgroundColor: "#f0f0f0",
                padding: "5px 10px",
                borderRadius: "5px"
              }}>
                <span><strong>BPM:</strong> {song.soundnet_analysis.tempo || "N/A"}</span>
                <span><strong>Key:</strong> {song.soundnet_analysis.key || "?"} {song.soundnet_analysis.scale || ""}</span>
                <span><strong>Danceability:</strong> {song.soundnet_analysis.danceability || "Unknown"}</span>
              </div>
            ) : (
              <div style={{ fontSize: "0.8rem", color: "#999", marginTop: "5px" }}>
                Analysis unavailable (API Limit Reached or Song Not Found)
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};


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
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setActiveView("songs")}>
                Get Top Songs
              </button>
              <button onClick={() => setActiveView("artists")}>
                Get Top Artists
              </button>
            </div>

            {activeView === "songs" && <TopSongs />}
            {activeView === "artists" && <TopArtists />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
