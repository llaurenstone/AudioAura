import express from "express";

const router = express.Router();

router.get("/top-tracks", async (req, res) => {
    const token = req.session?.accessToken;
    if (!token) return res.status(401).json({ error: "Not logged in" });
  
    try {
      const resp = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const text = await resp.text(); // read raw response
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Spotify returned non-JSON:", text);
        return res.status(500).json({
          error: "Spotify returned non-JSON response",
          raw: text,
          status: resp.status,
        });
      }
  
      if (!resp.ok) {
        return res.status(resp.status).json(data);
      }
  
      res.json(data);
    } catch (err) {
      console.error("Fetch failed:", err);
      res.status(500).json({ error: "Failed to fetch top tracks", details: err.message });
    }
  });



router.get("/top-artists", async (req, res) => {
    const token = req.session?.accessToken;
    if (!token) return res.status(401).json({ error: "Not logged in" });
  
    try {
      const resp = await fetch("https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const text = await resp.text(); // read raw response
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Spotify returned non-JSON:", text);
        return res.status(500).json({
          error: "Spotify returned non-JSON response",
          raw: text,
          status: resp.status,
        });
      }
  
      if (!resp.ok) {
        return res.status(resp.status).json(data);
      }
  
      res.json(data);
    } catch (err) {
      console.error("Fetch failed:", err);
      res.status(500).json({ error: "Failed to fetch top tracks", details: err.message });
    }
  });



export default router;