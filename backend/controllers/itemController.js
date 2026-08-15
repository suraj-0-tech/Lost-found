const Item = require("../models/Item");

// POST /api/items  (report a lost or found item)
exports.createItem = async (req, res) => {
  try {
    const { title, description, category, status, location, date } = req.body;

    if (!title || !description || !category || !status || !location || !date) {
      return res.status(400).json({ message: "All fields except image are required" });
    }
    if (!["Lost", "Found"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'Lost' or 'Found'" });
    }

    const item = await Item.create({
      title,
      description,
      category,
      status,
      location,
      date,
      user: req.user._id,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    });

    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: "Could not create report", error: err.message });
  }
};

// GET /api/items  (public search + filter, only approved & non-claimed by default)
exports.getItems = async (req, res) => {
  try {
    const { keyword, category, location, status, date, includeClaimed } = req.query;

    const query = { approvalStatus: "approved" };

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }
    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: "i" };
    if (status && ["Lost", "Found"].includes(status)) query.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }
    if (!includeClaimed || includeClaimed === "false") {
      query.itemStatus = "open";
    }

    const items = await Item.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

// GET /api/items/mine  (logged-in user's own reports)
exports.getMyItems = async (req, res) => {
  try {
    const items = await Item.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch your reports", error: err.message });
  }
};

// GET /api/items/:id
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("user", "name email phone");
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch item", error: err.message });
  }
};

// PATCH /api/items/:id  (owner can edit their own report while pending)
exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own reports" });
    }

    const editableFields = ["title", "description", "category", "location", "date"];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    });
    if (req.file) item.image = `/uploads/${req.file.filename}`;

    // Any edit sends it back for re-approval to keep moderation meaningful
    item.approvalStatus = "pending";
    await item.save();

    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

// DELETE /api/items/:id  (owner can remove their own report)
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own reports" });
    }

    await item.deleteOne();
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
};

// PATCH /api/items/:id/claim  (owner marks their item as claimed/resolved)
exports.markClaimed = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the reporter or an admin can mark this claimed" });
    }

    item.itemStatus = "claimed";
    await item.save();

    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: "Could not update item status", error: err.message });
  }
};
