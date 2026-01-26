import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import session from "express-session";
import crypto from "crypto";
import authRoutes from "./routes/auth.js";



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
    secret: "audioaura-secret", // Mock Cookies ID
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

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
