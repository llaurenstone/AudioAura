import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import crypto from "crypto";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "audioaura-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set true in production (HTTPS)
      sameSite: "lax",
    },
  })
);



app.get("/", (req, res) => {
  res.json({ status: "AudioAura running" });
});

// MOCK Spotify login
app.get("/auth/spotify/login", (req, res) => {
  // simulate Spotify redirecting back with an auth code
  const mockCode = crypto.randomBytes(8).toString("hex");
  res.redirect(`http://localhost:5001/auth/spotify/callback?code=${mockCode}&state=mock`);
});

// MOCK Spotify callback (sets session like OAuth would)
app.get("/auth/spotify/callback", (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  // pretend we exchanged the code for tokens + user profile
  req.session.accessToken = "mock_access_token";
  req.session.refreshToken = "mock_refresh_token";
  req.session.tokenExpiresAt = Date.now() + 60 * 60 * 1000;

  req.session.user = {
    id: "mock_user_001",
    display_name: "AudioAura Tester",
    country: "US",
    product: "free",
  };

  res.redirect("http://localhost:5173/report");
});
// check login state
app.get("/auth/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ loggedIn: false });
  res.json({ loggedIn: true, user: req.session.user });
});

// protected report endpoint (mock data)
app.get("/report", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });

  res.json({
    user: req.session.user,
    topArtists: [
      { name: "Bad Bunny" },
      { name: "The Weeknd" },
      { name: "Drake" },
      { name: "Billie Eilish" },
      { name: "Travis Scott" },
    ],
    topTracks: [
      { name: "Track 1", artist: "Artist A" },
      { name: "Track 2", artist: "Artist B" },
      { name: "Track 3", artist: "Artist C" },
    ],
    topGenres: ["reggaeton", "pop", "hip hop", "rap", "dance"],
    aura: {
      type: "Neon Dreamer",
      metrics: { energy: 0.78, valence: 0.62, danceability: 0.71, acousticness: 0.18 },
      summary: [
        "You thrive on high-energy tracks.",
        "Your vibe is upbeat but not chaotic.",
        "You lean danceable more than acoustic.",
      ],
    },
  });
});

// logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});


// start server LAST
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
