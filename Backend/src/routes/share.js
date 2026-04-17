import express from "express";
import crypto from "crypto";
import { getAccessToken } from "../lib/accessToken.js";

const router = express.Router();

const SHARE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const MAX_ARTISTS = 20;
const MAX_GENRES = 20;
const MAX_SONGS = 20;
const MAX_ARTIST_GENRES = 12;

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

const sanitizeNumber = (value, { min = null, max = null } = {}) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;

  let next = numeric;
  if (min !== null) next = Math.max(min, next);
  if (max !== null) next = Math.min(max, next);
  return next;
};

const normalizeImages = (images, fallbackImage) => {
  const urls = [];

  if (Array.isArray(images)) {
    images.forEach((image) => {
      const url = sanitizeUrl(image?.url);
      if (url) {
        urls.push({ url });
      }
    });
  }

  const fallbackUrl = sanitizeUrl(fallbackImage);
  if (fallbackUrl && !urls.some((image) => image.url === fallbackUrl)) {
    urls.push({ url: fallbackUrl });
  }

  return urls.length ? urls.slice(0, 1) : undefined;
};

const normalizeStringArray = (values, maxItems, maxLength) => {
  if (!Array.isArray(values)) return [];

  return values
    .slice(0, maxItems)
    .map((value) => sanitizeText(value, maxLength))
    .filter(Boolean);
};

const normalizeArtists = (artists) => {
  if (!Array.isArray(artists)) return [];

  return artists
    .slice(0, MAX_ARTISTS)
    .map((artist) => {
      const name = sanitizeText(artist?.name, 120);
      if (!name) return null;

      return {
        id: sanitizeText(artist?.id, 120) ?? undefined,
        name,
        genres: normalizeStringArray(
          artist?.genres,
          MAX_ARTIST_GENRES,
          80
        ),
        images: normalizeImages(artist?.images, artist?.image),
      };
    })
    .filter(Boolean);
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

const buildGenresFromArtists = (artists) => {
  const counts = new Map();

  artists.forEach((artist) => {
    artist.genres?.forEach((genre) => {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name)
    )
    .slice(0, MAX_GENRES);
};

const normalizeSongs = (songs) => {
  if (!Array.isArray(songs)) return [];

  return songs
    .slice(0, MAX_SONGS)
    .map((song) => {
      const name = sanitizeText(song?.name, 160);
      if (!name) return null;
      const images = normalizeImages(song?.album?.images, song?.image);

      const soundnetAnalysis = {
        tempo: sanitizeNumber(song?.soundnet_analysis?.tempo, { min: 0 }),
        danceability: sanitizeNumber(song?.soundnet_analysis?.danceability, {
          min: 0,
          max: 100,
        }),
        energy: sanitizeNumber(song?.soundnet_analysis?.energy, {
          min: 0,
          max: 100,
        }),
        happiness: sanitizeNumber(song?.soundnet_analysis?.happiness, {
          min: 0,
          max: 100,
        }),
        acousticness: sanitizeNumber(song?.soundnet_analysis?.acousticness, {
          min: 0,
          max: 100,
        }),
        popularity: sanitizeNumber(song?.soundnet_analysis?.popularity, {
          min: 0,
          max: 100,
        }),
      };

      const hasAnalysis = Object.values(soundnetAnalysis).some(
        (value) => value !== undefined
      );

      return {
        id: sanitizeText(song?.id, 120) ?? undefined,
        name,
        artist: sanitizeText(song?.artist, 160) ?? undefined,
        album: images ? { images } : undefined,
        soundnet_analysis: hasAnalysis ? soundnetAnalysis : undefined,
      };
    })
    .filter(Boolean);
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
  if (!getAccessToken(req)) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const songs = normalizeSongs(req.body?.songs);
  const artists = normalizeArtists(req.body?.artists);
  const genres = normalizeGenres(req.body?.genres);
  const derivedGenres = genres.length ? genres : buildGenresFromArtists(artists);

  if (songs.length === 0 && artists.length === 0 && derivedGenres.length === 0) {
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
    songs,
    artists,
    genres: derivedGenres,
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
    songs: share.songs,
    artists: share.artists,
    genres: share.genres,
  });
});

export default router;
