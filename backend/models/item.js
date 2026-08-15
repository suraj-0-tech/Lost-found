const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Electronics",
        "Documents",
        "Accessories",
        "Bags",
        "Clothing",
        "Keys",
        "Books",
        "Other",
      ],
    },
    status: {
      type: String,
      enum: ["Lost", "Found"],
      required: true,
    },
    image: {
      type: String, // relative path e.g. /uploads/xyz.jpg
      default: null,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Moderation workflow
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Item lifecycle
    itemStatus: {
      type: String,
      enum: ["open", "claimed"],
      default: "open",
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Speeds up search/filter queries
itemSchema.index({ title: "text", description: "text" });
itemSchema.index({ category: 1, location: 1, date: -1, status: 1 });

module.exports = mongoose.model("Item", itemSchema);
