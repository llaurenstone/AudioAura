import fs from "fs";
import https from "https";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import authRoutes from "./routes/auth.js";
import spotifyRoutes from "./routes/spotify.js"
import shareRoutes from "./routes/share.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

app.use(
  cors({
    origin: "https://audio-aura-ten.vercel.app",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    },
  })
);

app.get("/", (req, res) => res.json({ status: "AudioAura running" }));
app.use("/auth", authRoutes);
app.use("/get", spotifyRoutes);
app.use("/auth/spotify", spotifyRoutes);
app.use("/share", shareRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});