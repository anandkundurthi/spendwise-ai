import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: 'Please sign in to continue.'
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
  } catch {
    return res.status(401).json({
      message: 'Your session is invalid or has expired.'
    });
  }

  try {
    const user = await User.findById(payload.sub)
      .select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        message: 'Account not found.'
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
