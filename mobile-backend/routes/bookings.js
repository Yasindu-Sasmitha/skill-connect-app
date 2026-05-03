const express = require('express');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const { sanitizeBookingData } = require('../middleware/validation');
const router = express.Router();

// GET /api/bookings/my — get my bookings (as customer or worker)
router.get('/my', auth, async (req, res) => {
    try {
        const role = req.query.as || 'customer';
        const { page = 1, limit = 20 } = req.query;
        
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const filter = role === 'worker'
            ? { worker: req.userId }
            : { customer: req.userId };

        const bookings = await Booking.find(filter)
            .populate('worker', 'firstName lastName email phone skills')
            .populate('customer', 'firstName lastName email phone')
            .populate('job', 'jobTitle')
            .populate('equipment', 'equipmentName equipmentDescription rentalPricePerDay')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Booking.countDocuments(filter);

        res.json({ 
            status: 'success', 
            data: { 
                content: bookings,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            } 
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch bookings' });
    }
});

// GET /api/bookings/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('worker', 'firstName lastName email phone skills')
            .populate('customer', 'firstName lastName email phone')
            .populate('job', 'jobTitle jobDescription')
            .populate('equipment', 'equipmentName equipmentDescription rentalPricePerDay imagePath');
        if (!booking) return res.status(404).json({ status: 'error', message: 'Booking not found' });
        
        // Check authorization
        if (booking.customer.toString() !== req.userId.toString() && 
            booking.worker.toString() !== req.userId.toString()) {
            return res.status(403).json({ status: 'error', message: 'Not authorized' });
        }

        res.json({ status: 'success', data: booking });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch booking' });
    }
});

// POST /api/bookings — create booking
router.post('/', auth, async (req, res) => {
    try {
        const sanitized = sanitizeBookingData(req.body);
        const booking = new Booking({
            ...sanitized,
            customer: req.userId
        });
        await booking.save();
        res.status(201).json({ status: 'success', data: booking });
    } catch (error) {
        res.status(400).json({ status: 'error', message: 'Failed to create booking' });
    }
});

// PATCH /api/bookings/:id/status — update booking status (only valid transitions)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status, reason } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ status: 'error', message: 'Booking not found' });

        // Authorization check
        if (booking.customer.toString() !== req.userId.toString() && 
            booking.worker.toString() !== req.userId.toString()) {
            return res.status(403).json({ status: 'error', message: 'Not authorized' });
        }

        // Validate status transitions
        const validTransitions = {
            'requested': ['accepted', 'rejected'],
            'accepted': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': [],
            'rejected': []
        };

        if (!validTransitions[booking.bookingStatus]?.includes(status)) {
            return res.status(400).json({ 
                status: 'error', 
                message: `Cannot transition from ${booking.bookingStatus} to ${status}` 
            });
        }

        booking.bookingStatus = status;
        if (status === 'cancelled') {
            booking.cancellationReason = reason;
            booking.cancelledAt = new Date();
        }
        if (status === 'completed') {
            booking.completedAt = new Date();
        }

        await booking.save();
        res.json({ status: 'success', data: booking });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update booking' });
    }
});

// DELETE /api/bookings/:id (only by customer or worker who requested it)
router.delete('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findOne({
            _id: req.params.id,
            $or: [
                { customer: req.userId },
                { worker: req.userId }
            ]
        });
        if (!booking) return res.status(404).json({ status: 'error', message: 'Booking not found or not authorized' });
        
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ status: 'success', message: 'Booking deleted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to delete booking' });
    }
});

module.exports = router;
