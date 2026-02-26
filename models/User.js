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

// To JSON transform
userSchema.set("toJSON", {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    delete ret.encryptedPrivateKey;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
