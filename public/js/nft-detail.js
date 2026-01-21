// nft-detail.js - Handle NFT detail page functionality

console.log('🖼️ NFT Detail page JavaScript loaded');

// Global variables
let currentNFTId = null;
let currentNFT = null;
let ethPrice = 2500; // Default ETH price in USD
let isPurchasing = false;

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
        
        const token = localStorage.getItem('token');
        const headers = token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : { 'Content-Type': 'application/json' };
        
        // Fetch NFT from API
        const response = await fetch(`/api/nft/${nftId}`, { headers });
        
        if (!response.ok) {
            throw new Error('NFT not found or access denied');
        }
        
        const data = await response.json();
        
        if (data.success && data.nft) {
            currentNFT = data.nft;
            displayNFT(data.nft);
        } else {
            throw new Error('NFT data not available');
        }
        
    } catch (error) {
        console.error('Error loading NFT:', error);
        showError(error.message);
    } finally {
        hideLoading();
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
    
    // Set owner info
    const ownerInfo = document.getElementById('ownerInfo');
    const ownerName = nft.owner?.fullName || nft.owner?.email || 'Unknown';
    ownerInfo.innerHTML = `
        <i class="fas fa-user"></i>
        <span>Owned by <strong>${ownerName}</strong></span>
    `;
    
    // Set price
    const price = nft.price || 0;
    document.getElementById('nftPrice').textContent = price.toFixed(4);
    
    // Calculate and display USD price
    const usdPrice = price * ethPrice;
    document.getElementById('usdPrice').textContent = `$${usdPrice.toFixed(2)} USD`;
    
    // Set token ID
    document.getElementById('tokenId').textContent = nft.tokenId || `#${nft._id.slice(-4)}`;
    
    // Set category
    document.getElementById('nftCategory').textContent = 
        (nft.category || 'Art').charAt(0).toUpperCase() + (nft.category || 'Art').slice(1);
    
    // Set royalty (default 5%)
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
    
    // Update button states based on ownership
    updateButtonStates(nft);
}

// Update button states based on ownership
function updateButtonStates(nft) {
    const buyBtn = document.getElementById('buyBtn');
    const makeOfferBtn = document.getElementById('makeOfferBtn');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Check if current user is the owner
    if (nft.owner && user._id && (nft.owner._id === user._id || nft.owner.toString() === user._id)) {
        // User owns this NFT
        if (buyBtn) {
            buyBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Listing';
            buyBtn.onclick = editNFT;
            buyBtn.disabled = false;
        }
        
        if (makeOfferBtn) {
            makeOfferBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
            makeOfferBtn.onclick = removeNFT;
            makeOfferBtn.className = 'btn btn-secondary';
            makeOfferBtn.disabled = false;
        }
    } else {
        // User doesn't own this NFT
        if (buyBtn) {
            buyBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Buy Now';
            buyBtn.onclick = buyNFT;
            buyBtn.disabled = !nft.isListed;
            
            if (!nft.isListed) {
                buyBtn.title = 'This NFT is not for sale';
                buyBtn.style.opacity = '0.5';
                buyBtn.style.cursor = 'not-allowed';
            }
        }
        
        if (makeOfferBtn) {
            makeOfferBtn.innerHTML = '<i class="fas fa-tag"></i> Make Offer';
            makeOfferBtn.onclick = makeOffer;
            makeOfferBtn.disabled = !nft.isListed;
        }
    }
}

