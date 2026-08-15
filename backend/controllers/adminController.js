const Item = require("../models/Item");
const User = require("../models/User");
const Claim = require("../models/Claim");

// GET /api/admin/items  (all reports, any status, with optional filter)
exports.getAllItems = async (req, res) => {
  try {
    const { approvalStatus } = req.query;
    const query = {};
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const items = await Item.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch items", error: err.message });
  }
};

// PATCH /api/admin/items/:id/approve
exports.approveItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "approved", rejectionReason: null },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: "Could not approve item", error: err.message });
  }
};

// PATCH /api/admin/items/:id/reject
exports.rejectItem = async (req, res) => {
  try {
    const { reason } = req.body;
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "rejected", rejectionReason: reason || "Did not meet posting guidelines" },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: "Could not reject item", error: err.message });
  }
};

// DELETE /api/admin/items/:id  (remove fake/duplicate listing)
exports.removeItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    await Claim.deleteMany({ item: item._id });
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(500).json({ message: "Could not remove item", error: err.message });
  }
};

// GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch users", error: err.message });
  }
};

// PATCH /api/admin/users/:id/block  (toggle block/unblock)
exports.toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot block an admin account" });
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ message: user.isBlocked ? "User blocked" : "User unblocked", user });
  } catch (err) {
    res.status(500).json({ message: "Could not update user", error: err.message });
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot delete an admin account" });
    }
    await user.deleteOne();
    await Item.deleteMany({ user: user._id });
    res.json({ message: "User and their reports removed" });
  } catch (err) {
    res.status(500).json({ message: "Could not delete user", error: err.message });
  }
};

// GET /api/admin/stats  (dashboard numbers)
exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalItems, lostCount, foundCount, claimedCount, pendingApproval, totalClaims] =
      await Promise.all([
        User.countDocuments(),
        Item.countDocuments(),
        Item.countDocuments({ status: "Lost" }),
        Item.countDocuments({ status: "Found" }),
        Item.countDocuments({ itemStatus: "claimed" }),
        Item.countDocuments({ approvalStatus: "pending" }),
        Claim.countDocuments(),
      ]);

    const byCategory = await Item.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      totalUsers,
      totalItems,
      lostCount,
      foundCount,
      claimedCount,
      pendingApproval,
      totalClaims,
      byCategory,
    });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch stats", error: err.message });
  }
};
