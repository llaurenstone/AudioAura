import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState<"loading" | "logged-in" | "logged-out">(
    "loading"
  );

//Login for user's spotify
  const login = () => {
    window.location.href =
      "https://127.0.0.1:5001/auth/spotify/login";
  };
    const logout = async () => {
      await fetch("https://127.0.0.1:5001/auth/spotify/logout", {
        method: "POST",
        credentials: "include",
      });

      setStatus("logged-out");
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

// Simple UI to test auth
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
            <p className="success"> Logged in with Spotify</p>
            <button onClick={logout}>Logout</button>
          </>
        )}

      </div>
    </div>
  );
}

export default App;
