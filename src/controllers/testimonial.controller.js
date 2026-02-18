import Testimonial from "../models/testimonial_model.js";
import {
  uploadFileToR2,
  deleteFileFromR2,
} from "../utils/testimonialUpload.js";

/* =====================================================
   ADD TESTIMONIAL
===================================================== */
export const addTestimonial = async (req, res) => {
  try {
    const { name, description, location, rating, phone } = req.body;

    if (!name || !description || !location || !rating || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    if (!req.files?.image) {
      return res.status(400).json({
        success: false,
        message: "Image required",
      });
    }

    const imageUrl = await uploadFileToR2(
      req.files.image[0],
      "testimonials/images"
    );

    let videoUrl = null;

    if (req.files?.video) {
      videoUrl = await uploadFileToR2(
        req.files.video[0],
        "testimonials/videos"
      );
    }

    const testimonial = await Testimonial.create({
      name: name.trim(),
      description: description.trim(),
      location: location.trim(),
      rating: Number(rating),
      phone: phone.trim(),
      imageUrl,
      videoUrl,
    });

    return res.status(201).json({
      success: true,
      testimonial,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET TESTIMONIALS
===================================================== */
export const getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      testimonials,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   UPDATE TESTIMONIAL 🔥 FIXED
===================================================== */
export const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, rating, phone } = req.body;

    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    /// ✅ TEXT FIELDS
    if (name) testimonial.name = name.trim();
    if (description) testimonial.description = description.trim();
    if (location) testimonial.location = location.trim();
    if (rating) testimonial.rating = Number(rating);
    if (phone) testimonial.phone = phone.trim();

    /// ✅ IMAGE UPDATE (OPTIONAL)
    if (req.files?.image) {
      await deleteFileFromR2(testimonial.imageUrl);

      testimonial.imageUrl = await uploadFileToR2(
        req.files.image[0],
        "testimonials/images"
      );
    }

    /// ✅ VIDEO UPDATE (OPTIONAL)
    if (req.files?.video) {
      await deleteFileFromR2(testimonial.videoUrl);

      testimonial.videoUrl = await uploadFileToR2(
        req.files.video[0],
        "testimonials/videos"
      );
    }

    await testimonial.save();

    return res.status(200).json({
      success: true,
      testimonial,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   DELETE TESTIMONIAL
===================================================== */
export const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    await deleteFileFromR2(testimonial.imageUrl);
    await deleteFileFromR2(testimonial.videoUrl);

    await testimonial.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
