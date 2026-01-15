const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Collection name is required'],
        trim: true,
        minlength: [3, 'Collection name must be at least 3 characters'],
        maxlength: [100, 'Collection name cannot exceed 100 characters']
    },
    description: {
        type: String,
        default: '',
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    featuredImage: {
        type: String,
        default: '/images/default-collection.png'
    },
    bannerImage: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        default: 'art',
        enum: ['art', 'photography', 'gaming', 'music', 'collectibles', 'sports', 'pfp', 'utility']
    },
    nfts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NFT'
    }],
    nftCount: {
        type: Number,
        default: 0
    },
    floorPrice: {
        type: Number,
        default: 0
    },
    totalVolume: {
        type: Number,
        default: 0
    },
    website: {
        type: String,
        default: ''
    },
    twitter: {
        type: String,
        default: ''
    },
    discord: {
        type: String,
        default: ''
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    }
}, {
    timestamps: true
});

// Generate slug before saving
collectionSchema.pre('save', function(next) {
    if (!this.slug) {
        const timestamp = Date.now().toString().slice(-6);
        const nameSlug = this.name
            .toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '-');
        this.slug = `${nameSlug}-${timestamp}`;
    }
    next();
});

// Update NFT count virtual
collectionSchema.virtual('formattedNFTCount').get(function() {
    return this.nftCount === 1 ? '1 NFT' : `${this.nftCount} NFTs`;
});

// Update floor price virtual
collectionSchema.virtual('formattedFloorPrice').get(function() {
    return this.floorPrice > 0 ? `${this.floorPrice} WETH` : 'No floor price';
});

// Method to add NFT to collection
collectionSchema.methods.addNFT = async function(nftId) {
    if (!this.nfts.includes(nftId)) {
        this.nfts.push(nftId);
        this.nftCount = this.nfts.length;
        await this.save();
    }
};

// Method to remove NFT from collection
collectionSchema.methods.removeNFT = async function(nftId) {
    this.nfts = this.nfts.filter(id => id.toString() !== nftId.toString());
    this.nftCount = this.nfts.length;
    await this.save();
};

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;