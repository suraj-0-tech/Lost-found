const express = require("express");
const router = express.Router();
const {
  createClaim,
  getMyClaims,
  getClaimsForItem,
  respondToClaim,
} = require("../controllers/claimController");
const { protect } = require("../middleware/auth");

router.post("/", protect, createClaim);
router.get("/mine", protect, getMyClaims);
router.get("/item/:itemId", protect, getClaimsForItem);
router.patch("/:id", protect, respondToClaim);

module.exports = router;
