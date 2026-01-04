import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/user_model.js";

/* =========================
   🔑 FORGOT PASSWORD
========================= */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔐 GENERATE TOKEN
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 min

    await user.save();

    // 🔗 RESET LINK
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    console.log("🔗 RESET LINK:", resetLink); // TEMP (later mail send)

    res.status(200).json({
      success: true,
      message: "Password reset link sent to email",
      resetLink, // ⚠️ dev only (remove in production)
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

/* =========================
   🔁 RESET PASSWORD
========================= */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "New password required",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token invalid or expired",
      });
    }

    // 🔐 SAVE NEW PASSWORD
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Reset failed",
    });
  }
};
