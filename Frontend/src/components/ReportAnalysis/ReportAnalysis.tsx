import { motion } from "motion/react";
import {
  ArrowLeft,
  Download,
  Music,
  Share2,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { AuraMeter } from "./AuraMeter";
import { AuraTypeCard } from "./AuraTypeCard";
import "./ReportAnalysis.css";

type Artist = {
  id?: string;
  name?: string;
  genres?: string[];
  images?: { url?: string }[];
};

type Song = {
  id?: string;
  name?: string;
  artist?: string;
  album?: { images?: { url?: string }[] };
  soundnet_analysis?: {
    tempo?: number;
    key?: string | number;
    danceability?: number;
    energy?: number;
    happiness?: number;
    acousticness?: number;
    popularity?: number;
  };
};

type GenreDatum = {
  name: string;
  percentage: number;
};

type AudioFeatureSummary = {
  energy?: number;
  danceability?: number;
  happiness?: number;
  acousticness?: number;
  tempo?: number;
  popularity?: number;
};

type AudioMetricKey = keyof AudioFeatureSummary;

type AuraType = {
  name: string;
  description: string;
};

type ReportData = {
  topArtist?: {
    name: string;
    image?: string;
  };
  topTrack?: {
    name: string;
    artist?: string;
    image?: string;
  };
  topGenre?: string;
  topArtists: {
    name: string;
    image?: string;
  }[];
  topTracks: {
    name: string;
    artist?: string;
  }[];
  topGenres: GenreDatum[];
  audioFeatures: AudioFeatureSummary;
  auraType?: AuraType;
};

interface ReportAnalysisProps {
  songs: Song[];
  artists: Artist[];
  errorMsg?: string | null;
  onLogout: () => void;
}

const COLORS = ["#a855f7", "#ec4899", "#8b5cf6", "#f472b6", "#9333ea"];

const average = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;

const LOW_THRESHOLD = 35;
const MODERATE_THRESHOLD = 60;
const HIGH_THRESHOLD = 65;
const VERY_HIGH_THRESHOLD = 80;
const HIGH_ACOUSTICNESS_THRESHOLD = 55;
const HIGH_TEMPO_THRESHOLD = 120;
const LOW_POPULARITY_THRESHOLD = 45;

const clampPercent = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const getArtistNames = (song?: Song) => song?.artist;

const buildGenreData = (artists: Artist[]): GenreDatum[] => {
  const genreCounts = new Map<string, number>();

  artists.forEach((artist) => {
    artist.genres?.forEach((genre) => {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    });
  });

  if (!genreCounts.size) return [];

  const total = Array.from(genreCounts.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  return Array.from(genreCounts.entries())
    .map(([name, count]) => ({
      name,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((left, right) => right.percentage - left.percentage)
    .slice(0, 5);
};

const getAverageMetric = (
  audioMetricsFromSongs: Array<Song["soundnet_analysis"]>,
  metric: AudioMetricKey
) => {
  const values = audioMetricsFromSongs
    .map((songAnalysis) => clampPercent(songAnalysis?.[metric]))
    .filter((value): value is number => value !== undefined);

  return values.length ? average(values) : undefined;
};

const getAverageRawMetric = (
  audioMetricsFromSongs: Array<Song["soundnet_analysis"]>,
  metric: "tempo"
) => {
  const values = audioMetricsFromSongs
    .map((songAnalysis) => songAnalysis?.[metric])
    .filter((value): value is number => value !== undefined && !Number.isNaN(value));

  return values.length ? average(values) : undefined;
};

const deriveAuraType = (audioFeatures: AudioFeatureSummary): AuraType | undefined => {
  const {
    happiness,
    energy,
    acousticness,
    tempo,
    popularity,
  } = audioFeatures;

  if (popularity !== undefined && popularity <= LOW_POPULARITY_THRESHOLD) {
    return {
      name: "Midnight Eclipse",
      description:
        "Your listening data shows a high obscurity score. You gravitate toward artists with lower mainstream popularity and niche genres that do not dominate charts. While others follow what is trending, you move toward what is rare, underground, and undiscovered. Your music lives in shadowed tones, deep black fading into dark violet. Your listening patterns create an aura that feels selective and intentional. Not loud. Not obvious. Just rare. Welcome to Midnight Eclipse Aura.",
    };
  }

  if (
    energy !== undefined &&
    tempo !== undefined &&
    energy >= VERY_HIGH_THRESHOLD &&
    tempo >= HIGH_TEMPO_THRESHOLD
  ) {
    return {
      name: "Inferno Pulse",
      description:
        "Your listening data leans toward very high energy and fast tempo. You connect most with music that feels explosive, adrenaline-fueled, and impossible to sit still to. While others settle into mood or melody, you gravitate toward intensity, momentum, and sound that hits hard. Your music burns in red and electric orange. Your listening patterns create an aura that glows bold and untamed. Loud on the surface, unstoppable underneath. Welcome to your Inferno Pulse aura.",
    };
  }

  if (
    happiness !== undefined &&
    energy !== undefined &&
    acousticness !== undefined &&
    happiness >= HIGH_THRESHOLD &&
    energy <= MODERATE_THRESHOLD &&
    acousticness >= HIGH_ACOUSTICNESS_THRESHOLD
  ) {
    return {
      name: "Rose Velvet",
      description:
        "Your listening data leans toward high valence with lower to moderate energy and strong acoustic elements. You connect most with music that feels warm, romantic, and emotionally comforting. While others chase intensity or momentum, you gravitate toward softness, intimacy, and songs that feel personal. Your music moves in rose and soft pink tones. Your listening patterns create an aura that glows gentle and inviting. Tender on the surface, deeply felt underneath. Welcome to your Rose Velvet Aura.",
    };
  }

  if (
    energy !== undefined &&
    acousticness !== undefined &&
    energy <= LOW_THRESHOLD &&
    acousticness >= HIGH_ACOUSTICNESS_THRESHOLD
  ) {
    return {
      name: "Sage Drift",
      description:
        "Your listening data leans toward lower energy with strong acoustic or instrumental elements. You connect most with music that feels calm, organic, and grounding. While others chase intensity or spotlight moments, you gravitate toward simplicity, atmosphere, and sound that feels natural. Your music settles into soft greens and sage tones. Your listening patterns create an aura that glows steady and centered. Quiet on the surface, deeply rooted underneath. Welcome to your Sage Drift Aura.",
    };
  }

  if (
    happiness !== undefined &&
    energy !== undefined &&
    happiness >= HIGH_THRESHOLD &&
    energy >= MODERATE_THRESHOLD
  ) {
    return {
      name: "Solar Bloom",
      description:
        "Your listening data leans toward high valence and medium to high energy. You connect most with music that feels bright, uplifting, and full of momentum. While others drift into moodier soundscapes, you gravitate toward optimism, rhythm, and songs that move you forward. Your music radiates in warm gold and sunlit yellow. Your listening patterns create an aura that glows vibrant and expansive. Bold on the surface, radiant underneath. Welcome to Solar Bloom.",
    };
  }

  if (
    happiness !== undefined &&
    energy !== undefined &&
    happiness <= MODERATE_THRESHOLD &&
    energy <= LOW_THRESHOLD
  ) {
    return {
      name: "Lunar Dreamer",
      description:
        "Your listening data leans toward emotionally rich tones and lower energy. You connect most with music that feels introspective and atmospheric. While others chase high-tempo hype, you gravitate toward mood, depth, and meaning. Your music moves in midnight tones. Your listening patterns create an aura that glows deep indigo and violet. Calm on the surface, luminous underneath. Welcome to your Lunar Dreamer aura.",
    };
  }

  return undefined;
};

const buildReportData = (songs: Song[], artists: Artist[]): ReportData => {
  const topSong = songs[0];
  const topArtist = artists[0];
  const topGenres = buildGenreData(artists);
  const audioMetricsFromSongs = songs
    .map((song) => song.soundnet_analysis)
    .filter(Boolean);

  const audioFeatures = {
    energy: getAverageMetric(audioMetricsFromSongs, "energy"),
    danceability: getAverageMetric(audioMetricsFromSongs, "danceability"),
    happiness: getAverageMetric(audioMetricsFromSongs, "happiness"),
    acousticness: getAverageMetric(audioMetricsFromSongs, "acousticness"),
    tempo: getAverageRawMetric(audioMetricsFromSongs, "tempo"),
    popularity: getAverageMetric(audioMetricsFromSongs, "popularity"),
  };

  return {
    topArtist: topArtist
      ? {
          name: topArtist.name ?? "Unknown Artist",
          image: topArtist.images?.[0]?.url,
        }
      : undefined,
    topTrack: topSong
      ? {
          name: topSong.name ?? "Unknown Track",
          artist: getArtistNames(topSong),
          image: topSong.album?.images?.[0]?.url,
        }
      : undefined,
    topGenre: topGenres[0]?.name,
    topArtists: artists.slice(0, 5).map((artist) => ({
      name: artist.name ?? "Unknown Artist",
      image: artist.images?.[0]?.url,
    })),
    topTracks: songs.slice(0, 5).map((song) => ({
      name: song.name ?? "Unknown Track",
      artist: getArtistNames(song),
    })),
    topGenres,
    audioFeatures,
    auraType: deriveAuraType(audioFeatures),
  };
};

export default function ReportAnalysis({
  songs,
  artists,
  errorMsg,
  onLogout,
}: ReportAnalysisProps) {
  const {
    topArtist,
    topTrack,
    topGenre,
    topArtists,
    topTracks,
    topGenres,
    audioFeatures,
    auraType,
  } = buildReportData(songs, artists);

  const hasAnyData = songs.length > 0 || artists.length > 0;

  return (
    <div className="report-screen">
      <div className="report-screen__backdrop" />

      <header className="report-screen__header">
        <button type="button" className="report-button report-button--ghost">
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="report-screen__header-actions">
          <button type="button" className="report-button report-button--secondary">
            <Share2 size={16} />
            Share
          </button>
          <button
            type="button"
            className="report-button report-button--secondary"
          >
            <Download size={16} />
            Download
          </button>
          <button type="button" className="report-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="report-screen__content">
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="report-screen__hero"
        >
          <p className="report-section-label">Report analysis</p>
          <h1>Your AudioAura</h1>
          <p className="report-screen__hero-copy">
            {hasAnyData
              ? "The data and analysis in this report are derived from your current top tracks, artists, and genres."
              : "Connect Spotify data to generate your report. Until then, this page shows empty states instead of placeholder mock content."}
          </p>
        </motion.section>

        {errorMsg && <p className="report-screen__error">{errorMsg}</p>}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="report-screen__stats-grid"
        >
          <article className="report-stat-card">
            <div className="report-stat-card__label">
              <Music size={18} />
              <span>Top artist</span>
            </div>
            <div className="report-stat-card__artist">
              {topArtist?.image ? (
                <img src={topArtist.image} alt={topArtist.name} />
              ) : (
                <div className="report-stat-card__image-placeholder" aria-hidden="true">
                  ?
                </div>
              )}
              <div>
                <h3>{topArtist?.name ?? "No top artist available yet"}</h3>
              </div>
            </div>
          </article>

          <article className="report-stat-card">
            <div className="report-stat-card__label">
              <TrendingUp size={18} />
              <span>Top track</span>
            </div>
            <h3>{topTrack?.name ?? "No top track available yet"}</h3>
            <p>{topTrack?.artist ?? "Artist data will appear here once available."}</p>
          </article>

          <article className="report-stat-card">
            <div className="report-stat-card__label">
              <Music size={18} />
              <span>Top genre</span>
            </div>
            <h3>{topGenre ?? "No genre data available yet"}</h3>
          </article>
        </motion.section>

        {auraType ? (
          <AuraTypeCard
            name={auraType.name}
            description={auraType.description}
          />
        ) : (
          <section className="report-aura-card report-aura-card--empty">
            <div className="report-aura-content">
              <p className="report-section-label">Your AudioAura Type</p>
              <h2 className="report-aura-title">Analysis not available yet</h2>
              <p className="report-aura-description">
                Your aura type will appear here once the real analysis pipeline
                is connected to this report.
              </p>
            </div>
          </section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="report-panel"
        >
          <div className="report-panel__header">
            <div>
              <p className="report-section-label">Audio profile</p>
              <h2>Your current top-track metrics</h2>
            </div>
          </div>

          <div className="report-meter-grid">
            <AuraMeter
              label="Energy"
              value={audioFeatures.energy}
              color="purple"
              delay={0.35}
            />
            <AuraMeter
              label="Danceability"
              value={audioFeatures.danceability}
              color="blue"
              delay={0.55}
            />
            <AuraMeter
              label="Happiness"
              value={audioFeatures.happiness}
              color="pink"
              delay={0.65}
            />
            <AuraMeter
              label="Acousticness"
              value={audioFeatures.acousticness}
              color="green"
              delay={0.75}
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="report-panel"
        >
          <div className="report-panel__header">
            <div>
              <p className="report-section-label">Genre breakdown</p>
              <h2>Top genre distribution</h2>
            </div>
          </div>

          {topGenres.length ? (
            <div className="report-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGenres}>
                  <XAxis
                    dataKey="name"
                    stroke="#ddcffd"
                    tick={{ fill: "#ddcffd" }}
                  />
                  <YAxis
                    stroke="#ddcffd"
                    tick={{ fill: "#ddcffd" }}
                    allowDecimals={false}
                  />
                  <Bar dataKey="percentage" radius={[10, 10, 0, 0]}>
                    {topGenres.map((entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="report-empty-state">
              Genre data is not available yet for this account.
            </div>
          )}
        </motion.section>

        <div className="report-screen__split">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="report-panel"
          >
            <div className="report-panel__header">
              <div>
                <p className="report-section-label">Top artists</p>
                <h2>Current top 5</h2>
              </div>
            </div>

            <div className="report-artists-grid">
              {topArtists.length ? (
                topArtists.map((artist, index) => (
                  <motion.div
                    key={`${artist.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55 + index * 0.08, duration: 0.45 }}
                    className="report-artist-card"
                  >
                    <div className="report-artist-card__image-wrap">
                      {artist.image ? (
                        <img src={artist.image} alt={artist.name} />
                      ) : (
                        <div
                          className="report-artist-card__image-placeholder"
                          aria-hidden="true"
                        >
                          ?
                        </div>
                      )}
                      <span>{index + 1}</span>
                    </div>
                    <h3>{artist.name}</h3>
                    <p> </p>
                  </motion.div>
                ))
              ) : (
                <div className="report-empty-state">No top artists available yet.</div>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="report-panel"
          >
            <div className="report-panel__header">
              <div>
                <p className="report-section-label">Top tracks</p>
                <h2>Current top 5</h2>
              </div>
            </div>

            <div className="report-tracks-list">
              {topTracks.length ? (
                topTracks.map((track, index) => (
                  <motion.div
                    key={`${track.name}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + index * 0.08, duration: 0.45 }}
                    className="report-track-row"
                  >
                    <div className="report-track-row__rank">{index + 1}</div>
                    <div className="report-track-row__copy">
                      <h3>{track.name}</h3>
                      <p>{track.artist ?? "Artist data not available yet."}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="report-empty-state">No top tracks available yet.</div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
