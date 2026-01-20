// ======================= notification.controller.js =======================

import Notification from "../models/notification_model.js";
import {
  uploadNotificationImage,
  deleteNotificationImage,
} from "../utils/sendNotificationImage.js";

/* =====================================================
   🟢 CREATE NOTIFICATION
===================================================== */
export const addNotification = async (req, res) => {
  try {
    const { title, description, link } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    let imageUrl = "";

    if (req.file) {
      imageUrl = await uploadNotificationImage(req.file);
    }

    const notification = await Notification.create({
      title: title.trim(),
      description: description.trim(),
      link: link || "",
      imageUrl,
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* =====================================================
   🔵 GET NOTIFICATIONS
===================================================== */
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
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* =====================================================
   🔴 UNREAD COUNT (BADGE)
===================================================== */
export const getUnreadNotificationCount = async (req, res) => {
  try {
    const user = req.user;

    const lastSeen = user.lastNotificationSeenAt || new Date(0);

    const count = await Notification.countDocuments({
      createdAt: { $gt: lastSeen },
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* =====================================================
   ✅ MARK AS SEEN
===================================================== */
export const markNotificationsAsSeen = async (req, res) => {
  try {
    req.user.lastNotificationSeenAt = new Date();
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Notifications marked as seen",
    });
  } catch (error) {
    console.error("Mark seen error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* =====================================================
   🟡 UPDATE NOTIFICATION
===================================================== */
export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link } = req.body;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (title) notification.title = title.trim();
    if (description) notification.description = description.trim();
    if (link !== undefined) notification.link = link || "";

    if (req.file) {
      await deleteNotificationImage(notification.imageUrl);
      notification.imageUrl = await uploadNotificationImage(req.file);
    }

    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      notification,
    });
  } catch (error) {
    console.error("Update notification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* =====================================================
   🔴 DELETE NOTIFICATION
===================================================== */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await deleteNotificationImage(notification.imageUrl);
    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
