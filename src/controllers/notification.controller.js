import Notification from "../models/notification_model.js";
import cloudinary from "../config/cloudinary.js";

/* =========================
   🟢 CREATE NOTIFICATION
========================= */
export const addNotification = async (req, res) => {
  try {
    const { title, description, link } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    const notification = await Notification.create({
      title: title.trim(),
      description: description.trim(),
      link: link || null,
      imageUrl: req.file ? req.file.path : null,
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔵 GET NOTIFICATIONS
========================= */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🟡 UPDATE NOTIFICATION
========================= */
export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link } = req.body;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (title) notification.title = title.trim();
    if (description) notification.description = description.trim();
    if (link !== undefined) notification.link = link || null;

    // replace image if new image uploaded
    if (req.file) {
      if (notification.imageUrl) {
        const publicId = notification.imageUrl
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];

        await cloudinary.uploader.destroy(publicId);
      }
      notification.imageUrl = req.file.path;
    }

    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      notification,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔴 DELETE NOTIFICATION
========================= */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.imageUrl) {
      const publicId = notification.imageUrl
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];

      await cloudinary.uploader.destroy(publicId);
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
