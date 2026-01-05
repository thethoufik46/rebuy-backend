import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    phone: {
      type: String,
      required: true,
    },

    videoUrl: {
      type: String, // optional
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Testimonial", testimonialSchema);
