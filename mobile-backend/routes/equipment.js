const express = require('express');
const Equipment = require('../models/Equipment');
const auth = require('../middleware/auth');
const router = express.Router();

const sanitizeEquipmentData = (data = {}) => {
    // Accept both legacy keys and current API keys.
    const sanitized = {};

    const equipmentName = data.equipmentName ?? data.name;
    const equipmentDescription = data.equipmentDescription ?? data.description;
    const rentalPricePerDay = data.rentalPricePerDay ?? data.dailyRate ?? data.rentalPrice;
    const depositAmount = data.depositAmount ?? data.deposit;
    const conditionInput = String(data.equipmentCondition ?? data.condition ?? "good").trim().toLowerCase();
    const conditionAliases = {
        new: "new",
        excellent: "excellent",
        exc: "excellent",
        good: "good",
        goo: "good",
        fair: "fair",
        fai: "fair"
    };
    const equipmentCondition = conditionAliases[conditionInput] || "good";

    if (equipmentName !== undefined) sanitized.equipmentName = equipmentName;
    if (equipmentDescription !== undefined) sanitized.equipmentDescription = equipmentDescription;
    if (data.category !== undefined) sanitized.category = data.category;
    if (equipmentCondition !== undefined) sanitized.equipmentCondition = equipmentCondition;
    if (rentalPricePerDay !== undefined) sanitized.rentalPricePerDay = rentalPricePerDay;
    if (depositAmount !== undefined) sanitized.depositAmount = depositAmount;
    if (data.quantityAvailable !== undefined) sanitized.quantityAvailable = data.quantityAvailable;
    if (data.quantityTotal !== undefined) sanitized.quantityTotal = data.quantityTotal;
    if (data.imagePath !== undefined) sanitized.imagePath = data.imagePath;
    if (data.isAvailable !== undefined) sanitized.isAvailable = data.isAvailable;

    return sanitized;
};

// GET /api/equipment — list available equipment with pagination
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, category } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const filter = { isAvailable: true };
        if (category && typeof category === 'string') filter.category = category;

        const equipment = await Equipment.find(filter)
            .populate('supplier', 'firstName lastName companyName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Equipment.countDocuments(filter);

        res.json({
            status: 'success',
            data: {
                content: equipment,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch equipment' });
    }
});

// GET /api/equipment/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const item = await Equipment.findById(req.params.id)
            .populate('supplier', 'firstName lastName companyName email phone');
        if (!item) return res.status(404).json({ status: 'error', message: 'Equipment not found' });
        res.json({ status: 'success', data: item });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch equipment' });
    }
});

// POST /api/equipment — add equipment (supplier only)
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'supplier') {
            return res.status(403).json({ status: 'error', message: 'Only suppliers can add equipment' });
        }

        const sanitized = sanitizeEquipmentData(req.body);
        const equipment = new Equipment({
            ...sanitized,
            supplier: req.userId
        });
        await equipment.save();
        res.status(201).json({ status: 'success', data: equipment });
    } catch (error) {
        let detailMessage = '';
        if (error?.name === 'ValidationError') {
            detailMessage = Object.values(error.errors || {})[0]?.message;
        } else {
            detailMessage = error.message; // Reveal other errors like MongoServerError or TypeErrors
        }
        res.status(400).json({ status: 'error', message: detailMessage || 'Failed to add equipment' });
    }
});

// PUT /api/equipment/:id — update equipment (supplier only)
router.put('/:id', auth, async (req, res) => {
    try {
        const equipment = await Equipment.findOne({
            _id: req.params.id,
            supplier: req.userId
        });
        if (!equipment) return res.status(404).json({ status: 'error', message: 'Equipment not found or not authorized' });

        const sanitized = sanitizeEquipmentData(req.body);
        Object.assign(equipment, sanitized);
        await equipment.save();

        res.json({ status: 'success', data: equipment });
    } catch (error) {
        let detailMessage = '';
        if (error?.name === 'ValidationError') {
            detailMessage = Object.values(error.errors || {})[0]?.message;
        } else {
            detailMessage = error.message;
        }
        res.status(400).json({ status: 'error', message: detailMessage || 'Failed to update equipment' });
    }
});

// DELETE /api/equipment/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const equipment = await Equipment.findOneAndDelete({
            _id: req.params.id,
            supplier: req.userId
        });
        if (!equipment) return res.status(404).json({ status: 'error', message: 'Equipment not found or not authorized' });
        res.json({ status: 'success', message: 'Equipment deleted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to delete equipment' });
    }
});

module.exports = router;
