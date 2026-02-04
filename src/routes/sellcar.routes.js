// ======================= routes/sellcar.routes.js =======================
import express from "express";
import mongoose from "mongoose";
import SellCar from "../models/sellcar_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import uploadSellcar from "../middleware/uploadSellcar.js";
import {
  uploadSellcarImage,
  deleteSellcarImage,
} from "../utils/sellcarUpload.js";

const router = express.Router();

/* USER ADD SELL CAR */
router.post(
  "/add",
  verifyToken,
  uploadSellcar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      if (!req.files?.banner)
        return res.status(400).json({ success: false });

      const bannerImage = await uploadSellcarImage(
        req.files.banner[0],
        "sellcars/banner"
      );

      const galleryImages = req.files.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadSellcarImage(img, "sellcars/gallery")
            )
          )
        : [];

      const sellCar = await SellCar.create({
        ...req.body,
        user: req.userId,
        userId: req.userId,
        bannerImage,
        galleryImages,
      });

      res.status(201).json({ success: true, sellCar });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  }
);

/* USER MY SELL CARS */
router.get("/my", verifyToken, async (req, res) => {
  const cars = await SellCar.find({ user: req.userId }).sort({
    createdAt: -1,
  });
  res.json({ success: true, cars });
});

/* ADMIN GET ALL */
router.get("/", verifyToken, isAdmin, async (req, res) => {
  const cars = await SellCar.find().sort({ createdAt: -1 });
  res.json({ success: true, cars });
});

/* ADMIN APPROVE / REJECT  (NO Car.create HERE) */
router.put("/:id/status", verifyToken, isAdmin, async (req, res) => {
  const { status, adminNote } = req.body;

  if (!["approved", "rejected"].includes(status))
    return res.status(400).json({ success: false });

  const sellCar = await SellCar.findById(req.params.id);
  if (!sellCar) return res.status(404).json({ success: false });

  if (sellCar.status === "approved")
    return res.status(400).json({ success: false });

  // ❌ NO Car.create here
  sellCar.status = status;
  sellCar.adminNote = adminNote;

  await sellCar.save();

  res.json({ success: true });
});

/* DELETE SELL CAR */
router.delete("/:id", verifyToken, async (req, res) => {
  const sellCar = await SellCar.findById(req.params.id);
  if (!sellCar) return res.status(404).json({ success: false });

  await deleteSellcarImage(sellCar.bannerImage);
  for (const img of sellCar.galleryImages) {
    await deleteSellcarImage(img);
  }

  await sellCar.deleteOne();
  res.json({ success: true });
});

export default router;
