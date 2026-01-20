import Link from "../models/link_model.js";
import {
  uploadLinkImage,
  deleteLinkImage,
} from "../utils/sendLink.js";

/* =====================================================
   CREATE LINK
===================================================== */
export const addLink = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Title and image required",
      });
    }

    const imageUrl = await uploadLinkImage(req.file);

    const link = await Link.create({
      title: title.trim(),
      image: imageUrl,
    });

    res.status(201).json({
      success: true,
      link,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET LINKS
===================================================== */
export const getLinks = async (req, res) => {
  try {
    const links = await Link.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      links,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   UPDATE LINK
===================================================== */
export const updateLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const link = await Link.findById(id);

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Link not found",
      });
    }

    if (title) link.title = title.trim();

    if (req.file) {
      await deleteLinkImage(link.image);
      link.image = await uploadLinkImage(req.file);
    }

    await link.save();

    res.status(200).json({
      success: true,
      link,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   DELETE LINK
===================================================== */
export const deleteLink = async (req, res) => {
  try {
    const { id } = req.params;

    const link = await Link.findById(id);

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Link not found",
      });
    }

    await deleteLinkImage(link.image);
    await link.deleteOne();

    res.status(200).json({
      success: true,
      message: "Link deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
