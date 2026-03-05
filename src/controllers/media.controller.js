import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../config/r2.js";
import User from "../models/user_model.js";

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image required",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* DELETE OLD IMAGE */
    if (user.profileImage) {
      const oldKey = user.profileImage.replace(
        process.env.R2_PUBLIC_URL + "/",
        ""
      );

      await r2.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: oldKey,
        })
      );
    }

    /* NEW IMAGE KEY */
    const key = `profile/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.octet-stream`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    /* SAVE FULL PUBLIC URL */
    const imageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    user.profileImage = imageUrl;

    await user.save();

    res.json({
      success: true,
      image: imageUrl,
    });
  } catch (err) {
    console.error("❌ R2 UPLOAD ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};