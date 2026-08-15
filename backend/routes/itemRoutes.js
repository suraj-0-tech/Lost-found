const express = require("express");
const router = express.Router();
const {
  createItem,
  getItems,
  getMyItems,
  getItemById,
  updateItem,
  deleteItem,
  markClaimed,
} = require("../controllers/itemController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", getItems); // public search/filter
router.get("/mine", protect, getMyItems);
router.get("/:id", getItemById);

router.post("/", protect, upload.single("image"), createItem);
router.patch("/:id", protect, upload.single("image"), updateItem);
router.delete("/:id", protect, deleteItem);
router.patch("/:id/claim", protect, markClaimed);

module.exports = router;
