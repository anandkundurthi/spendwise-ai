import { Router } from 'express';
import { z } from 'zod';
import Goal from '../models/Goal.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = Router(); router.use(requireAuth);
router.get('/', asyncHandler(async (req, res) => { const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 }); res.json({ goals: goals.map(g => ({ id: g._id, name: g.name, target: g.targetMinor / 100, saved: g.savedMinor / 100, targetDate: g.targetDate })) }); }));
router.post('/', asyncHandler(async (req, res) => {
 const p = z.object({ name: z.string().trim().min(2).max(100), target: z.number().positive().max(100000000), saved: z.number().min(0).max(100000000).optional(), targetDate: z.iso.datetime().optional() }).safeParse(req.body);
 if (!p.success) return res.status(400).json({ message: 'Enter a goal name and valid target amount.' });
 const g = await Goal.create({ user: req.user._id, name: p.data.name, targetMinor: Math.round(p.data.target * 100), savedMinor: Math.round((p.data.saved || 0) * 100), targetDate: p.data.targetDate ? new Date(p.data.targetDate) : null });
 res.status(201).json({ goal: { id: g._id, name: g.name, target: g.targetMinor / 100, saved: g.savedMinor / 100, targetDate: g.targetDate } });
}));
export default router;
