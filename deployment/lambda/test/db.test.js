import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

test('concurrent calls share one MongoDB connection attempt', async (t) => {
  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

  let resolveConnection;
  let calls = 0;

  const originalConnect = mongoose.connect;

  mongoose.connect = () => {
    calls++;
    return new Promise((resolve) => {
      resolveConnection = resolve;
    });
  };

  try {
    const first = connectDB();
    const second = connectDB();

    assert.equal(calls, 1);

    resolveConnection();
    await Promise.all([first, second]);

    assert.equal(calls, 1);
  } finally {
    mongoose.connect = originalConnect;

    if (originalUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalUri;
    }
  }
});

test('failed connection attempts can be retried', async () => {
  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

  const originalConnect = mongoose.connect;
  let calls = 0;

  mongoose.connect = async () => {
    calls++;

    if (calls === 1) {
      throw new Error('Simulated connection failure');
    }

    return mongoose;
  };

  try {
    await assert.rejects(connectDB(), /Simulated connection failure/);
    await connectDB();

    assert.equal(calls, 2);
  } finally {
    mongoose.connect = originalConnect;

    if (originalUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalUri;
    }
  }
});
