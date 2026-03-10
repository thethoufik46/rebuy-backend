import express from "express";
import uploadNotification from "../middleware/uploadNotification.js";
import {
  addNotification,
  getNotifications,
  updateNotification,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.post(
  "/add",
  uploadNotification.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  addNotification
);

router.get("/", getNotifications);

router.put(
  "/:id",
  uploadNotification.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  updateNotification
);

router.delete("/:id", deleteNotification);

export default router;