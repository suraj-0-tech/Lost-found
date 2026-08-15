const Claim = require("../models/Claim");
const Item = require("../models/Item");

// POST /api/claims  (a user claims a found item / offers to return a lost item)
exports.createClaim = async (req, res) => {
  try {
    const { itemId, message } = req.body;
    if (!itemId) return res.status(400).json({ message: "itemId is required" });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot claim your own report" });
    }

    const claim = await Claim.create({
      item: itemId,
      claimedBy: req.user._id,
      message: message || "",
    });

    res.status(201).json({ claim });
  } catch (err) {
    res.status(500).json({ message: "Could not submit claim", error: err.message });
  }
};

// GET /api/claims/mine  (claims the logged-in user has made)
exports.getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ claimedBy: req.user._id })
      .populate("item")
      .sort({ createdAt: -1 });
    res.json({ count: claims.length, claims });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch your claims", error: err.message });
  }
};

// GET /api/claims/item/:itemId  (claims made against one of MY reported items)
exports.getClaimsForItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view these claims" });
    }

    const claims = await Claim.find({ item: req.params.itemId })
      .populate("claimedBy", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ count: claims.length, claims });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch claims", error: err.message });
  }
};

// PATCH /api/claims/:id  (item owner approves/rejects a claim on their item)
exports.respondToClaim = async (req, res) => {
  try {
    const { claimStatus } = req.body;
    if (!["approved", "rejected"].includes(claimStatus)) {
      return res.status(400).json({ message: "claimStatus must be 'approved' or 'rejected'" });
    }

    const claim = await Claim.findById(req.params.id).populate("item");
    if (!claim) return res.status(404).json({ message: "Claim not found" });

    if (claim.item.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to respond to this claim" });
    }

    claim.claimStatus = claimStatus;
    await claim.save();

    if (claimStatus === "approved") {
      await Item.findByIdAndUpdate(claim.item._id, { itemStatus: "claimed" });
    }

    res.json({ claim });
  } catch (err) {
    res.status(500).json({ message: "Could not update claim", error: err.message });
  }
};
