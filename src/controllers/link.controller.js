import Link from "../models/link_model.js";

/* =========================
   🟢 ADD LINK (ADMIN)
   IMAGE OPTIONAL
========================= */
export const addLink = async (req, res) => {
  try {
    const { title } = req.body;

    const newLink = new Link({
      title,
      image: req.file ? req.file.path : "", // 🖼️ Cloudinary URL
    });

    await newLink.save();

    res.status(201).json({
      success: true,
      message: "Link added successfully",
      data: newLink,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   🔵 GET ALL LINKS (USER)
========================= */
export const getLinks = async (req, res) => {
  try {
    const links = await Link.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: links,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   🟡 UPDATE LINK (ADMIN)
   IMAGE OPTIONAL
========================= */
export const updateLink = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = {
      title: req.body.title,
    };

    // 🖼️ If new image uploaded → replace
    if (req.file) {
      updateData.image = req.file.path;
    }

    const updatedLink = await Link.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Link updated successfully",
      data: updatedLink,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   🔴 DELETE LINK (ADMIN)
========================= */
export const deleteLink = async (req, res) => {
  try {
    const { id } = req.params;

    await Link.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Link deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
