import bcrypt from "bcryptjs";
import User from "../models/user/user_model.js";

export const createAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const admin = new User({
      name: process.env.ADMIN_NAME,
      phone: process.env.ADMIN_PHONE,
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();
    console.log("🛠️ Admin user created successfully!");
    console.log(`🔑 Email: ${process.env.ADMIN_EMAIL}`);
    console.log(`🔐 Password: ${process.env.ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};
