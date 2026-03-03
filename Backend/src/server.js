import fs from "fs";
import https from "https";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import authRoutes from "./routes/auth.js";
import spotifyRoutes from "./routes/spotify.js"

dotenv.config();

const app = express();
const PORT = 5001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, //
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

// mkcert-generated local certificates for https
const key = fs.readFileSync("./certs/127.0.0.1+1-key.pem");
const cert = fs.readFileSync("./certs/127.0.0.1+1.pem");

https.createServer({ key, cert }, app).listen(PORT, () => {
  console.log(`Backend HTTPS running on https://127.0.0.1:${PORT}`);
});