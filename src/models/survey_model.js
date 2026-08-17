// ======================= survey_model.js =======================

import mongoose from "mongoose";
import fs from "fs";
import path from "path";


/* ============================================================
   LOAD TAMIL NADU LOCATIONS
============================================================ */

const locationsPath =
  path.join(
    process.cwd(),
    "src",
    "tamilnadu_locations.json"
  );

let locations = {};

try {

  locations =
    JSON.parse(
      fs.readFileSync(
        locationsPath,
        "utf-8"
      )
    );

} catch (error) {

  console.error(
    "❌ Failed to load Tamil Nadu locations:",
    error
  );

  locations = {};
}


/* ============================================================
   SCHEMA
============================================================ */

const surveySchema =
  new mongoose.Schema(
    {

      /* ========================================================
         LOGGED-IN USER
      ======================================================== */

      user: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true,
      },


      /* ========================================================
         CUSTOMER
      ======================================================== */

      name: {
        type: String,
        required: true,
        trim: true,
      },


      phone: {
        type: String,
        required: true,
        trim: true,
      },


      /* ========================================================
         DISTRICT
      ======================================================== */

      district: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },


      /* ========================================================
         LOCATION
      ======================================================== */

      latitude: {
        type: Number,
        default: null,
        min: -90,
        max: 90,
      },


      longitude: {
        type: Number,
        default: null,
        min: -180,
        max: 180,
      },


      /* ========================================================
         PROPERTY TYPE
      ======================================================== */

      propertyType: {
        type: String,

        enum: [
          "Residential Plot - வீட்டு மனை",
          "Agricultural Land - விவசாய நிலம்",
          "Vacant Land - காலி நிலம்",
          "House / Building - வீடு / கட்டிடம்",
          "Commercial Property - வணிக சொத்து",
          "Layout / Plot - லேஅவுட் / மனை",
          "Other - மற்றவை",
          null,
        ],

        default: null,
      },


      /* ========================================================
         SURVEY TYPE
      ======================================================== */

      surveyType: {
        type: String,

        enum: [
          "Land Measurement - நில அளவீடு",
          "Boundary Measurement - எல்லை அளவீடு",
          "Plot Measurement - மனை அளவீடு",
          "Site Measurement - இட அளவீடு",
          "Building Measurement - கட்டிட அளவீடு",
          "Full Property Survey - முழு சொத்து சர்வே",
          "Other - மற்றவை",
          null,
        ],

        default: null,
      },


      /* ========================================================
         AREA
      ======================================================== */

      approximateArea: {
        type: Number,
        default: null,
        min: 0,
      },


      areaUnit: {
        type: String,

        enum: [
          "Sq.ft - சதுர அடி",
          "Cent - சென்ட்",
          "Ground - கிரவுண்ட்",
          "Acre - ஏக்கர்",
          "Hectare - ஹெக்டேர்",
          null,
        ],

        default: null,
      },


      /* ========================================================
         DOCUMENT DETAILS
      ======================================================== */

      surveyNumber: {
        type: String,
        trim: true,
        default: "",
      },


      subdivisionNumber: {
        type: String,
        trim: true,
        default: "",
      },


      pattaNumber: {
        type: String,
        trim: true,
        default: "",
      },


      /* ========================================================
         BOUNDARY
      ======================================================== */

      boundaryStatus: {
        type: String,

        enum: [
          "Boundary Clear - எல்லை தெளிவாக உள்ளது",
          "Boundary Unclear - எல்லை தெளிவாக இல்லை",
          "Boundary Issue - எல்லை பிரச்சனை உள்ளது",
          "Not Sure - தெரியவில்லை",
        ],

        default:
          "Not Sure - தெரியவில்லை",
      },


      /* ========================================================
         REQUIREMENT
      ======================================================== */

      requirement: {
        type: String,

        enum: [
          "Before Buying - வாங்குவதற்கு முன்",
          "For Sale - விற்பனைக்காக",
          "Boundary Check - எல்லை சரிபார்ப்பு",
          "Construction - கட்டுமானத்திற்காக",
          "Property Division - சொத்து பிரிப்புக்கு",
          "Document Related - ஆவணம் தொடர்பாக",
          "General Measurement - பொதுவான அளவீடு",
          "Other - மற்றவை",
        ],

        default:
          "General Measurement - பொதுவான அளவீடு",
      },


      /* ========================================================
         DESCRIPTION
      ======================================================== */

      description: {
        type: String,
        trim: true,
        default: "",
      },


      /* ========================================================
         VISIT
      ======================================================== */

      preferredDate: {
        type: Date,
        default: null,
      },


      preferredTime: {
        type: String,
        trim: true,
        default: "",
      },


      /* ========================================================
         STATUS
      ======================================================== */

      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
          "completed",
        ],

        default: "pending",

        index: true,
      },


      /* ========================================================
         ADMIN NOTE
      ======================================================== */

      adminNote: {
        type: String,
        trim: true,
        default: "",
      },


      /* ========================================================
         SOFT DELETE
      ======================================================== */

      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },


      deletedAt: {
        type: Date,
        default: null,
        index: true,
      },

    },

    {
      timestamps: true,
    }
  );


/* ============================================================
   DISTRICT VALIDATION
============================================================ */

surveySchema.pre(
  "save",
  function (next) {

    try {

      const districtValue =
        String(
          this.district || ""
        ).trim();


      if (!districtValue) {
        return next(
          new Error(
            "District is required"
          )
        );
      }


      const districtKey =
        Object.keys(
          locations
        ).find(
          (district) =>
            district.toLowerCase() ===
            districtValue.toLowerCase()
        );


      if (!districtKey) {
        return next(
          new Error(
            "Invalid Tamil Nadu district"
          )
        );
      }


      this.district =
        districtKey;


      next();

    } catch (error) {

      next(error);
    }
  }
);


/* ============================================================
   INDEXES
============================================================ */

surveySchema.index({
  user: 1,
  isDeleted: 1,
  createdAt: -1,
});


surveySchema.index({
  district: 1,
  status: 1,
});


surveySchema.index({
  surveyType: 1,
  status: 1,
});


surveySchema.index({
  propertyType: 1,
  status: 1,
});


surveySchema.index({
  createdAt: -1,
});


surveySchema.index({
  isDeleted: 1,
  deletedAt: 1,
});


/* ============================================================
   MODEL
============================================================ */

const Survey =
  mongoose.model(
    "Survey",
    surveySchema
  );


export default Survey;