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

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"]
    },

    balance: {
      type: Number,
      default: 0,
      min: 0
    },

    ethBalance: {
      type: Number,
      default: 0,
      min: 0
    },

    wethBalance: {
      type: Number,
      default: 0,
      min: 0
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

    // Social links (optional)
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

    // Wallet address (for crypto)
    walletAddress: {
      type: String,
      trim: true,
      default: ""
    },

    // Activity stats
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
    timestamps: true // This automatically adds createdAt and updatedAt
  }
);

// ========== VIRTUAL FIELDS ==========
// Get registration date (from createdAt)
userSchema.virtual('joinDate').get(function() {
  return this.createdAt;
});

// Get formatted display name
userSchema.virtual('displayName').get(function() {
  return this.fullName || this.email.split('@')[0];
});

// ========== PASSWORD HASHING ==========
userSchema.pre("save", async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return;
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw new Error("Error hashing password");
  }
});

// ========== PASSWORD COMPARISON METHOD ==========
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Error comparing passwords");
  }
};

// ========== TO JSON TRANSFORM ==========
// Remove password when converting to JSON
userSchema.set("toJSON", {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

// ========== CREATE MODEL ==========
const User = mongoose.model("User", userSchema);

module.exports = User;