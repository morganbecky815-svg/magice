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

    // System-generated wallet address (for identification)
    systemWalletAddress: {
      type: String,
      unique: true,
      sparse: true, // Changed from required: true to allow existing users to be null
      default: function() {
        return generateWalletAddress();
      }
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

    walletAddress: {
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

// ===== Helper function to generate a unique wallet address =====
function generateWalletAddress() {
  // Format: 0x + 40 random hex characters (like Ethereum address)
  const prefix = '0x';
  const characters = '0123456789abcdef';
  let address = prefix;
  
  for (let i = 0; i < 40; i++) {
    address += characters[Math.floor(Math.random() * 16)];
  }
  
  return address;
}

// ===== WALLET ADDRESS MIDDLEWARE - NO next() PARAMETER =====
// This runs before saving to ensure wallet address is unique
userSchema.pre('save', async function() {
  console.log('🔵 Pre-save middleware: Checking wallet address');
  
  // Only generate wallet address for new users or if it's missing
  if (this.isNew || !this.systemWalletAddress) {
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    let walletAddress = this.systemWalletAddress || generateWalletAddress();
    
    while (!isUnique && attempts < maxAttempts) {
      // Check if wallet address already exists
      const existingUser = await mongoose.model('User').findOne({ 
        systemWalletAddress: walletAddress 
      });
      
      if (!existingUser) {
        this.systemWalletAddress = walletAddress;
        isUnique = true;
        console.log('✅ Unique wallet address generated:', walletAddress);
      } else {
        // Generate new address if not unique
        walletAddress = generateWalletAddress();
        attempts++;
        console.log(`⚠️ Wallet address collision, retry ${attempts}`);
      }
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique wallet address after 10 attempts');
    }
  }
});

// ===== PASSWORD HASHING MIDDLEWARE - NO next() PARAMETER =====
// This runs before saving to hash the password
userSchema.pre('save', async function() {
  console.log('🔵 Pre-save middleware: Checking password');
  
  // Only hash if password is modified
  if (!this.isModified('password')) {
    console.log('🟡 Password not modified, skipping hash');
    return;
  }
  
  try {
    console.log('🟡 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
  } catch (error) {
    console.error('🔴 Error hashing password:', error);
    throw error; // Throw error instead of passing to next()
  }
});

// ===== UPDATE TIMESTAMP MIDDLEWARE - NO next() PARAMETER =====
// This runs before updating to refresh the updatedAt field
userSchema.pre('findOneAndUpdate', function() {
  console.log('🔵 Pre-update middleware: Updating timestamp');
  this.set({ updatedAt: new Date() });
});

// ===== PASSWORD COMPARISON METHOD =====
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🟣 Comparing passwords...');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('🔴 Compare password error:', error);
    throw new Error("Password comparison failed");
  }
};

// ===== TO JSON TRANSFORM =====
userSchema.set("toJSON", {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

// ===== CREATE MODEL =====
const User = mongoose.model("User", userSchema);

module.exports = User;