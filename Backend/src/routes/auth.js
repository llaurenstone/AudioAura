import express from "express";
import crypto from "crypto";

const router = express.Router();

// MOCK Spotify login: immediately "redirect back" like Spotify would
router.get("/spotify/login", (req, res) => {
  const mockCode = crypto.randomBytes(8).toString("hex");
  res.redirect(
    `http://localhost:5001/auth/spotify/callback?code=${mockCode}&state=mock`
  );
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
