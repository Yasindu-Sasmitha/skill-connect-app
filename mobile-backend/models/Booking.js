const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        index: true
    },
    equipment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Equipment',
        index: true
    },
    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    bookingStatus: {
        type: String,
        enum: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'],
        default: 'requested',
        index: true
    },
    scheduledDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > new Date();
            },
            message: 'Scheduled date must be in the future'
        }
    },
    scheduledTime: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    estimatedDurationHours: {
        type: Number,
        min: [0.5, 'Duration must be at least 0.5 hours'],
        max: [24, 'Duration cannot exceed 24 hours']
    },
    finalCost: {
        type: Number,
        min: [0, 'Cost cannot be negative']
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending',
        index: true
    },
    notes: String,
    cancellationReason: String,
    cancelledAt: Date,
    completedAt: Date,
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Automatically filter out soft-deleted records
bookingSchema.pre('find', function() {
    this.where({ isDeleted: false });
});

bookingSchema.pre('findOne', function() {
    this.where({ isDeleted: false });
});

bookingSchema.pre('findOneAndUpdate', function() {
    this.where({ isDeleted: false });
});

// Add soft delete method
bookingSchema.methods.softDelete = async function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return await this.save();
};

// Add restore method
bookingSchema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    return await this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);
