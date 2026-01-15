// nft-detail.js - Handle NFT detail page functionality

console.log('🖼️ NFT Detail page JavaScript loaded');

// Global variables
let currentNFTId = null;
let currentNFT = null;
let ethPrice = 2500; // Default ETH price in USD

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 NFT Detail page initialized');
    
    // Get NFT ID from URL
    const path = window.location.pathname;
    const match = path.match(/\/nft\/([^\/]+)/);
    
    if (match && match[1]) {
        currentNFTId = match[1];
        console.log('📋 NFT ID:', currentNFTId);
        
        // Load ETH price first
        loadETHPrice().then(() => {
            // Then load NFT data
            loadNFT(currentNFTId);
        });
        
        setupEventListeners();
    } else {
        showError('Invalid NFT URL');
    }
});

// Setup event listeners
function setupEventListeners() {
    // Buy button
    const buyBtn = document.getElementById('buyBtn');
    const makeOfferBtn = document.getElementById('makeOfferBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    if (buyBtn) {
        buyBtn.addEventListener('click', buyNFT);
    }
    
    if (makeOfferBtn) {
        makeOfferBtn.addEventListener('click', makeOffer);
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', shareNFT);
    }
}

// Load ETH price for USD conversion
async function loadETHPrice() {
    try {
        const response = await fetch('/api/eth-price');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                ethPrice = data.price;
                console.log('💰 ETH Price loaded:', ethPrice);
            }
        }
    } catch (error) {
        console.error('Error loading ETH price:', error);
        // Use default price if API fails
    }
}

