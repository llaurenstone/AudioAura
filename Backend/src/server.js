import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({status: "AudioAura running"});
    console.log("working");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

});