import Notification from "../models/notification_model.js";
import {
  uploadNotificationImage,
  deleteNotificationImage,
} from "../utils/sendNotificationImage.js";

export const addNotification = async (req, res) => {
  try {
    const { title, description, link } = req.body;

    let image = "";
    if (req.file) image = await uploadNotificationImage(req.file);

    const notification = await Notification.create({
      title,
      description,
      image,
      link: link || "",
    });

    res.status(201).json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link } = req.body;

    const notification = await Notification.findById(id);
    if (!notification)
      return res.status(404).json({ success: false });

    if (title) notification.title = title;
    if (description) notification.description = description;
    if (link !== undefined) notification.link = link;

    if (req.file) {
      await deleteNotificationImage(notification.image);
      notification.image = await uploadNotificationImage(req.file);
    }

    await notification.save();
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification)
      return res.status(404).json({ success: false });

    await deleteNotificationImage(notification.image);
    await notification.deleteOne();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
