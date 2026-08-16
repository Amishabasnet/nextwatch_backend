const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { MAX_LOGIN_ATTEMPTS, LOCK_TIME_MS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    phone: {
      type:    String,
      trim:    true,
      default: '',
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: 6,
      select:    false,
    },
    consentGiven: {
      type:    Boolean,
      default: false,
    },
    consentDate: {
      type: Date,
    },
    role: {
      type:    String,
      enum:    ['user', 'admin'],
      default: 'user',
    },
    status: {
      type:    String,
      enum:    ['active', 'suspended'],
      default: 'active',
    },
    refreshTokens: {
      type:    [String],
      default: [],
      select:  false,
    },
    failedLoginAttempts: {
      type:    Number,
      default: 0,
      select:  false,
    },
    lockUntil: {
      type:    Date,
      default: null,
      select:  false,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// True while the account is currently locked out
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Call after a failed password attempt. Locks the account once the
// attempt count reaches MAX_LOGIN_ATTEMPTS, resetting the counter
// whenever a previous lock has already expired.
userSchema.methods.registerFailedLogin = async function () {
  // A previous lock has expired — start counting fresh
  if (this.lockUntil && this.lockUntil <= Date.now()) {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
  }

  this.failedLoginAttempts += 1;

  if (this.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
  }

  await this.save({ validateBeforeSave: false });
};

// Call after a successful login to clear any lockout state
userSchema.methods.registerSuccessfulLogin = async function () {
  if (this.failedLoginAttempts === 0 && !this.lockUntil) return;
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  await this.save({ validateBeforeSave: false });
};

const User = mongoose.model('User', userSchema);
module.exports = User;
