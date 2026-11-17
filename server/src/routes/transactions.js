
import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

// Validate transaction input
const schema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive().max(100000000),
  category: z.string().trim().min(1).max(60),
  merchant: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  date: z.iso.date({
    error: 'Please provide a valid date.'
  }),
  paymentMethod: z.enum([
    'UPI',
    'Cash',
    'Card',
    'Bank transfer',
    'Other'
  ]).optional()
});

const updateSchema = schema.partial().refine(
  data => Object.keys(data).length > 0,
  'At least one field is required.'
);

// Serialize MongoDB documents
const serialize = (t) => ({
  id: t._id,
  type: t.type,
  amount: t.amountMinor / 100,
  category: t.category,
  merchant: t.merchant,
  note: t.note,
  date: t.date,
  paymentMethod: t.paymentMethod,
  source: t.source
});

// Escape search text before using regular expressions
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET: List, search and filter transactions
router.get('/', asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };

  const { search, type, category, from, to } = req.query;

  if (type && ['income', 'expense', 'transfer'].includes(type)) {
    filter.type = type;
  }

  if (category) {
    filter.category = category;
  }

  if (search?.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');

    filter.$or = [
      { merchant: regex },
      { category: regex },
      { note: regex }
    ];
  }

  if (from || to) {
    filter.date = {};

    if (from) {
      const start = new Date(from);

      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          message: 'Invalid start date.'
        });
      }

      filter.date.$gte = start;
    }

    if (to) {
      const end = new Date(to);

      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          message: 'Invalid end date.'
        });
      }

      end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  const limit = Math.min(
    Math.max(Number(req.query.limit) || 100, 1),
    250
  );

  const docs = await Transaction.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .limit(limit);

  res.json({
    transactions: docs.map(serialize),
    total: docs.length
  });
}));

// POST: Create transaction
router.post('/', asyncHandler(async (req, res) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0].message
    });
  }

  const d = parsed.data;

  const doc = await Transaction.create({
    user: req.user._id,
    type: d.type,
    amountMinor: Math.round(d.amount * 100),
    category: d.category,
    merchant: d.merchant || '',
    note: d.note || '',
    date: new Date(d.date),
    paymentMethod: d.paymentMethod || 'Other'
  });

  res.status(201).json({
    transaction: serialize(doc)
  });
}));

// PUT: Edit an existing transaction
router.put('/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid transaction ID.'
    });
  }

  const parsed = updateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0].message
    });
  }

  const d = parsed.data;
  const updates = {};

  if (d.type !== undefined) updates.type = d.type;
  if (d.amount !== undefined) {
    updates.amountMinor = Math.round(d.amount * 100);
  }
  if (d.category !== undefined) updates.category = d.category;
  if (d.merchant !== undefined) updates.merchant = d.merchant;
  if (d.note !== undefined) updates.note = d.note;
  if (d.date !== undefined) updates.date = new Date(d.date);
  if (d.paymentMethod !== undefined) {
    updates.paymentMethod = d.paymentMethod;
  }

  const updated = await Transaction.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id
    },
    { $set: updates },
    {
      new: true,
      runValidators: true
    }
  );

  if (!updated) {
    return res.status(404).json({
      message: 'Transaction not found.'
    });
  }

  res.json({
    transaction: serialize(updated)
  });
}));

// DELETE: Delete an existing transaction
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid transaction ID.'
    });
  }

  const deleted = await Transaction.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!deleted) {
    return res.status(404).json({
      message: 'Transaction not found.'
    });
  }

  res.json({
    success: true,
    message: 'Transaction deleted successfully.'
  });
}));

export default router;

