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

    // ===== NEW CUSTODIAL WALLET FIELDS =====
    // User's unique deposit address (public) - REAL Ethereum address
    depositAddress: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    
    // ENCRYPTED private key - NEVER expose this
    encryptedPrivateKey: {
      type: String,
      select: false, // Don't return in queries by default
    },
    
    // Internal balance (what user sees in your platform)
    internalBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Track when funds were last swept
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

    isVerified: {
      type: Boolean,
      default: true
    },

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

// ===== PASSWORD HASHING MIDDLEWARE =====
userSchema.pre('save', async function() {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return;
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// ===== PASSWORD COMPARISON METHOD =====
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ===== TO JSON TRANSFORM =====
userSchema.set("toJSON", {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    delete ret.encryptedPrivateKey; // Never expose private key
    return ret;
  }
});

// ===== CREATE MODEL =====
const User = mongoose.model("User", userSchema);

module.exports = User;