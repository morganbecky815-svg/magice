const axios = require('axios');

class MoralisService {
    constructor() {
        this.apiKey = process.env.MORALIS_API_KEY;
        this.baseUrl = 'https://deep-index.moralis.io/api/v2.2';
        
        // List of reliable IPFS gateways (in order of preference)
        this.ipfsGateways = [
            'https://ipfs.io/ipfs/{cid}',
            'https://gateway.pinata.cloud/ipfs/{cid}',
            'https://cloudflare-ipfs.com/ipfs/{cid}',
            'https://dweb.link/ipfs/{cid}',
            'https://w3s.link/ipfs/{cid}',
            'https://4everland.io/ipfs/{cid}',
            'https://cf-ipfs.com/ipfs/{cid}'
        ];
        
        // Cache for working gateways to speed up subsequent requests
        this.workingGateways = new Map();
    }

    async fetchNFTs(walletAddress) {
        try {
            console.log(`🔍 Fetching NFTs for wallet: ${walletAddress}`);
            
            const response = await axios.get(
                `${this.baseUrl}/${walletAddress}/nft`,
                {
                    headers: {
                        'X-API-Key': this.apiKey,
                        'Accept': 'application/json'
                    },
                    params: {
                        chain: 'eth',
                        format: 'decimal',
                        limit: 50,
                        normalizeMetadata: true,
                        media_items: true
                    }
                }
            );

            if (!response.data || !response.data.result) {
                console.log('⚠️ No NFTs found in response');
                return [];
            }

            console.log(`✅ Found ${response.data.result.length} NFTs`);

            return response.data.result.map(nft => this.formatNFT(nft));

        } catch (error) {
            console.error('❌ Moralis error:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return [];
        }
    }

    async fetchSingleNFT(contractAddress, tokenId) {
        try {
            console.log(`🔍 Fetching single NFT: ${contractAddress}/${tokenId}`);
            
            const response = await axios.get(
                `${this.baseUrl}/nft/${contractAddress}/${tokenId}`,
                {
                    headers: {
                        'X-API-Key': this.apiKey,
                        'Accept': 'application/json'
                    },
                    params: {
                        chain: 'eth',
                        format: 'decimal',
                        normalizeMetadata: true,
                        media_items: true
                    }
                }
            );

            if (!response.data) {
                return null;
            }

            return this.formatNFT(response.data);

        } catch (error) {
            console.error('❌ Error fetching single NFT:', error.message);
            return null;
        }
    }

    // Extract CID from various URL formats
    extractCID(url) {
        if (!url) return null;
        
        // Handle ipfs:// protocol
        if (url.startsWith('ipfs://')) {
            return url.replace('ipfs://', '');
        }
        
        // Handle /ipfs/ in URL path
        const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]{46,})/);
        if (ipfsMatch) {
            return ipfsMatch[1];
        }
        
        // Handle ipfs.io gateway URLs
        const ipfsIoMatch = url.match(/ipfs\.io\/ipfs\/([a-zA-Z0-9]{46,})/);
        if (ipfsIoMatch) {
            return ipfsIoMatch[1];
        }
        
        return null;
    }

    // Get multiple gateway URLs for an IPFS CID
    getGatewayUrls(cid) {
        if (!cid) return [];
        return this.ipfsGateways.map(template => template.replace('{cid}', cid));
    }

    // Check if a URL is accessible (with timeout)
    async isUrlAccessible(url, timeout = 3000) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, { 
                method: 'HEAD',
                signal: controller.signal 
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Get the best available image URL with fallbacks
    async getBestImageUrl(nft, metadata) {
        const imageSources = [];
        
        // Priority 1: Moralis generated media collection
        if (nft.media?.media_collection) {
            const media = nft.media.media_collection;
            imageSources.push({
                url: media.high?.url || media.medium?.url || media.low?.url,
                type: 'media_collection',
                priority: 1
            });
        }

        // Priority 2: Original media URL
        if (nft.media?.original_media_url) {
            imageSources.push({
                url: nft.media.original_media_url,
                type: 'original_media',
                priority: 2
            });
        }

        // Priority 3: Direct image fields
        const directFields = [
            nft.image_url,
            nft.image_original_url,
            nft.image_preview_url,
            nft.image_thumbnail_url
        ];
        
        for (const field of directFields) {
            if (field) {
                imageSources.push({
                    url: field,
                    type: 'direct_field',
                    priority: 3
                });
            }
        }

        // Priority 4: Metadata image
        if (metadata?.image) {
            imageSources.push({
                url: metadata.image,
                type: 'metadata.image',
                priority: 4
            });
        }

        // Sort by priority
        imageSources.sort((a, b) => a.priority - b.priority);

        // Try each source until one works
        for (const source of imageSources) {
            const url = source.url;
            
            // Handle IPFS URLs specially
            if (url.includes('ipfs://') || url.includes('/ipfs/')) {
                const cid = this.extractCID(url);
                if (cid) {
                    const gatewayUrls = this.getGatewayUrls(cid);
                    
                    // Try each gateway
                    for (const gatewayUrl of gatewayUrls) {
                        console.log(`🔍 Testing gateway: ${gatewayUrl}`);
                        
                        // Check if we already know this gateway works for this CID
                        const cacheKey = `${cid}_${gatewayUrl}`;
                        if (this.workingGateways.has(cacheKey)) {
                            console.log(`✅ Using cached working gateway: ${gatewayUrl}`);
                            return gatewayUrl;
                        }
                        
                        // Test the gateway
                        const isAccessible = await this.isUrlAccessible(gatewayUrl);
                        if (isAccessible) {
                            console.log(`✅ Gateway works: ${gatewayUrl}`);
                            this.workingGateways.set(cacheKey, true);
                            return gatewayUrl;
                        } else {
                            console.log(`❌ Gateway failed: ${gatewayUrl}`);
                        }
                    }
                }
            }
            
            // For non-IPFS URLs, test if accessible
            if (url.startsWith('http')) {
                console.log(`🔍 Testing URL: ${url.substring(0, 100)}...`);
                const isAccessible = await this.isUrlAccessible(url);
                if (isAccessible) {
                    console.log(`✅ URL accessible: ${url.substring(0, 100)}...`);
                    return url;
                } else {
                    console.log(`❌ URL not accessible: ${url.substring(0, 100)}...`);
                    
                    // If it's an S3 URL that failed, try to find IPFS alternative
                    if (url.includes('s3.amazonaws.com') && metadata?.image?.startsWith('ipfs://')) {
                        const cid = this.extractCID(metadata.image);
                        if (cid) {
                            const gatewayUrls = this.getGatewayUrls(cid);
                            for (const gatewayUrl of gatewayUrls) {
                                const isAccessible = await this.isUrlAccessible(gatewayUrl);
                                if (isAccessible) {
                                    console.log(`✅ IPFS fallback works: ${gatewayUrl}`);
                                    return gatewayUrl;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Final fallback - random image from picsum
        console.log('⚠️ No working image found, using fallback');
        return 'https://picsum.photos/300/200?random=1';
    }

    formatNFT(nft) {
        // Parse metadata if it's a string
        let metadata = nft.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch (e) {
                metadata = {};
            }
        }

        // Get collection name from various possible locations
        const collectionName = nft.collection_name || 
                              nft.collection?.name || 
                              metadata?.collection?.name || 
                              metadata?.collection || 
                              'Unknown Collection';

        // Return NFT data with image URL (will be resolved asynchronously)
        return {
            name: nft.name || metadata?.name || `NFT #${nft.token_id || nft.tokenId}`,
            description: metadata?.description || '',
            image: null, // Will be populated asynchronously
            collection: collectionName,
            contract: nft.token_address || nft.contract,
            tokenId: nft.token_id || nft.tokenId,
            marketplace: 'moralis',
            price: 0,
            metadata: metadata,
            // Store raw data for async image resolution
            _rawData: {
                nft,
                metadata
            }
        };
    }

    // Async method to resolve image URL for an NFT
    async resolveImageUrl(nftData) {
        const { nft, metadata } = nftData._rawData;
        const imageUrl = await this.getBestImageUrl(nft, metadata);
        return {
            ...nftData,
            image: imageUrl
        };
    }

    normalizeUrl(url) {
        if (!url) return null;
        
        // Handle IPFS URLs
        if (url.startsWith('ipfs://')) {
            return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        
        // Handle Arweave URLs
        if (url.startsWith('ar://')) {
            return url.replace('ar://', 'https://arweave.net/');
        }
        
        return url;
    }

    isImageProcessing(nft) {
        return nft.media?.status === 'processing';
    }

    getImageStatusMessage(nft) {
        const status = nft.media?.status;
        
        switch(status) {
            case 'processing':
                return 'Image preview is being generated. It will appear soon.';
            case 'success':
                return 'Image available';
            case 'invalid_url':
                return 'Invalid image URL';
            case 'timeout':
                return 'Image generation timed out';
            default:
                return 'Image status unknown';
        }
    }
}

module.exports = new MoralisService();