import express from "express";
import crypto from "crypto";
import querystring from "querystring";

const router = express.Router();



// MOCK Spotify login: immediately "redirect back" like Spotify would
router.get("/spotify/login", (req, res) => {
  const clientid = process.env.SPOTIFY_CLIENT_ID;
  const red_url = process.env.SPOTIFY_REDIRECT_URI;

  const state = crypto.randomBytes(8).toString("hex");
  const scope = 'user-read-private user-read-email';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: clientid,
      scope: scope,
      redirect_uri: red_url,
      state: state
    }));
});

// MOCK callback: set session user + tokens
router.get("/spotify/callback", (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

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

// login state here
router.get("/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ loggedIn: false });
  res.json({ loggedIn: true, user: req.session.user });
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

export default router;
