import express from "express";
import crypto from "crypto";

const router = express.Router();

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";
const SCOPES = "user-read-email user-read-private user-top-read";
const AUTH_STATE_TTL_MS = 1000 * 60 * 10;
const pendingAuth = new Map();

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

function storePendingAuth(state, verifier) {
  pendingAuth.set(state, {
    verifier,
    expiresAt: Date.now() + AUTH_STATE_TTL_MS,
  });
}

function consumePendingAuth(state) {
  const entry = pendingAuth.get(state);
  if (!entry) return null;

  pendingAuth.delete(state);

  if (entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.verifier;
}

function purgeExpiredPendingAuth() {
  const now = Date.now();

  for (const [state, entry] of pendingAuth.entries()) {
    if (entry.expiresAt <= now) {
      pendingAuth.delete(state);
    }
  }
}

setInterval(purgeExpiredPendingAuth, 60 * 1000).unref?.();

//LOGIN page
router.get("/spotify/login", (req, res) => {
  const client_id = requireEnv("SPOTIFY_CLIENT_ID");
  const redirect_uri = requireEnv("SPOTIFY_REDIRECT_URI");

  const state = base64url(crypto.randomBytes(16));
  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);
  storePendingAuth(state, verifier);

  console.log("[auth.login]", {
    sessionID: req.sessionID,
    redirectUri: redirect_uri,
    statePreview: state.slice(0, 8),
  });

//Spotify /authorize
  const params = new URLSearchParams({
    response_type: "code",
    client_id,
    redirect_uri,
    scope: SCOPES,
    state,
    show_dialog: "true",
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

  console.log("[auth.callback.hit]", {
    sessionID: req.sessionID,
    hasCode: Boolean(code),
    hasState: typeof state === "string",
    error: error ?? null,
  });

  if (!code && !state && !error) {
    console.log("[auth.callback.empty]", {
      sessionID: req.sessionID,
    });
    return res.redirect("/auth/spotify/login");
  }

  if (error) {
    console.log("[auth.callback.spotifyError]", {
      sessionID: req.sessionID,
      error,
      errorDescription: error_description ?? null,
    });
    return res
      .status(400)
      .send(`Spotify OAuth error: ${error} ${error_description ?? ""}`);
  }

  if (typeof state !== "string") {
    console.log("[auth.callback.invalidStateType]", {
      sessionID: req.sessionID,
      receivedStateType: typeof state,
    });
    return res.status(400).send("Invalid state. Possible CSRF or session loss.");
  }

  if (!code) {
    console.log("[auth.callback.missingCode]", {
      sessionID: req.sessionID,
      statePreview: state.slice(0, 8),
    });
    return res.status(400).send("Missing code in callback.");
  }

  const verifier = consumePendingAuth(state);

  if (!verifier) {
    console.log("[auth.callback.verifierMissing]", {
      sessionID: req.sessionID,
      statePreview: state.slice(0, 8),
    });
    return res
      .status(400)
      .send("Invalid state. Possible CSRF or expired login session.");
  }

//Exchange code to access token
  const tokenBody = new URLSearchParams({
    client_id,
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri,
    code_verifier: verifier,
  });

  const tokenResp = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });

  const tokens = await tokenResp.json();

  if (!tokenResp.ok) {
    console.log("[auth.callback.tokenExchangeFailed]", {
      sessionID: req.sessionID,
      status: tokenResp.status,
      body: tokens,
    });
    return res.status(tokenResp.status).json(tokens);
  }

  console.log("[auth.callback.tokenExchangeSucceeded]", {
    sessionID: req.sessionID,
    status: tokenResp.status,
    hasAccessToken: Boolean(tokens.access_token),
  });

  req.session.accessToken = tokens.access_token;

  req.session.save((err) => {
    if (err) {
      console.error("Failed to persist callback session:", err);
      return res.status(500).send("Failed to persist Spotify session after callback.");
    }

    console.log("[auth.callback.sessionSaved]", {
      sessionID: req.sessionID,
      hasSessionAccessToken: Boolean(req.session?.accessToken),
      redirectTarget: `${frontend}/`,
    });

    res.redirect(`${frontend}/`);
  });
});

// Frontend checks if logged in
router.get("/spotify/status", (req, res) => {
  const loggedIn = Boolean(req.session?.accessToken);

  console.log("[auth.status]", {
    sessionID: req.sessionID,
    loggedIn,
    hasSessionAccessToken: Boolean(req.session?.accessToken),
    hasCookie: Boolean(req.get("cookie")),
    origin: req.get("origin") ?? null,
    userAgent: req.get("user-agent") ?? null,
  });

  res.json({ loggedIn });
});

//Gets current user profile using token in session
router.get("/spotify/me", async (req, res) => {
  console.log("[auth.me]", {
    sessionID: req.sessionID,
    hasSessionAccessToken: Boolean(req.session?.accessToken),
    hasCookie: Boolean(req.get("cookie")),
  });

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
  console.log("[auth.logout]", {
    sessionID: req.sessionID,
    hasSessionAccessToken: Boolean(req.session?.accessToken),
  });

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
  console.log("[auth.debug.session]", {
    sessionID: req.sessionID,
    hasSession: Boolean(req.session),
    hasToken: Boolean(req.session?.accessToken),
    hasCookie: Boolean(req.get("cookie")),
  });

  res.json({
    hasSession: Boolean(req.session),
    sessionID: req.sessionID,
    keys: req.session ? Object.keys(req.session) : [],
    hasToken: Boolean(req.session?.accessToken),
  });
});

export default router;
