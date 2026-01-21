// ======================= src/routes/sellproperty.routes.js =======================

import express from "express";
import mongoose from "mongoose";
import SellProperty from "../models/sellproperty_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import uploadSellproperty from "../middleware/uploadSellproperty.js";
import {
  uploadSellpropertyImage,
  deleteSellpropertyImage,
} from "../utils/sellpropertyUpload.js";

const router = express.Router();

/* ======================
   ADD SELL PROPERTY (USER)
====================== */
router.post(
  "/add",
  verifyToken,
  uploadSellproperty.single("image"),
  async (req, res) => {
    try {
      const image = await uploadSellpropertyImage(req.file);

      const sellProperty = await SellProperty.create({
        ...req.body,
        user: req.userId,
        userId: req.userId,
        image,
      });

      return res.status(201).json({
        success: true,
        sellProperty,
      });
    } catch (err) {
      console.error("ADD SELL PROPERTY ERROR:", err);
      return res.status(500).json({ success: false });
    }
  }
);

/* ======================
   GET MY SELL PROPERTIES
====================== */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const properties = await SellProperty.find({
      user: req.userId,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      properties,
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

/* ======================
   ADMIN – GET ALL
====================== */
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const properties = await SellProperty.find().sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      properties,
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

/* ======================
   UPDATE SELL PROPERTY
====================== */
router.put(
  "/:id",
  verifyToken,
  uploadSellproperty.single("image"),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false });
      }

      const property = await SellProperty.findById(req.params.id);
      if (!property) {
        return res.status(404).json({ success: false });
      }

      if (req.file) {
        await deleteSellpropertyImage(property.image);
        property.image = await uploadSellpropertyImage(req.file);
      }

      Object.assign(property, req.body);
      await property.save();

      return res.json({
        success: true,
        property,
      });
    } catch (err) {
      console.error("UPDATE SELL PROPERTY ERROR:", err);
      return res.status(500).json({ success: false });
    }
  }
);
/* ======================
   ADMIN – UPDATE STATUS
====================== */
router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const property = await SellProperty.findById(req.params.id);

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      property.status = status;
      await property.save();

      return res.json({
        success: true,
        property,
      });
    } catch (err) {
      console.error("ADMIN STATUS UPDATE ERROR:", err);
      return res.status(500).json({ success: false });
    }
  }
);


/* ======================
   DELETE SELL PROPERTY
====================== */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const property = await SellProperty.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false });
    }

    await deleteSellpropertyImage(property.image);
    await property.deleteOne();

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

export default router;
