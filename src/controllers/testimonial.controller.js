import Testimonial from "../models/testimonial_model.js";
import cloudinary from "../config/cloudinary.js";

/* =========================
   🟢 ADD TESTIMONIAL (ADMIN)
========================= */
export const addTestimonial = async (req, res) => {
  try {
    const { name, description, location, rating, phone } = req.body;

    if (!name || !description || !location || !rating || !phone || !req.files?.image) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    const testimonial = await Testimonial.create({
      name: name.trim(),
      description: description.trim(),
      location: location.trim(),
      rating: Number(rating),
      phone,
      imageUrl: req.files.image[0].path,
      videoUrl: req.files.video ? req.files.video[0].path : null,
    });

    res.status(201).json({
      success: true,
      message: "Testimonial added successfully",
      testimonial,
    });
  } catch (error) {
    console.error("Add testimonial error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔵 GET TESTIMONIALS (USER)
========================= */
export const getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: testimonials.length,
      testimonials,
    });
  } catch (error) {
    console.error("Get testimonials error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🟡 UPDATE TESTIMONIAL (ADMIN)
========================= */
export const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    const { name, description, location, rating, phone } = req.body;

    if (name) testimonial.name = name.trim();
    if (description) testimonial.description = description.trim();
    if (location) testimonial.location = location.trim();
    if (rating) testimonial.rating = Number(rating);
    if (phone) testimonial.phone = phone;

    // replace image
    if (req.files?.image) {
      if (testimonial.imageUrl) {
        const publicId = testimonial.imageUrl
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
      testimonial.imageUrl = req.files.image[0].path;
    }

    // replace video
    if (req.files?.video) {
      if (testimonial.videoUrl) {
        const publicId = testimonial.videoUrl
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
      testimonial.videoUrl = req.files.video[0].path;
    }

    await testimonial.save();

    res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      testimonial,
    });
  } catch (error) {
    console.error("Update testimonial error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔴 DELETE TESTIMONIAL (ADMIN)
========================= */
export const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    if (testimonial.imageUrl) {
      const publicId = testimonial.imageUrl
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    if (testimonial.videoUrl) {
      const publicId = testimonial.videoUrl
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await testimonial.deleteOne();

    res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully",
    });
  } catch (error) {
    console.error("Delete testimonial error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
