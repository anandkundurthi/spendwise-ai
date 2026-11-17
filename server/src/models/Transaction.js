
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer'],
    required: true
  },
  amountMinor: {
    type: Number,
    required: true,
    min: 1,
    max: 10000000000
  },
  currency: {
    type: String,
    default: 'INR'
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  merchant: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Cash', 'Card', 'Bank transfer', 'Other'],
    default: 'Other'
  },
  source: {
    type: String,
    enum: ['manual', 'statement', 'receipt'],
    default: 'manual'
  },
  importFingerprint: {
    type: String,
    default: null
  }
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });

transactionSchema.index(
  { user: 1, importFingerprint: 1 },
  {
    unique: true,
    partialFilterExpression: {
      importFingerprint: { $type: 'string' }
    }
  }
);

export default mongoose.model('Transaction', transactionSchema);
