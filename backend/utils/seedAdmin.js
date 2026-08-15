// Run with: npm run seed:admin
// Creates (or updates) one admin account so you have a way to log into the admin panel.
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@campus.edu";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";
const ADMIN_NAME = process.env.ADMIN_NAME || "Campus Admin";

(async () => {
  await connectDB();

  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (admin) {
    admin.role = "admin";
    admin.isBlocked = false;
    await admin.save();
    console.log(`Existing user ${ADMIN_EMAIL} promoted to admin.`);
  } else {
    admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
    });
    console.log(`Admin account created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log("Log in and change this password if this is a shared environment.");
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
