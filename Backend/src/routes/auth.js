import express from "express";
import crypto from "crypto";

const router = express.Router();

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";
const SCOPES = "user-read-email user-read-private user-top-read";

// base64url encoding required by spotify PKCE
function base64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

//Code verifier is random string
function generateVerifier() {
  return base64url(crypto.randomBytes(64));
}

//Code Challenge
function generateChallenge(verifier) {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

//LOGIN page
router.get("/spotify/login", (req, res) => {
  const client_id = requireEnv("SPOTIFY_CLIENT_ID");
  const redirect_uri = requireEnv("SPOTIFY_REDIRECT_URI");

  const state = base64url(crypto.randomBytes(16));
  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);

  req.session.state = state;
  req.session.verifier = verifier;

//Spotify /authorize
  const params = new URLSearchParams({
    response_type: "code",
    client_id,
    redirect_uri,
    scope: SCOPES,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  res.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
});

// Callback exchanges code for token, store in session, redirect to frontend
router.get("/spotify/callback", async (req, res) => {
  const client_id = requireEnv("SPOTIFY_CLIENT_ID");
  const redirect_uri = requireEnv("SPOTIFY_REDIRECT_URI");
  const frontend = requireEnv("FRONTEND_URL");

  const { code, state, error, error_description } = req.query;

  if (error) {
    return res
      .status(400)
      .send(`Spotify OAuth error: ${error} ${error_description ?? ""}`);
  }

  if (!state || state !== req.session.state) {
    return res.status(400).send("Invalid state. Possible CSRF or session loss.");
  }

  if (!code) {
    return res.status(400).send("Missing code in callback.");
  }

  if (!req.session.verifier) {
    return res
      .status(400)
      .send("Missing PKCE verifier in session. Session cookie not persisting.");
  }

//Exchange code to access token
  const tokenBody = new URLSearchParams({
    client_id,
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri,
    code_verifier: req.session.verifier,
  });

  const tokenResp = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });

  const tokens = await tokenResp.json();

  if (!tokenResp.ok) {
    return res.status(tokenResp.status).json(tokens);
  }

  req.session.accessToken = tokens.access_token;

  // one time code refresher
  delete req.session.state;
  delete req.session.verifier;

  res.redirect(`${frontend}/`);
});

// Frontend checks if logged in
router.get("/spotify/status", (req, res) => {
  res.json({ loggedIn: Boolean(req.session?.accessToken) });
});

//Gets current user profile using token in session
router.get("/spotify/me", async (req, res) => {
  if (!req.session?.accessToken) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const resp = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${req.session.accessToken}`,
    },
  });

  const text = await resp.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Spotify returned non-JSON:");
    console.error(text);
    return res.status(500).json({
      error: "Spotify returned non-JSON response",
      raw: text,
      status: resp.status,
    });
  }

  return res.status(resp.ok ? 200 : resp.status).json(data);
});

router.post("/spotify/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Failed to logout" });
    }

    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});


router.get("/debug/session", (req, res) => {
  res.json({
    hasSession: Boolean(req.session),
    sessionID: req.sessionID,
    keys: req.session ? Object.keys(req.session) : [],
    hasToken: Boolean(req.session?.accessToken),
  });
});

export default router;
