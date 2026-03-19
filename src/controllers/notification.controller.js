import Notification from "../models/notification_model.js";

import {
  uploadNotificationImage,
  uploadNotificationAudio,
  deleteNotificationImage,
} from "../utils/sendNotificationImage.js";


// ✅ ADD NOTIFICATION
export const addNotification = async (req, res) => {
  try {
    const { title, description, link, type } = req.body;

    let image = "";
    let audioNote = "";

    if (req.files?.image) {
      image = await uploadNotificationImage(req.files.image[0]);
    }

    if (req.files?.audio) {
      audioNote = await uploadNotificationAudio(req.files.audio[0]);
    }

    const notification = await Notification.create({
      title,
      description,
      image,
      link: link || "",
      audioNote,
      type: type || "notification", // ✅ NEW
    });

    res.status(201).json({
      success: true,
      notification,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ✅ GET ALL (with optional type filter)
export const getNotifications = async (req, res) => {
  try {
    const { type } = req.query;

    const filter = {};

    if (type) {
      filter.type = type; // 🔥 filter by type
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};


// ✅ UPDATE
export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ success: false });
    }

    if (req.body.title) {
      notification.title = req.body.title;
    }

    if (req.body.description) {
      notification.description = req.body.description;
    }

    if (req.body.link !== undefined) {
      notification.link = req.body.link;
    }

    // ✅ UPDATE TYPE
    if (req.body.type) {
      notification.type = req.body.type;
    }

    if (req.files?.image) {
      await deleteNotificationImage(notification.image);

      notification.image = await uploadNotificationImage(
        req.files.image[0]
      );
    }

    if (req.files?.audio) {
      notification.audioNote = await uploadNotificationAudio(
        req.files.audio[0]
      );
    }

    await notification.save();

    res.json({
      success: true,
      notification,
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};


// ✅ DELETE
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ success: false });
    }

    await deleteNotificationImage(notification.image);

    await notification.deleteOne();

    res.json({
      success: true,
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};