import express from "express";
import "dotenv/config";

const router = express.Router();
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const apikey = requireEnv("TRACK_ANALYSIS_API");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.get("/top-tracks", async (req, res) => {
    const token = req.session?.accessToken;
    if (!token) return res.status(401).json({ error: "Not logged in" });
  
    try {
      const resp = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await resp.text();
      let data; 

      try {data = JSON.parse(text);} 

      catch { return res.status(500).json({error: "Bad Spotify Response"});}

      if (!resp.ok) return res.status(resp.status).json(data);
  
      if (data.items && Array.isArray(data.items)) {
        const analyzedItems = [];

        for (const item of data.items) {
          try {
            const analysisResp = await fetch(`https://track-analysis.p.rapidapi.com/pktx/spotify/${item.id}`, {
                method: "GET",
                headers: {
                    "x-rapidapi-key": apikey, 
                    "x-rapidapi-host": "track-analysis.p.rapidapi.com"
                }
            });

            const analysisData = analysisResp.ok ? await analysisResp.json() : null;
            
            analyzedItems.push({
                ...item,
                soundnet_analysis: analysisData
            });
            await delay(1100); 

          } catch (innerErr) {
            console.error(`Failed: ${item.name}`);
            analyzedItems.push(item);
          }
        }

        data.items = analyzedItems;
      }
  
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
});

router.get("/top-artists", async (req, res) => {
    const token = req.session?.accessToken;
    if (!token) return res.status(401).json({ error: "Not logged in" });
  
    try {
      const resp = await fetch("https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      const text = await resp.text(); 
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