import Story from "../models/story_model.js";

/* =========================
   🟢 ADD STORY (ADMIN)
========================= */
export const addStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Media file required",
      });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await Story.create({
      media: req.file.path,
      mediaType: req.file.mimetype.startsWith("video")
        ? "video"
        : "image",
      expiresAt,
    });

    res.json({
      success: true,
      story,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   🔵 GET STORIES (ADMIN + USER)
========================= */
export const getStories = async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      stories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   🟡 UPDATE STORY (ADMIN)
========================= */
export const updateStory = async (req, res) => {
  try {
    const updateData = {};

    if (req.file) {
      updateData.media = req.file.path;
      updateData.mediaType = req.file.mimetype.startsWith("video")
        ? "video"
        : "image";
    }

    const story = await Story.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    res.json({
      success: true,
      story,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   🔴 DELETE STORY (ADMIN)
========================= */
export const deleteStory = async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    res.json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
