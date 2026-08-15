const express = require("express");
const router = express.Router();
const {
  getAllItems,
  approveItem,
  rejectItem,
  removeItem,
  getAllUsers,
  toggleBlockUser,
  deleteUser,
  getStats,
} = require("../controllers/adminController");
router.patch("/items/:id/approve", approveItem);
router.patch("/items/:id/reject", rejectItem);
router.delete("/items/:id", removeItem);

router.get("/users", getAllUsers);
router.patch("/users/:id/block", toggleBlockUser);
router.delete("/users/:id", deleteUser);

router.get("/stats", getStats);

module.exports = router;
