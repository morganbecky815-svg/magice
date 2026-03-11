const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"]
    },

    fullName: {
      type: String,
      trim: true,
      default: ""
    },

    // ===== CUSTODIAL WALLET FIELDS =====
    depositAddress: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    
    encryptedPrivateKey: {
      type: String,
      select: false,
    },
    
    // Internal balance (ETH)
    internalBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // WETH Balance for wrapped ETH
    wethBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    
    lastSweptAt: {
      type: Date
    },
    
    lastSweepAmount: {
      type: Number
    },
    
    lastSweepTxHash: {
      type: String
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"]
    },

    nftCount: {
      type: Number,
      default: 0,
      min: 0
    },

    profileImage: {
      type: String,
      default: ""
    },

    isAdmin: {
      type: Boolean,
      default: false
    },

    // ========== UPDATED: Verification Fields ==========
    isVerified: {
      type: Boolean,
      default: false // Changed from true to false - new users start unverified
    },
    
    // When the user was verified
    verifiedAt: {
      type: Date
    },
    
    // Which admin verified this user
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Badge type for visual representation
    verificationBadge: {
      type: String,
      enum: ['none', 'basic', 'premium', 'business'],
      default: 'none'
    },
    
    // Optional: Verification expiry (if you want to require re-verification)
    verificationExpiresAt: {
      type: Date
    },
    
    // Track verification status changes
    verificationHistory: [{
      status: {
        type: String,
        enum: ['pending', 'verified', 'revoked', 'expired']
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      note: String,
      badgeType: {
        type: String,
        enum: ['none', 'basic', 'premium', 'business']
      }
    }],
    // ========== END UPDATED ==========

    lastLogin: {
      type: Date
    },

    twitter: {
      type: String,
      trim: true,
      default: ""
    },

    website: {
      type: String,
      trim: true,
      default: ""
    },

    totalTrades: {
      type: Number,
      default: 0
    },

    totalVolume: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Password hashing middleware
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ========== NEW: Helper methods for verification ==========
// Check if user is verified and not expired
userSchema.methods.isVerifiedAndValid = function() {
  if (!this.isVerified) return false;
  if (this.verificationExpiresAt && this.verificationExpiresAt < new Date()) {
    return false;
  }
  return true;
};

// Get badge icon based on badge type
userSchema.methods.getBadgeIcon = function() {
  switch(this.verificationBadge) {
    case 'basic': return '✓';
    case 'premium': return '⭐';
    case 'business': return '💼';
    default: return '';
  }
};

// Get badge color based on badge type
userSchema.methods.getBadgeColor = function() {
  switch(this.verificationBadge) {
    case 'basic': return '#10b981'; // green
    case 'premium': return '#8a2be2'; // purple
    case 'business': return '#3b82f6'; // blue
    default: return '#888';
  }
};
// ========== END NEW ==========

// To JSON transform
userSchema.set("toJSON", {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    delete ret.encryptedPrivateKey;
    delete ret.verificationHistory; // Hide history from public API
    return ret;
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