// Load NFT data
async function loadNFT(nftId) {
    try {
        showLoading();
        
        // Try to fetch NFT from API
        // Note: You need to create an API endpoint for this
        // For now, we'll use a mock approach
        
        const token = localStorage.getItem('token');
        const headers = token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : { 'Content-Type': 'application/json' };
        
        // Try your NFT endpoint - adjust if you have a different endpoint
        let response;
        
        // Try different possible endpoints
        const endpoints = [
            `/api/nft/${nftId}`,
            `/api/nfts/${nftId}`,
            `/api/user/nft/${nftId}`
        ];
        
        let data = null;
        
        for (const endpoint of endpoints) {
            try {
                response = await fetch(endpoint, { headers });
                if (response.ok) {
                    data = await response.json();
                    if (data.nft || data.success) {
                        break;
                    }
                }
            } catch (error) {
                console.log(`Endpoint ${endpoint} failed:`, error.message);
            }
        }
        
        // If no API endpoint works, try to get from user's NFTs
        if (!data || (!data.nft && !data.success)) {
            console.log('No direct NFT endpoint found, trying user NFTs...');
            data = await getNFTFromUserCollections(nftId);
        }
        
        if (data && (data.nft || (data.success && data.nfts))) {
            const nftData = data.nft || (data.nfts && data.nfts[0]) || data;
            currentNFT = nftData;
            displayNFT(nftData);
        } else {
            throw new Error('NFT not found');
        }
        
    } catch (error) {
        console.error('Error loading NFT:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Try to get NFT from user's collections
async function getNFTFromUserCollections(nftId) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user._id) {
        throw new Error('Please login to view NFT details');
    }
    
    try {
        // Get user's NFTs
        const response = await fetch(`/api/user/${user._id}/nfts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.nfts) {
                // Find the NFT by ID
                const nft = data.nfts.find(n => n._id === nftId);
                if (nft) {
                    return { nft: nft, success: true };
                }
            }
        }
        
        throw new Error('NFT not found in your collection');
        
    } catch (error) {
        throw new Error('Failed to load NFT: ' + error.message);
    }
}

// Display NFT data
function displayNFT(nft) {
    // Show content
    document.getElementById('nftContent').style.display = 'block';
    
    // Set NFT image
    const nftImage = document.getElementById('nftImage');
    nftImage.src = nft.image || '/images/default-nft.png';
    nftImage.alt = nft.name || 'NFT Image';
    
    // Set NFT name
    document.getElementById('nftName').textContent = nft.name || 'Unnamed NFT';
    
    // Set collection info
    const collectionInfo = document.getElementById('collectionInfo');
    collectionInfo.innerHTML = `
        <i class="fas fa-layer-group"></i>
        <span>${nft.collectionName || 'No Collection'}</span>
    `;
    
    // Set owner info - match explore.js format
const ownerInfo = document.getElementById('ownerInfo');
const ownerName = nft.owner?.fullName || nft.owner?.email || nft.ownerName || 'Unknown';
ownerInfo.innerHTML = `
    <i class="fas fa-user"></i>
    <span>Owned by <strong>${ownerName}</strong></span>
`;
    
    // Set price
    const price = nft.price || 0;
    document.getElementById('nftPrice').textContent = price.toFixed(2);
    
    // Calculate and display USD price
    const usdPrice = price * ethPrice;
    document.getElementById('usdPrice').textContent = `$${usdPrice.toFixed(2)} USD`;
    
    // Set token ID
    document.getElementById('tokenId').textContent = nft.tokenId || '#0000';
    
    // Set category
    document.getElementById('nftCategory').textContent = 
        (nft.category || 'Art').charAt(0).toUpperCase() + (nft.category || 'Art').slice(1);
    
    // Set royalty
    document.getElementById('royalty').textContent = `${nft.royalty || 5}%`;
    
    // Set dates
    if (nft.createdAt) {
        const createdDate = new Date(nft.createdAt);
        document.getElementById('createdAt').textContent = createdDate.toLocaleDateString();
    }
    
    if (nft.updatedAt) {
        const updatedDate = new Date(nft.updatedAt);
        document.getElementById('updatedAt').textContent = updatedDate.toLocaleDateString();
    }
    
    // Set description
    const description = document.getElementById('nftDescription');
    description.textContent = nft.description || 'No description provided.';
    
    // Set properties/traits
    displayProperties(nft.properties || nft.metadata || {});
    
    // Load activity
    loadNFTActivity(nft._id);
    
    // Update button states based on ownership
    updateButtonStates(nft);
}

// Display NFT properties/traits
function displayProperties(properties) {
    const propertiesGrid = document.getElementById('propertiesGrid');
    propertiesGrid.innerHTML = '';
    
    // If no properties, show message
    if (!properties || Object.keys(properties).length === 0) {
        propertiesGrid.innerHTML = `
            <div class="property-item" style="grid-column: 1 / -1; text-align: center;">
                <div class="property-type">No Properties</div>
                <div class="property-value">This NFT has no traits</div>
            </div>
        `;
        return;
    }
    
    // Add standard properties
    const standardProps = {
        'Rarity': 'Common',
        'Edition': '1/1',
        'Blockchain': 'Ethereum',
        'Format': 'Image'
    };
    
    // Combine with NFT properties
    const allProperties = { ...standardProps, ...properties };
    
    // Display each property
    for (const [key, value] of Object.entries(allProperties)) {
        // Skip if value is object or array
        if (typeof value === 'object' || Array.isArray(value)) {
            continue;
        }
        
        const propertyItem = document.createElement('div');
        propertyItem.className = 'property-item';
        propertyItem.innerHTML = `
            <div class="property-type">${key}</div>
            <div class="property-value">${value}</div>
        `;
        propertiesGrid.appendChild(propertyItem);
    }
}

// Load NFT activity
async function loadNFTActivity(nftId) {
    const activityList = document.getElementById('activityList');
    
    try {
        // Try to fetch activity for this NFT
        const response = await fetch(`/api/activity/nft/${nftId}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.activities && data.activities.length > 0) {
                displayActivity(data.activities);
                return;
            }
        }
        
        // If no specific activity, show marketplace activity
        const marketplaceResponse = await fetch('/api/activity/marketplace');
        
        if (marketplaceResponse.ok) {
            const marketplaceData = await marketplaceResponse.json();
            
            if (marketplaceData.success && marketplaceData.activities) {
                // Filter for this NFT or show general activity
                const filteredActivity = marketplaceData.activities.filter(activity => 
                    activity.metadata && activity.metadata.nftId === nftId
                );
                
                if (filteredActivity.length > 0) {
                    displayActivity(filteredActivity.slice(0, 5));
                } else {
                    showNoActivity();
                }
            } else {
                showNoActivity();
            }
        } else {
            showNoActivity();
        }
        
    } catch (error) {
        console.error('Error loading activity:', error);
        showNoActivity();
    }
}

