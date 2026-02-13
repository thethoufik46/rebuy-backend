import Story from "../models/story_model.js";
import {
  uploadStoryMedia,
  deleteStoryMedia,
} from "../utils/sendStory.js";

/* =========================
   ADD STORY
========================= */
export const addStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Media file required",
      });
    }

    const { title = "" } = req.body;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const mediaUrl = await uploadStoryMedia(req.file);

    const story = await Story.create({
      title: title.trim(),
      media: mediaUrl,
      mediaType: req.file.mimetype.includes("video")
        ? "video"
        : "image",
      expiresAt,
    });

    res.json({ success: true, story });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   GET STORIES
========================= */
export const getStories = async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json({ success: true, stories });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   UPDATE STORY
========================= */
export const updateStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    if (req.body.title !== undefined) {
      story.title = req.body.title.trim();
    }

    if (req.file) {
      await deleteStoryMedia(story.media);

      const mediaUrl = await uploadStoryMedia(req.file);

      story.media = mediaUrl;
      story.mediaType = req.file.mimetype.includes("video")
        ? "video"
        : "image";
    }

    await story.save();

    res.json({ success: true, story });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   DELETE STORY
========================= */
export const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    await deleteStoryMedia(story.media);
    await story.deleteOne();

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
