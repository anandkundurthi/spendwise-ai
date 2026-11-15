
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    trim: true,
    default: '',
    maxlength: 20
  },

  avatarUrl: {
  type: String,
  trim: true,
  default: ''
},

avatarPublicId: {
  type: String,
  trim: true,
  default: ''
},

  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },

  monthlyIncome: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
