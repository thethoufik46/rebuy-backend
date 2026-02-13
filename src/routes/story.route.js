import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadStory from "../middleware/uploadStory.js";

import {
  addStory,
  getStories,
  updateStory,
  deleteStory,
} from "../controllers/story.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadStory.single("media"),
  addStory
);

router.get("/", getStories);

router.put(
  "/:id",
  verifyToken,
  uploadStory.single("media"),
  updateStory
);

router.delete("/:id", verifyToken, deleteStory);

export default router;
