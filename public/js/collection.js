// collection.js - Handle collection page functionality

console.log('📦 Collection page JavaScript loaded');

// Global variables
let currentCollectionId = null;
let currentCollection = null;
let userNFTs = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Collection page initialized');
    
    // Get collection ID from URL
    const path = window.location.pathname;
    const match = path.match(/\/collection\/([^\/]+)/);
    
    if (match && match[1]) {
        currentCollectionId = match[1];
        console.log('📋 Collection ID:', currentCollectionId);
        loadCollection(currentCollectionId);
        setupEventListeners();
    } else {
        showError('Invalid collection URL');
    }
});

// Setup event listeners
function setupEventListeners() {
    // Add NFT button
    const addNFTBtn = document.getElementById('addNFTBtn');
    const addFirstNFTBtn = document.getElementById('addFirstNFTBtn');
    const editCollectionBtn = document.getElementById('editCollectionBtn');
    
    if (addNFTBtn) {
        addNFTBtn.addEventListener('click', showAddNFTModal);
    }
    
    if (addFirstNFTBtn) {
        addFirstNFTBtn.addEventListener('click', showAddNFTModal);
    }
    
    if (editCollectionBtn) {
        editCollectionBtn.addEventListener('click', editCollection);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('addNFTModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
}

// Load collection data
async function loadCollection(collectionId) {
    try {
        showLoading();
        
        const token = localStorage.getItem('token');
        
        // Fetch collection data
        const response = await fetch(`/api/collections/${collectionId}`, {
            headers: token ? {
                'Authorization': `Bearer ${token}`
            } : {}
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load collection: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.collection) {
            currentCollection = data.collection;
            displayCollection(data.collection);
            
            // If user is logged in, load their NFTs for adding to collection
            if (token) {
                await loadUserNFTs();
            }
        } else {
            throw new Error(data.error || 'Collection not found');
        }
        
    } catch (error) {
        console.error('Error loading collection:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Display collection data
function displayCollection(collection) {
    // Show content
    document.getElementById('collectionContent').style.display = 'block';
    
    // Set collection name
    document.getElementById('collectionName').textContent = collection.name;
    
    // Set featured image
    const featuredImage = document.getElementById('featuredImage');
    featuredImage.src = collection.featuredImage || '/images/default-collection.png';
    featuredImage.alt = collection.name;
    
    // Set banner image if exists
    const bannerImage = document.getElementById('bannerImage');
    if (collection.bannerImage) {
        bannerImage.src = collection.bannerImage;
        bannerImage.alt = `${collection.name} banner`;
    }
    
    // Set creator info
    const creatorInfo = document.getElementById('creatorInfo');
    if (collection.creator) {
        creatorInfo.innerHTML = `
            <i class="fas fa-user"></i>
            <span>Created by ${collection.creator.fullName || collection.creator.email}</span>
        `;
    }
    
    // Set stats
    document.getElementById('nftCount').textContent = `${collection.nftCount} NFT${collection.nftCount !== 1 ? 's' : ''}`;
    document.getElementById('category').textContent = collection.category.charAt(0).toUpperCase() + collection.category.slice(1);
    document.getElementById('createdAt').textContent = new Date(collection.createdAt).toLocaleDateString();
    document.getElementById('totalNFTs').textContent = `${collection.nftCount} NFT${collection.nftCount !== 1 ? 's' : ''}`;
    
    // Set description
    const description = document.getElementById('collectionDescription');
    description.textContent = collection.description || 'No description provided.';
    
    // Set social links
    const socialLinks = document.getElementById('socialLinks');
    socialLinks.innerHTML = '';
    
    if (collection.website) {
        const websiteLink = document.createElement('a');
        websiteLink.href = collection.website;
        websiteLink.target = '_blank';
        websiteLink.className = 'social-link';
        websiteLink.innerHTML = '<i class="fas fa-globe"></i> Website';
        socialLinks.appendChild(websiteLink);
    }
    
    if (collection.twitter) {
        const twitterLink = document.createElement('a');
        twitterLink.href = `https://twitter.com/${collection.twitter.replace('@', '')}`;
        twitterLink.target = '_blank';
        twitterLink.className = 'social-link';
        twitterLink.innerHTML = '<i class="fab fa-twitter"></i> Twitter';
        socialLinks.appendChild(twitterLink);
    }
    
    if (collection.discord) {
        const discordLink = document.createElement('a');
        discordLink.href = collection.discord;
        discordLink.target = '_blank';
        discordLink.className = 'social-link';
        discordLink.innerHTML = '<i class="fab fa-discord"></i> Discord';
        socialLinks.appendChild(discordLink);
    }
    
    // Display NFTs
    displayNFTs(collection.nfts || []);
    
    // Show/hide edit button based on ownership
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const editCollectionBtn = document.getElementById('editCollectionBtn');
    
    if (editCollectionBtn) {
        if (user._id && collection.creator && user._id === collection.creator._id) {
            editCollectionBtn.style.display = 'flex';
        } else {
            editCollectionBtn.style.display = 'none';
        }
    }
}

// Display NFTs in grid
function displayNFTs(nfts) {
    const nftsGrid = document.getElementById('nftsGrid');
    
    if (!nfts || nfts.length === 0) {
        nftsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gem"></i>
                <h4>No NFTs Yet</h4>
                <p>This collection doesn't have any NFTs yet.</p>
                <button class="btn btn-primary" id="addFirstNFTBtn">
                    <i class="fas fa-plus"></i> Add First NFT
                </button>
            </div>
        `;
        
        // Re-attach event listener
        const addFirstNFTBtn = document.getElementById('addFirstNFTBtn');
        if (addFirstNFTBtn) {
            addFirstNFTBtn.addEventListener('click', showAddNFTModal);
        }
        return;
    }
    
    nftsGrid.innerHTML = '';
    
    nfts.forEach(nft => {
        const nftCard = document.createElement('div');
        nftCard.className = 'nft-card';
        
        nftCard.innerHTML = `
            <img src="${nft.image || '/images/default-nft.png'}" 
                 alt="${nft.name}" 
                 class="nft-image"
                 onerror="this.src='/images/default-nft.png'">
            <div class="nft-info">
                <h4>${nft.name}</h4>
                <div class="nft-price">${nft.price || 0} WETH</div>
                <div class="nft-actions">
                    <button class="btn btn-primary" onclick="viewNFT('${nft._id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-secondary" onclick="removeNFT('${nft._id}')">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
            </div>
        `;
        
        nftsGrid.appendChild(nftCard);
    });
}

// Load user's NFTs for adding to collection
async function loadUserNFTs() {
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!token || !user) {
            return;
        }
        
        const response = await fetch(`/api/user/${user._id}/nfts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.nfts) {
                userNFTs = data.nfts;
                console.log(`Loaded ${userNFTs.length} user NFTs`);
            }
        }
    } catch (error) {
        console.error('Error loading user NFTs:', error);
    }
}

// Show add NFT modal
function showAddNFTModal() {
    const modal = document.getElementById('addNFTModal');
    const nftSelector = document.getElementById('nftSelector');
    
    if (!currentCollection) return;
    
    // Filter out NFTs already in collection
    const availableNFTs = userNFTs.filter(userNFT => {
        return !currentCollection.nfts.some(collectionNFT => 
            collectionNFT._id === userNFT._id
        );
    });
    
    if (availableNFTs.length === 0) {
        nftSelector.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gem"></i>
                <h4>No NFTs Available</h4>
                <p>You don't have any NFTs to add to this collection.</p>
                <a href="/create-nft" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Create NFT
                </a>
            </div>
        `;
    } else {
        nftSelector.innerHTML = '';
        
        availableNFTs.forEach(nft => {
            const nftItem = document.createElement('div');
            nftItem.className = 'nft-selector-item';
            nftItem.innerHTML = `
                <img src="${nft.image || '/images/default-nft.png'}" 
                     alt="${nft.name}"
                     onerror="this.src='/images/default-nft.png'">
                <div class="nft-selector-item-info">
                    <h4>${nft.name}</h4>
                    <p>${nft.price || 0} WETH</p>
                </div>
                <button class="btn btn-primary" onclick="addNFTToCollection('${nft._id}')">
                    <i class="fas fa-plus"></i> Add
                </button>
            `;
            nftSelector.appendChild(nftItem);
        });
    }
    
    modal.style.display = 'flex';
}

// Add NFT to collection
async function addNFTToCollection(nftId) {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('Please login to add NFTs to collection');
            window.location.href = '/login';
            return;
        }
        
        const response = await fetch(`/api/collections/${currentCollectionId}/add-nft/${nftId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('NFT added to collection successfully!');
            closeModal();
            // Reload collection to show updated NFTs
            loadCollection(currentCollectionId);
        } else {
            throw new Error(data.error || 'Failed to add NFT');
        }
        
    } catch (error) {
        console.error('Error adding NFT to collection:', error);
        alert('Error: ' + error.message);
    }
}

// Remove NFT from collection
async function removeNFT(nftId) {
    if (!confirm('Are you sure you want to remove this NFT from the collection?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('Please login to remove NFTs');
            return;
        }
        
        const response = await fetch(`/api/collections/${currentCollectionId}/remove-nft/${nftId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('NFT removed from collection successfully!');
            // Reload collection to show updated NFTs
            loadCollection(currentCollectionId);
        } else {
            throw new Error(data.error || 'Failed to remove NFT');
        }
        
    } catch (error) {
        console.error('Error removing NFT from collection:', error);
        alert('Error: ' + error.message);
    }
}

// Edit collection
function editCollection() {
    alert('Edit collection feature coming soon!');
    // In the future, this would redirect to an edit page
    // window.location.href = `/collection/${currentCollectionId}/edit`;
}

// View NFT
function viewNFT(nftId) {
    // Open NFT in new tab or modal
    window.open(`/nft/${nftId}`, '_blank');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('addNFTModal');
    modal.style.display = 'none';
}

// Show loading state
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('collectionContent').style.display = 'none';
}

// Hide loading state
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show error state
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('collectionContent').style.display = 'none';
    
    const errorText = document.querySelector('#errorState p');
    if (errorText && message) {
        errorText.textContent = message;
    }
}

// Make functions available globally
window.showAddNFTModal = showAddNFTModal;
window.addNFTToCollection = addNFTToCollection;
window.removeNFT = removeNFT;
window.viewNFT = viewNFT;
window.editCollection = editCollection;
window.closeModal = closeModal;