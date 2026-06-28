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
      set: (v) => v?.toString().replace(/\D/g, ""),
      match: [/^[6-9]\d{9}$/, "Invalid phone number"],
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: ["car", "bike", "other"],
      default: null,
    },

    payment: {
      type: String,
      enum: ["cash", "finance"],
      default: null,
    },

    buyer: {
      type: String,
      enum: ["customer", "mediator", "dealer"],
      default: null,
    },

    board: {
      type: String,
      enum: ["tboard", "own"],
      default: null,
    },

    transmission: {
      type: String,
      enum: ["MT", "AMT"],
      default: null,
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

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    audioNote: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   DISTRICT VALIDATION
===================================================== */
leadSchema.pre("save", function (next) {
  if (!this.district) return next();

  const districtKey = Object.keys(locations).find(
    (d) => d.toLowerCase() === this.district.toLowerCase()
  );

  if (!districtKey) {
    return next(new Error("Invalid district"));
  }

  this.district = districtKey;
  next();
});

/* =====================================================
   INDEXES
===================================================== */
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });

export default mongoose.model("Lead", leadSchema);