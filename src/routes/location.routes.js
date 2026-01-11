import express from "express";
import locations from "../tamilnadu_locations.json" assert { type: "json" };

const router = express.Router();

/* =================================================
   ✅ GET TAMIL NADU LOCATIONS
   GET /api/locations/tamilnadu
==================================================*/
router.get("/tamilnadu", (req, res) => {
  res.status(200).json({
    success: true,
    districts: Object.keys(locations),
    locations,
  });
});

export default router;
