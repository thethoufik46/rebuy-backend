import mongoose from "mongoose";
import fs from "fs";
import path from "path";

/* =====================================================
   LOAD TAMIL NADU DISTRICTS JSON
===================================================== */
const locationsPath = path.join(
  process.cwd(),
  "src/tamilnadu_locations.json"
);

const locations = JSON.parse(
  fs.readFileSync(locationsPath, "utf-8")
);

/* =====================================================
   LEAD SCHEMA
===================================================== */
const leadSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      set: (v) => v?.toString().replace(/\s+/g, ""),
    },

    /* 📍 DISTRICT */
    district: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      default: "NA",
    },

    type: {
      type: String,
      enum: ["car", "bike", "other"],
      required: true,
    },

    payment: {
      type: String,
      enum: ["cash", "finance"],
      required: true,
    },

    buyer: {
      type: String,
      enum: ["customer", "mediator", "dealer"],
      required: true,
    },

    board: {
      type: String,
      enum: ["tboard", "own"],
      required: true,
    },

    transmission: {
      type: String,
      enum: ["MT", "AMT"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "sent",
        "meet",
        "finance",
        "delivered",
        "another",
      ],
      default: "pending",
    },

    review: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    /* 🎤 AUDIO NOTE */
    audioNote: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* =====================================================
   DISTRICT VALIDATION
===================================================== */
leadSchema.pre("save", function (next) {
  try {
    const districtKey = Object.keys(locations).find(
      (d) => d.toLowerCase() === this.district.toLowerCase()
    );

    if (!districtKey) {
      throw new Error("Invalid district");
    }

    this.district = districtKey;

    next();
  } catch (err) {
    next(err);
  }
});

/* =====================================================
   INDEXES
===================================================== */
leadSchema.index({ phone: 1 });
leadSchema.index({ district: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });

export default mongoose.model("Lead", leadSchema);
