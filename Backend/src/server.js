import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import crypto from "crypto";


dotenv.config();

const app = express();
//Mock port
const PORT = 5001;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: "audioaura-secret", //Mock Cookies ID
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

// MOCK Spotify callback
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