// ========================
// PURCHASE NFT FUNCTION
// ========================
async function buyNFT() {
    if (isPurchasing) return;
    
    if (!currentNFT) {
        alert('NFT data not loaded');
        return;
    }
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user._id) {
        alert('Please login to purchase NFTs');
        window.location.href = '/login';
        return;
    }
    
    // Check if NFT is listed for sale
    if (!currentNFT.isListed) {
        alert('This NFT is not for sale');
        return;
    }
    
    // Check if user is trying to buy their own NFT
    if (currentNFT.owner && user._id && 
        (currentNFT.owner._id === user._id || currentNFT.owner.toString() === user._id)) {
        alert('You cannot buy your own NFT');
        return;
    }
    
    // Get user's balance for confirmation
    const userBalance = user.wethBalance || user.balance || 0;
    const price = currentNFT.price || 0;
    
    if (userBalance < price) {
        alert(`Insufficient balance!\n\nYour balance: ${userBalance.toFixed(4)} WETH\nNFT price: ${price.toFixed(4)} WETH\n\nPlease add more WETH to your balance.`);
        return;
    }
    
    // Confirm purchase
    const confirmPurchase = confirm(
        `Buy "${currentNFT.name}" for ${price.toFixed(4)} WETH?\n\n` +
        `Your balance: ${userBalance.toFixed(4)} WETH\n` +
        `After purchase: ${(userBalance - price).toFixed(4)} WETH`
    );
    
    if (!confirmPurchase) return;
    
    isPurchasing = true;
    const buyBtn = document.getElementById('buyBtn');
    const originalText = buyBtn.innerHTML;
    buyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    buyBtn.disabled = true;
    
    try {
        console.log('🛒 Starting purchase process...');
        
        const response = await fetch(`/api/nft/${currentNFT._id}/purchase`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Purchase successful
            alert(`✅ Purchase Successful!\n\nYou bought "${currentNFT.name}" for ${price.toFixed(4)} WETH!`);
            
            // Update user balance in localStorage
            if (data.user) {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                storedUser.wethBalance = data.user.wethBalance;
                storedUser.balance = data.user.balance;
                localStorage.setItem('user', JSON.stringify(storedUser));
            }
            
            // Update button states (user now owns the NFT)
            updateButtonStates({
                ...currentNFT,
                owner: user._id,
                isListed: false
            });
            
            // Refresh the page after a short delay
            setTimeout(() => {
                location.reload();
            }, 1500);
            
        } else {
            // Purchase failed
            const errorMsg = data.error || 'Purchase failed. Please try again.';
            const details = data.details || '';
            
            alert(`❌ Purchase Failed\n\n${errorMsg}\n${details}`);
            
            buyBtn.innerHTML = originalText;
            buyBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Purchase error:', error);
        alert('❌ Network error. Please check your connection and try again.');
        
        buyBtn.innerHTML = originalText;
        buyBtn.disabled = false;
        
    } finally {
        isPurchasing = false;
    }
}

// Make Offer function
function makeOffer() {
    if (!currentNFT) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to make offers');
        window.location.href = '/login';
        return;
    }
    
    const currentPrice = currentNFT.price || 0;
    const offerAmount = prompt(
        `Make offer for "${currentNFT.name}"\n\n` +
        `Current price: ${currentPrice.toFixed(4)} WETH\n` +
        `Your WETH balance: ${(JSON.parse(localStorage.getItem('user') || '{}').wethBalance || 0).toFixed(4)} WETH\n\n` +
        `Enter your offer amount in WETH:`
    );
    
    if (offerAmount && !isNaN(offerAmount) && parseFloat(offerAmount) > 0) {
        const amount = parseFloat(offerAmount);
        
        // Validate offer amount
        if (amount > (currentPrice * 2)) {
            alert('⚠️ Offer seems too high! Are you sure?');
        }
        
        // In a real app, you would submit this to your backend
        alert(`Offer of ${amount.toFixed(4)} WETH submitted!\n\nFeature coming soon - this will create a pending offer.`);
        
    } else if (offerAmount !== null) {
        alert('Please enter a valid amount');
    }
}

// Share NFT function
function shareNFT() {
    if (!currentNFT) return;
    
    const url = window.location.href;
    const text = `Check out "${currentNFT.name}" on Magic Eden! Price: ${(currentNFT.price || 0).toFixed(4)} WETH`;
    
    if (navigator.share) {
        navigator.share({
            title: currentNFT.name,
            text: text,
            url: url
        }).catch(err => {
            console.log('Share cancelled:', err);
        });
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(`${text}\n${url}`)
            .then(() => {
                alert('✅ Link copied to clipboard!');
            })
            .catch(() => {
                // Show text to copy
                prompt('Copy this link:', url);
            });
    }
}

// Edit NFT function (for owners)
function editNFT() {
    if (!currentNFT) return;
    
    const editUrl = `/edit-nft/${currentNFT._id}`;
    window.location.href = editUrl;
}

// Remove NFT function (for owners)
async function removeNFT() {
    if (!currentNFT) return;
    
    const confirmRemove = confirm(
        `Are you sure you want to remove "${currentNFT.name}" from marketplace?\n\n` +
        `This will unlist the NFT but you will still own it.`
    );
    
    if (!confirmRemove) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        // Call your API to unlist the NFT
        const response = await fetch(`/api/nft/${currentNFT._id}/unlist`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('✅ NFT removed from marketplace!');
            location.reload();
        } else {
            alert('❌ Failed to remove NFT');
        }
        
    } catch (error) {
        console.error('Remove error:', error);
        alert('❌ Error removing NFT');
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