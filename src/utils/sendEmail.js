import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (toEmail, otp, userName = "") => {
  try {
    const response = await resend.emails.send({
      from: "Re2Buy <onboarding@resend.dev>",
      to: toEmail,
      subject: "Password Reset OTP - ReBuy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${userName || "User"},</p>
          <p>Your OTP for password reset is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; padding: 15px; background: #f5f5f5; text-align: center; border-radius: 8px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px;">This OTP is valid for <b>10 minutes</b>.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">- ReBuy Team</p>
        </div>
      `,
    });

    console.log("✅ EMAIL SENT:", toEmail, response?.data?.id);
    return response;
  } catch (error) {
    console.error("❌ EMAIL FAILED:", error?.message);
    throw error;
  }
};