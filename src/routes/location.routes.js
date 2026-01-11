import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

/* ===============================
   FIX __dirname (ESM)
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   LOAD JSON SAFELY
================================ */
const locations = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../tamilnadu_locations.json"),
    "utf-8"
  )
);

/* =================================================
   ✅ GET TAMIL NADU LOCATIONS
   GET /api/locations/tamilnadu
==================================================*/
router.get("/tamilnadu", (req, res) => {
  res.status(200).json({
    success: true,
    locations, // 👈 frontend uses this
  });
});

export default router;
