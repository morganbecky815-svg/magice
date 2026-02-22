const NFT = require('../models/NFT');
const User = require('../models/User');
const axios = require('axios');

// ========================
// IMPORT NFT FROM OPENSEA (Option 1: Manual Entry)
// ========================
exports.importFromOpenSea = async (req, res) => {
    try {
        const { contractAddress, tokenId, price } = req.body;
        
        if (!contractAddress || !tokenId) {
            return res.status(400).json({ 
                error: 'Contract address and token ID are required' 
            });
        }
        
        console.log(`🔍 Importing NFT from OpenSea: ${contractAddress}/${tokenId}`);
        
        // Fetch metadata from OpenSea API (no key needed for basic requests)
        const openseaUrl = `https://api.opensea.io/api/v2/chain/ethereum/contract/${contractAddress}/nfts/${tokenId}`;
        
        const response = await axios.get(openseaUrl, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.data || !response.data.nft) {
            return res.status(404).json({ error: 'NFT not found on OpenSea' });
        }
        
        const asset = response.data.nft;
        
        // Check if already imported
        const existingNFT = await NFT.findOne({
            'importMetadata.source': 'opensea',
            'importMetadata.contractAddress': contractAddress,
            'importMetadata.tokenId': tokenId
        });
        
        if (existingNFT) {
            return res.status(400).json({ 
                error: 'NFT already imported',
                nft: existingNFT
            });
        }
        
        // Generate unique token ID (using your existing format)
        const newTokenId = 'ME' + Date.now().toString(36).toUpperCase();
        
        // Extract image URL
        const imageUrl = asset.image_url || 
                        asset.image_original_url || 
                        asset.image_preview_url || 
                        '';
        
        // Create NFT using your existing schema
        const nft = new NFT({
            name: asset.name || `NFT #${tokenId}`,
            collectionName: asset.collection || 'Imported from OpenSea',
            description: asset.description || 'Imported from OpenSea',
            price: parseFloat(price) || 0.1,
            category: 'art', // Default, user can change later
            image: imageUrl,
            externalUrl: asset.external_url || '',
            owner: req.user._id,
            tokenId: newTokenId,
            isListed: true,
            
            // Add import metadata (these fields don't exist in your schema yet)
            // We'll store this in a way that doesn't break your schema
            cloudinaryId: `opensea_${contractAddress}_${tokenId}`,
            
            // Store import info in a way that works with your schema
            // You might want to add these fields to your schema later
            metadata: {
                format: asset.image_content_type || 'image',
                width: asset.image_width || 0,
                height: asset.image_height || 0,
                bytes: 0,
                importSource: 'opensea',
                contractAddress,
                tokenId,
                originalUrl: asset.permalink || `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
            }
        });
        
        await nft.save();
        
        // Update user's NFT count (if you track this)
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { nftCount: 1 }
        });
        
        const populatedNFT = await NFT.findById(nft._id)
            .populate('owner', 'email fullName');
        
        res.status(201).json({
            success: true,
            message: 'NFT imported successfully from OpenSea',
            nft: populatedNFT
        });
        
    } catch (error) {
        console.error('❌ OpenSea import error:', error);
        res.status(500).json({ 
            error: 'Failed to import from OpenSea',
            details: error.message 
        });
    }
};

// ========================
// IMPORT NFT FROM URL (Option 2: URL Parsing)
// ========================
exports.importFromUrl = async (req, res) => {
    try {
        const { url, price } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        console.log(`🔍 Importing NFT from URL: ${url}`);
        
        // Parse different marketplace URLs
        let contractAddress, tokenId, source;
        
        // OpenSea URL pattern
        const openseaRegex = /opensea\.io\/assets\/(?:[^\/]+\/)?([^\/]+)\/([^\/]+)/i;
        // Rarible URL pattern
        const raribleRegex = /rarible\.com\/token\/([^:]+):([^:]+):(\d+)/i;
        // LooksRare URL pattern
        const looksrareRegex = /looksrare\.org\/collections\/([^\/]+)\/(\d+)/i;
        
        if (openseaRegex.test(url)) {
            const match = url.match(openseaRegex);
            contractAddress = match[1];
            tokenId = match[2];
            source = 'opensea';
        } 
        else if (raribleRegex.test(url)) {
            const match = url.match(raribleRegex);
            contractAddress = match[2];
            tokenId = match[3];
            source = 'rarible';
        }
        else if (looksrareRegex.test(url)) {
            const match = url.match(looksrareRegex);
            contractAddress = match[1];
            tokenId = match[2];
            source = 'looksrare';
        }
        else {
            return res.status(400).json({ 
                error: 'Unsupported marketplace URL. Currently supported: OpenSea, Rarible, LooksRare' 
            });
        }
        
        if (!contractAddress || !tokenId) {
            return res.status(400).json({ error: 'Could not extract NFT details from URL' });
        }
        
        // Fetch metadata based on source
        let nftData;
        
        if (source === 'opensea') {
            const response = await axios.get(`https://api.opensea.io/api/v2/chain/ethereum/contract/${contractAddress}/nfts/${tokenId}`);
            nftData = response.data.nft;
        } else {
            // For other sources, you'd implement similar API calls
            return res.status(501).json({ 
                error: `${source} import not fully implemented yet. Please use OpenSea for now.` 
            });
        }
        
        // Check if already imported
        const existingNFT = await NFT.findOne({
            'metadata.importSource': source,
            'metadata.contractAddress': contractAddress,
            'metadata.tokenId': tokenId
        });
        
        if (existingNFT) {
            return res.status(400).json({ 
                error: 'NFT already imported',
                nft: existingNFT
            });
        }
        
        // Generate unique token ID
        const newTokenId = 'ME' + Date.now().toString(36).toUpperCase();
        
        // Extract image URL
        const imageUrl = nftData.image_url || 
                        nftData.image_original_url || 
                        nftData.image_preview_url || 
                        '';
        
        // Create NFT
        const nft = new NFT({
            name: nftData.name || `NFT #${tokenId}`,
            collectionName: nftData.collection || `Imported from ${source}`,
            description: nftData.description || `Imported from ${source}`,
            price: parseFloat(price) || 0.1,
            category: 'art',
            image: imageUrl,
            externalUrl: url,
            owner: req.user._id,
            tokenId: newTokenId,
            isListed: true,
            cloudinaryId: `${source}_${contractAddress}_${tokenId}`,
            metadata: {
                format: nftData.image_content_type || 'image',
                width: nftData.image_width || 0,
                height: nftData.image_height || 0,
                bytes: 0,
                importSource: source,
                contractAddress,
                tokenId,
                originalUrl: url
            }
        });
        
        await nft.save();
        
        // Update user's NFT count
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { nftCount: 1 }
        });
        
        const populatedNFT = await NFT.findById(nft._id)
            .populate('owner', 'email fullName');
        
        res.status(201).json({
            success: true,
            message: `NFT imported successfully from ${source}`,
            nft: populatedNFT
        });
        
    } catch (error) {
        console.error('❌ URL import error:', error);
        res.status(500).json({ 
            error: 'Failed to import from URL',
            details: error.message 
        });
    }
};

// ========================
// GET USER'S IMPORTED NFTS
// ========================
exports.getImportedNFTs = async (req, res) => {
    try {
        const nfts = await NFT.find({
            owner: req.user._id,
            'metadata.importSource': { $exists: true, $ne: null }
        }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: nfts.length,
            nfts
        });
    } catch (error) {
        console.error('Get imported NFTs error:', error);
        res.status(500).json({ error: 'Failed to fetch imported NFTs' });
    }
};