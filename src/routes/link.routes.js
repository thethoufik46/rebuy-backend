import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadLink from "../middleware/uploadLink.js";

import {
  addLink,
  getLinks,
  updateLink,
  deleteLink,
} from "../controllers/link.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadLink.single("image"),
  addLink
);

router.get("/", getLinks);

router.put(
  "/:id",
  verifyToken,
  uploadLink.single("image"),
  updateLink
);

router.delete("/:id", verifyToken, deleteLink);

export default router;
