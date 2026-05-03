const express = require('express');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const { sanitizeJobData } = require('../middleware/validation');
const router = express.Router();

// GET /api/jobs — list all active jobs with pagination
router.get('/', auth, async (req, res) => {
    try {
        const { category, district, status, page = 1, limit = 20 } = req.query;
        
        // Validate pagination params
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const filter = {};
        if (category && typeof category === 'string') filter.category = category;
        if (district && typeof district === 'string') filter.district = district;
        if (status && typeof status === 'string') filter.jobStatus = status;
        else filter.jobStatus = 'active';

        const jobs = await Job.find(filter)
            .populate('customer', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Job.countDocuments(filter);

        res.json({ 
            status: 'success', 
            data: { 
                content: jobs,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            } 
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch jobs' });
    }
});

// GET /api/jobs/my — get my posted jobs
router.get('/my', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const jobs = await Job.find({ customer: req.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
        
        const total = await Job.countDocuments({ customer: req.userId });

        res.json({ 
            status: 'success', 
            data: { 
                content: jobs,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            } 
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch your jobs' });
    }
});

// GET /api/jobs/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('customer', 'firstName lastName email phone')
            .populate('applications.worker', 'firstName lastName email skills');
        if (!job) return res.status(404).json({ status: 'error', message: 'Job not found' });
        
        // Increment views without triggering full document validation.
        // Some legacy jobs may have now-invalid historical fields (e.g. past preferredStartDate).
        await Job.updateOne({ _id: job._id }, { $inc: { viewsCount: 1 } });
        job.viewsCount += 1;

        res.json({ status: 'success', data: job });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch job' });
    }
});

// POST /api/jobs — create a new job
router.post('/', auth, async (req, res) => {
    try {
        const sanitized = sanitizeJobData(req.body);
        const job = new Job({ ...sanitized, customer: req.userId });
        await job.save();
        res.status(201).json({ status: 'success', data: job });
    } catch (error) {
        const msg = error?.name === 'ValidationError'
            ? Object.values(error.errors || {})[0]?.message
            : error.message;
        res.status(400).json({ status: 'error', message: msg || 'Failed to create job' });
    }
});

// PUT /api/jobs/:id — update job (only by customer)
router.put('/:id', auth, async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, customer: req.userId });
        if (!job) return res.status(404).json({ status: 'error', message: 'Job not found or not authorized' });

        // Only allow updating specific fields
        const sanitized = sanitizeJobData(req.body);
        Object.assign(job, sanitized);
        await job.save();

        res.json({ status: 'success', data: job });
    } catch (error) {
        const msg = error?.name === 'ValidationError'
            ? Object.values(error.errors || {})[0]?.message
            : error.message;
        res.status(400).json({ status: 'error', message: msg || 'Failed to update job' });
    }
});

// DELETE /api/jobs/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const job = await Job.findOneAndDelete({ _id: req.params.id, customer: req.userId });
        if (!job) return res.status(404).json({ status: 'error', message: 'Job not found or not authorized' });
        res.json({ status: 'success', message: 'Job deleted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to delete job' });
    }
});

// POST /api/jobs/:id/apply — apply for a job
router.post('/:id/apply', auth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ status: 'error', message: 'Job not found' });

        const alreadyApplied = job.applications.find(
            a => a.worker.toString() === req.userId.toString()
        );
        if (alreadyApplied) return res.status(400).json({ status: 'error', message: 'Already applied' });

        job.applications.push({
            worker: req.userId,
            coverLetter: req.body.coverLetter,
            proposedRate: req.body.proposedRate
        });
        await job.save();

        res.status(201).json({ status: 'success', message: 'Application submitted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to submit application' });
    }
});

module.exports = router;
