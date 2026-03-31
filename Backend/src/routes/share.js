import express from "express";
import crypto from "crypto";

const router = express.Router();

const SHARE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const MAX_ARTISTS = 20;
const MAX_GENRES = 20;

const shares = new Map();

const sanitizeText = (value, maxLength = 120) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const sanitizeUrl = (value) => {
  const trimmed = sanitizeText(value, 400);
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
};

const normalizeArtists = (artists) => {
  if (!Array.isArray(artists)) return [];

  return artists
    .slice(0, MAX_ARTISTS)
    .map((artist) => ({
      id: sanitizeText(artist?.id, 120) ?? undefined,
      name: sanitizeText(artist?.name, 120),
      image: sanitizeUrl(artist?.image) ?? undefined,
    }))
    .filter((artist) => Boolean(artist.name));
};

const normalizeGenres = (genres) => {
  if (!Array.isArray(genres)) return [];

  return genres
    .slice(0, MAX_GENRES)
    .map((genre) => {
      if (typeof genre === "string") {
        return { name: sanitizeText(genre, 80), count: 1 };
      }

      const name = sanitizeText(genre?.name, 80);
      const count = Number.isFinite(genre?.count)
        ? Math.max(1, Math.floor(genre.count))
        : 1;
      return { name, count };
    })
    .filter((genre) => Boolean(genre.name));
};

const purgeExpired = () => {
  const now = Date.now();
  for (const [id, share] of shares.entries()) {
    if (share.expiresAt <= now) {
      shares.delete(id);
    }
  }
};

setInterval(purgeExpired, 60 * 60 * 1000).unref?.();

router.post("/", (req, res) => {
  if (!req.session?.accessToken) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const artists = normalizeArtists(req.body?.artists);
  const genres = normalizeGenres(req.body?.genres);

  if (artists.length === 0 && genres.length === 0) {
    return res.status(400).json({ error: "No shareable stats provided" });
  }

  const displayName = sanitizeText(req.body?.displayName, 120) ?? undefined;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = Date.now() + SHARE_TTL_MS;

  shares.set(id, {
    id,
    createdAt,
    expiresAt,
    displayName,
    artists,
    genres,
  });

  res.json({ id, createdAt, expiresAt, displayName });
});

router.get("/:id", (req, res) => {
  purgeExpired();
  const share = shares.get(req.params.id);

  if (!share) {
    return res.status(404).json({ error: "Share not found" });
  }

  res.json({
    id: share.id,
    createdAt: share.createdAt,
    displayName: share.displayName,
    artists: share.artists,
    genres: share.genres,
  });
});

export default router;
