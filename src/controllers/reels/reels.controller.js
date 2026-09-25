// ======================= src/controllers/reels/reels.controller.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import { randomUUID } from "crypto";
import { z } from "zod";

import Reel from "../../models/reels/reels_model.js";

import Car from "../../models/car/car_model.js";
import Bike from "../../models/bike/bike_model.js";
import Property from "../../models/property/property_model.js";
import Electronics from "../../models/electronics/electronics_model.js";

import {
  getSignedUploadUrl,
  publicUrl,
  deleteReelFile,
} from "../../utils/reels/sendReels.js";

import { enqueueReelProcessing } from "../../workers/reels/reels_worker.js";
// ============================================================
// LISTING MODEL MAP
// ============================================================

const listingModelMap = {
  cars: { model: Car, idField: "carId" },
  bikes: { model: Bike, idField: "bikeId" },
  property: { model: Property, idField: "propertyId" },
  electronics: { model: Electronics, idField: "electronicsId" },
};

// ============================================================
// VERIFY LISTING EXISTS
// ============================================================

const verifyListing = async (category, listingId) => {
  const entry = listingModelMap[category];
  if (!entry) return null;

  const listing = await entry.model
    .findOne({ [entry.idField]: listingId })
    .select(`${entry.idField} createdBy sellerUser status`)
    .lean();

  return listing || null;
};

// ============================================================
// INIT UPLOAD SCHEMA
// ============================================================

const initSchema = z.object({
  category: z.enum(["cars", "bikes", "property", "electronics"]),
  contentType: z.string().regex(/^video\//),
  sizeBytes: z.number().max(200 * 1024 * 1024),
  listingId: z.number().int().positive(),
});

// ============================================================
// INIT UPLOAD
// ============================================================

export const initUpload = async (req, res) => {
  try {
    const body = initSchema.parse(req.body);

    // ----------------------------------------------------------
    // VERIFY LISTING
    // ----------------------------------------------------------

    const listing = await verifyListing(body.category, body.listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found for this category",
      });
    }

    // ----------------------------------------------------------
    // GENERATE UUID + RAW KEY
    // ----------------------------------------------------------

    const reelUuid = randomUUID();
    const rawKey = `raw/${reelUuid}.mp4`;

    // ----------------------------------------------------------
    // SIGNED UPLOAD URL
    // ----------------------------------------------------------

    const uploadUrl = await getSignedUploadUrl(rawKey, body.contentType);

    // ----------------------------------------------------------
    // CREATE REEL DOCUMENT
    // ----------------------------------------------------------

    await Reel.create({
      reelUuid,
      createdBy: req.userId,
      sellerUser: listing.sellerUser || null,
      category: body.category,
      listingId: body.listingId,
      rawKey,
      status: "processing",
    });

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      reelUuid,
      uploadUrl,
      rawKey,
    });
  } catch (err) {
    console.error("INIT REEL UPLOAD ERROR 👉", err);

    return res.status(400).json({
      success: false,
      message: err.message || "Failed to init upload",
    });
  }
};

// ============================================================
// COMPLETE UPLOAD
// ============================================================

export const completeUpload = async (req, res) => {
  try {
    const { reelUuid } = req.body;

    const reel = await Reel.findOne({
      reelUuid,
      createdBy: req.userId,
    });

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    await enqueueReelProcessing({
      reelUuid,
      rawKey: reel.rawKey,
    });

    return res.status(200).json({
      success: true,
      message: "Reel processing started",
      status: "processing",
    });
  } catch (err) {
    console.error("COMPLETE REEL UPLOAD ERROR 👉", err);

    return res.status(400).json({
      success: false,
      message: err.message || "Failed to complete upload",
    });
  }
};

// ============================================================
// GET FEED
// ============================================================

export const getFeed = async (req, res) => {
  try {
    const { category, cursor } = req.query;
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "category is required",
      });
    }

    // ----------------------------------------------------------
    // CURSOR FILTER
    // ----------------------------------------------------------

    let cursorFilter = {};

    if (cursor) {
      const raw = JSON.parse(
        Buffer.from(cursor, "base64url").toString()
      );

      cursorFilter = {
        $or: [
          { createdAt: { $lt: new Date(raw.createdAt) } },
          {
            createdAt: new Date(raw.createdAt),
            _id: { $lt: raw.id },
          },
        ],
      };
    }

    // ----------------------------------------------------------
    // FETCH REELS
    // ----------------------------------------------------------

    const reels = await Reel.find({
      category,
      status: "ready",
      ...cursorFilter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = reels.length > limit;
    const items = hasMore ? reels.slice(0, limit) : reels;

    const last = items[items.length - 1];

    const nextCursor =
      hasMore && last
        ? Buffer.from(
            JSON.stringify({
              createdAt: last.createdAt,
              id: last._id,
            })
          ).toString("base64url")
        : null;

    // ----------------------------------------------------------
    // FLUTTER COMPAT MAPPING
    // ----------------------------------------------------------

    const data = items.map((reel) => ({
      reelUuid: reel.reelUuid,
      category: reel.category,
      listingId: reel.listingId,
      videoUrl1080: reel.videoUrl1080,
      videoUrl720: reel.videoUrl720,
      thumbnailUrl: reel.thumbnailUrl,
      duration: reel.duration,
      shares: reel.shares,
    }));

    return res.status(200).json({
      success: true,
      reels: data,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error("GET REEL FEED ERROR 👉", err);

    return res.status(400).json({
      success: false,
      message: err.message || "Failed to get feed",
    });
  }
};

// ============================================================
// SHARE REEL
// ============================================================

export const shareReel = async (req, res) => {
  try {
    const { reelUuid } = req.params;

    const reel = await Reel.findOneAndUpdate(
      { reelUuid },
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    return res.status(200).json({
      success: true,
      shares: reel.shares,
    });
  } catch (err) {
    console.error("SHARE REEL ERROR 👉", err);

    return res.status(400).json({
      success: false,
      message: err.message || "Failed to share reel",
    });
  }
};

// ============================================================
// DELETE REEL (OWNER ONLY)
// ============================================================

export const deleteReel = async (req, res) => {
  try {
    const { reelUuid } = req.params;

    const reel = await Reel.findOne({
      reelUuid,
      createdBy: req.userId,
    });

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found or not owner",
      });
    }

    // ----------------------------------------------------------
    // DELETE R2 OBJECTS
    // ----------------------------------------------------------

    await deleteReelFile(reel.rawKey);
    await deleteReelFile(reel.videoKey1080);
    await deleteReelFile(reel.videoKey720);
    await deleteReelFile(reel.thumbnailKey);

    // ----------------------------------------------------------
    // DELETE DB DOCUMENT
    // ----------------------------------------------------------

    await reel.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Reel deleted",
    });
  } catch (err) {
    console.error("DELETE REEL ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete reel",
    });
  }
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  initUpload,
  completeUpload,
  getFeed,
  shareReel,
  deleteReel,
};