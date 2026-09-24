import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOtpEmail = async (toEmail, otp, userName = "") => {
  const mailOptions = {
    from: `"ReBuy Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset OTP - ReBuy",
    html: `
      <div style="font-family: Arial; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
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
  };

  await transporter.sendMail(mailOptions);
};