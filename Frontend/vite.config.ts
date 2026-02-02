import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

 /**
   Frontend URL HTTPS 127.0.0.1 with port 5173
   Using private key and cert for HTTPS
     */
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    https: {
      key: fs.readFileSync("./certs/127.0.0.1+1-key.pem"),
      cert: fs.readFileSync("./certs/127.0.0.1+1.pem"),
    },
  },
});
