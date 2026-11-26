import cloudinary from '../config/cloudinary.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { fileTypeFromBuffer } from 'file-type';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import avatarUpload from '../middleware/avatarUpload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'spendwise-ai/avatars',
        resource_type: 'image',
        transformation: [
          { width: 512, height: 512, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });

const uploadsDirectory = fileURLToPath(
  new URL('../../uploads/', import.meta.url)
);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one profile field to update.' }
);

const makeToken = (user) =>
  jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const profileResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  avatarUrl: user.avatarUrl || '',
  currency: user.currency
});

const uploadAvatar = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (error) => {
    if (!error) return next();

    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;

    return res.status(status).json({
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'Profile photo must be 5 MB or smaller.'
        : error.message || 'Invalid image upload.'
    });
  });
};

router.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0].message
    });
  }

  const email = parsed.data.email.toLowerCase();

  if (await User.exists({ email })) {
    return res.status(409).json({
      message: 'An account with this email already exists.'
    });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await User.create({
    name: parsed.data.name,
    email,
    passwordHash
  });

  res.status(201).json({
    token: makeToken(user),
    user: profileResponse(user)
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Enter a valid email and password.'
    });
  }

  const user = await User.findOne({
    email: parsed.data.email.toLowerCase()
  }).select('+passwordHash');

  if (
    !user ||
    !(await bcrypt.compare(parsed.data.password, user.passwordHash))
  ) {
    return res.status(401).json({
      message: 'Email or password is incorrect.'
    });
  }

  res.json({
    token: makeToken(user),
    user: profileResponse(user)
  });
}));

router.patch('/profile', requireAuth, asyncHandler(async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0].message
    });
  }

  const updates = parsed.data;

  if (updates.name !== undefined) {
    req.user.name = updates.name;
  }

  if (updates.phone !== undefined) {
    req.user.phone = updates.phone;
  }

  await req.user.save();

  res.json({
    message: 'Profile updated successfully.',
    user: profileResponse(req.user)
  });
}));

router.post(
  '/profile/avatar',
  requireAuth,
  uploadAvatar,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: 'Please select a profile photo.'
      });
    }

    const detectedType = await fileTypeFromBuffer(req.file.buffer);

    const allowedExtensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    const extension = detectedType
      ? allowedExtensions[detectedType.mime]
      : null;

    if (!extension) {
      return res.status(400).json({
        message: 'Invalid image. Upload a genuine JPG, PNG or WebP file.'
      });
    }

    const previousAvatar = req.user.avatarUrl;
    const previousPublicId = req.user.avatarPublicId;

    const uploaded = await uploadToCloudinary(req.file.buffer);

    try {
      req.user.avatarUrl = uploaded.secure_url;
      req.user.avatarPublicId = uploaded.public_id;

      await req.user.save();
    } catch (error) {
      await cloudinary.uploader.destroy(uploaded.public_id, {
        resource_type: 'image',
        invalidate: true
      }).catch(() => {});

      throw error;
    }

    // Remove the previous Cloudinary image only after saving succeeds.
    if (previousPublicId && previousPublicId !== uploaded.public_id) {
      await cloudinary.uploader.destroy(previousPublicId, {
        resource_type: 'image',
        invalidate: true
      }).catch((error) => {
        console.error('Previous Cloudinary avatar cleanup failed:', error.message);
      });
    }

    // Preserve compatibility with older locally stored profile images.
    if (previousAvatar?.startsWith('/uploads/')) {
      const previousFilename = path.basename(previousAvatar);
      const previousPath = path.join(uploadsDirectory, previousFilename);

      await unlink(previousPath).catch(() => {});
    }

    res.json({
      message: 'Profile photo uploaded successfully.',
      user: profileResponse(req.user)
    });
  })
);

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: profileResponse(req.user)
  });
});

export default router;