// Display activity
function displayActivity(activities) {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const iconMap = {
            'nft_created': { icon: 'fas fa-plus-circle', color: '#9C27B0' },
            'nft_purchased': { icon: 'fas fa-shopping-cart', color: '#4CAF50' },
            'nft_sold': { icon: 'fas fa-tag', color: '#FF9800' },
            'nft_listed': { icon: 'fas fa-list', color: '#2196F3' },
            'bid_placed': { icon: 'fas fa-gavel', color: '#FF5722' },
            'default': { icon: 'fas fa-history', color: '#6c63ff' }
        };
        
        const iconInfo = iconMap[activity.type] || iconMap.default;
        const time = new Date(activity.createdAt).toLocaleString();
        
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="${iconInfo.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title || 'Activity'}</div>
                <div class="activity-description">${activity.description || ''}</div>
                <div class="activity-time">${time}</div>
            </div>
        `;
        
        activityList.appendChild(activityItem);
    });
}

// Show no activity message
function showNoActivity() {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = `
        <div class="activity-placeholder">
            <i class="fas fa-history"></i>
            <p>No activity yet for this NFT</p>
        </div>
    `;
}

// Update button states based on ownership
function updateButtonStates(nft) {
    const buyBtn = document.getElementById('buyBtn');
    const makeOfferBtn = document.getElementById('makeOfferBtn');
    
    // Check if current user is the owner
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (nft.owner && user._id && nft.owner.toString() === user._id) {
        // User owns this NFT
        if (buyBtn) {
            buyBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Listing';
            buyBtn.onclick = editNFT;
        }
        
        if (makeOfferBtn) {
            makeOfferBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
            makeOfferBtn.onclick = removeNFT;
            makeOfferBtn.className = 'btn btn-secondary';
        }
    } else {
        // User doesn't own this NFT
        if (buyBtn) {
            buyBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Buy Now';
            buyBtn.onclick = buyNFT;
        }
        
        if (makeOfferBtn) {
            makeOfferBtn.innerHTML = '<i class="fas fa-tag"></i> Make Offer';
            makeOfferBtn.onclick = makeOffer;
        }
    }
}

// Action functions
function buyNFT() {
    if (!currentNFT) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to purchase NFTs');
        window.location.href = '/login';
        return;
    }
    
    if (confirm(`Buy "${currentNFT.name}" for ${currentNFT.price || 0} WETH?`)) {
        alert('Purchase feature coming soon!');
        // In the future: Call API to purchase NFT
    }
}

function makeOffer() {
    if (!currentNFT) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to make offers');
        window.location.href = '/login';
        return;
    }
    
    const offerAmount = prompt(`Make offer for "${currentNFT.name}" (Current price: ${currentNFT.price || 0} WETH)\n\nEnter your offer amount in WETH:`);
    
    if (offerAmount && !isNaN(offerAmount)) {
        alert(`Offer of ${offerAmount} WETH submitted! (Feature coming soon)`);
        // In the future: Call API to submit offer
    }
}

function shareNFT() {
    if (!currentNFT) return;
    
    const url = window.location.href;
    const text = `Check out "${currentNFT.name}" on Magic Eden!`;
    
    if (navigator.share) {
        navigator.share({
            title: currentNFT.name,
            text: text,
            url: url
        });
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(`${text}\n${url}`)
            .then(() => alert('Link copied to clipboard!'))
            .catch(() => prompt('Copy this link:', url));
    }
}

function editNFT() {
    if (!currentNFT) return;
    
    alert('Edit NFT feature coming soon!');
    // In the future: Redirect to edit page
    // window.location.href = `/nft/${currentNFT._id}/edit`;
}

function removeNFT() {
    if (!currentNFT) return;
    
    if (confirm(`Are you sure you want to remove "${currentNFT.name}" from marketplace?`)) {
        alert('Remove NFT feature coming soon!');
        // In the future: Call API to remove NFT
    }
}

// Show loading state
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('nftContent').style.display = 'none';
}

// Hide loading state
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show error state
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('nftContent').style.display = 'none';
    
    const errorText = document.querySelector('#errorState p');
    if (errorText && message) {
        errorText.textContent = message;
    }
}

// Make functions available globally
window.buyNFT = buyNFT;
window.makeOffer = makeOffer;
window.shareNFT = shareNFT;
window.editNFT = editNFT;