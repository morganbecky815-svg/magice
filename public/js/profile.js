// ========== PROFILE.JS - COMPLETE WITH FIXED SELLING FUNCTIONS ==========

console.log('👤 Profile page JavaScript loading...');

// ========== CONSTANTS ==========
const IMPORTED_NFTS_KEY = 'imported_nfts';

// ========== GLOBAL VARIABLES ==========
let currentSelectedNFT = null;

// ========== IMAGE ERROR HANDLER ==========
function handleImageError(imgElement, ipfsUrl) {
    console.log('🖼️ Image failed to load, trying fallbacks...');
    
    if (ipfsUrl && ipfsUrl.includes('ipfs://')) {
        const cid = ipfsUrl.replace('ipfs://', '');
        
        const gateways = [
            `https://ipfs.io/ipfs/${cid}`,
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            `https://cloudflare-ipfs.com/ipfs/${cid}`,
            `https://dweb.link/ipfs/${cid}`,
            `https://w3s.link/ipfs/${cid}`
        ];
        
        let currentGateway = 0;
        
        function tryNextGateway() {
            if (currentGateway < gateways.length) {
                console.log(`Trying gateway ${currentGateway + 1}: ${gateways[currentGateway]}`);
                imgElement.src = gateways[currentGateway];
                currentGateway++;
            } else {
                console.log('All gateways failed, using fallback image');
                imgElement.src = 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 1000);
            }
        }
        
        imgElement.onerror = tryNextGateway;
        tryNextGateway();
    } 
    else {
        console.log('Using fallback image');
        imgElement.src = 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 1000);
    }
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Profile page initialized');
    
    // 🔒 Strictly Private Mode: Check if user is logged in
    checkAuthAndLoadProfile();
    
    // Setup tab switching
    setupTabSwitching();
});

// ========== AUTH CHECK ==========

async function checkAuthAndLoadProfile() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        console.log('⚠️ User not logged in, redirecting to login...');
        window.location.href = '/login';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        console.log('✅ User found:', user.email);
        
        // Update profile header & data
        updateProfileHeader(user);
        updateProfileData(user);
        
        // Load default tab data
        await loadUserNFTs(user._id || user.id);
        await loadUserActivity(user._id || user.id);
        loadUserSettings(user);
        
        // Load imported NFTs if tab is active
        if (document.getElementById('importedTab')?.classList.contains('active')) {
            await loadImportedNFTs();
            await updateImportedBalanceDisplay();
            await updateImportedStats();
        }
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        window.location.href = '/login';
    }
}

// ========== UPDATE PROFILE HEADER ==========

function updateProfileHeader(user) {
    const profileHeader = document.getElementById('profileHeader');
    if (!profileHeader) return;
    
    const userName = user.fullName || user.name || user.email || 'User';
    const balance = user.wethBalance || user.balance || 0;
    
    profileHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <i class="fas fa-user-circle" style="font-size: 24px; color: #8a2be2;"></i>
            <span style="font-weight: 500; color: white;">${userName}</span>
            <span style="background: #4CAF50; color: white; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                ${balance} WETH
            </span>
            <button class="btn" onclick="logout()" style="background: #8a2be2; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer;">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;
}

// ========== UPDATE PROFILE DATA ==========

function updateProfileData(user) {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const walletBalance = document.getElementById('walletBalance');
    const joinDate = document.getElementById('joinDate');
    
    if (profileName) profileName.textContent = user.fullName || user.name || user.email || 'User';
    if (profileEmail) profileEmail.textContent = user.email || 'No email';
    if (walletBalance) walletBalance.textContent = (user.wethBalance || user.balance || 0) + ' WETH';
    
    if (joinDate) {
        if (user.createdAt) {
            const date = new Date(user.createdAt);
            joinDate.textContent = date.toLocaleDateString();
        } else {
            joinDate.textContent = 'Today';
        }
    }
}

// ========== TAB SWITCHING ==========

function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.profile-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            const onclickText = this.getAttribute('onclick');
            const tabMatch = onclickText?.match(/showProfileTab\('(\w+)'\)/);
            const tabName = tabMatch ? tabMatch[1] : 'nfts';
            
            showProfileTab(tabName, event);
        });
    });
}

function showProfileTab(tabName, event) {
    console.log('Switching to tab:', tabName);
    
    // Hide all tab contents
    document.querySelectorAll('.profile-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.classList.add('active');
    
    // Activate the clicked button
    if (event && event.target) {
        const btn = event.target.closest('.profile-tab');
        if(btn) btn.classList.add('active');
    }
    
    // Load data for the tab
    switch(tabName) {
        case 'nfts':
            loadUserNFTsFromLocalStorage();
            break;
        case 'imported':
            loadImportedNFTs();
            updateImportedBalanceDisplay();
            updateImportedStats();
            break;
        case 'activity':
            loadUserActivityFromLocalStorage();
            break;
        case 'collections':
            loadUserCollectionsFromLocalStorage();
            break;
        case 'settings':
            loadUserSettingsFromLocalStorage();
            break;
    }
}

// ========== NFT FUNCTIONS ==========

async function loadUserNFTs(userId) {
    console.log('🔍 Loading NFTs for user:', userId);
    
    const grid = document.getElementById('userNFTsGrid');
    if (!grid) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            grid.innerHTML = '<div class="empty-state">Please login to view NFTs</div>';
            return;
        }
        
        const response = await fetch(`/api/user/${userId}/nfts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.nfts) {
                displayNFTs(grid, data.nfts);
                updateNFTCount(data.nfts.length);
            } else {
                showEmptyNFTs(grid);
            }
        } else {
            showEmptyNFTs(grid);
        }
        
    } catch (error) {
        console.error('Error loading NFTs:', error);
        showEmptyNFTs(grid);
    }
}

function loadUserNFTsFromLocalStorage() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            loadUserNFTs(user._id || user.id);
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

function displayNFTs(grid, nfts) {
    if (!nfts || nfts.length === 0) {
        showEmptyNFTs(grid);
        return;
    }
    
    grid.innerHTML = '';
    
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'user-nft-card';
        card.onclick = () => viewNFT(nft._id);
        
        card.innerHTML = `
            <img src="${nft.image || 'https://picsum.photos/300/200?random=1'}" alt="${nft.name}" class="user-nft-image" loading="lazy" onerror="this.onerror=null; this.src='https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 1000);">
            <div class="user-nft-info">
                <h3 class="user-nft-name">${nft.name || 'Unnamed NFT'}</h3>
                <p class="user-nft-collection">Collection: ${nft.collectionName || 'None'}</p>
                <p class="user-nft-price"><strong>${nft.price || 0} WETH</strong></p>
                <div class="user-nft-view-hint">
                    Click to view details
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function showEmptyNFTs(grid) {
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-gem"></i>
            <h3>No NFTs Found</h3>
            <p>You haven't created or purchased any NFTs yet</p>
            <button class="btn btn-primary" onclick="window.location.href='/create-nft'">
                Create Your First NFT
            </button>
        </div>
    `;
    updateNFTCount(0);
}

function updateNFTCount(count) {
    const nftsOwned = document.getElementById('nftsOwned');
    if (nftsOwned) {
        nftsOwned.textContent = count;
    }
}

// ========== IMPORTED NFT FUNCTIONS ==========

// ========== FIXED: LOAD IMPORTED NFTS ==========
async function loadImportedNFTs() {
    console.log('📦 Loading imported NFTs from database');
    
    const grid = document.getElementById('importedNFTsGrid');
    if (!grid) return;
    
    try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
            grid.innerHTML = '<div class="empty-state">Please login to view imported NFTs</div>';
            return;
        }
        
        const user = JSON.parse(userStr);
        
        grid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading imported NFTs...</div>';
        
        // ✅ FIXED: Added trailing slash to URL
        const response = await fetch('/api/nft-import/', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('📥 Load response:', data);
            
            if (data.success && data.nfts) {
                // Filter to ensure we only show marketplace/wallet imports
                const importedNFTs = data.nfts.filter(nft => 
                    nft.importedFrom && ['wallet', 'marketplace', 'manual'].includes(nft.importedFrom)
                );
                
                localStorage.setItem(IMPORTED_NFTS_KEY, JSON.stringify(importedNFTs));
                
                if (importedNFTs.length === 0) {
                    showEmptyImportedNFTs(grid);
                } else {
                    displayImportedNFTs(grid, importedNFTs);
                    updateImportedNFTCount(importedNFTs.length);
                }
                
                await updateImportedStats();
            } else {
                showEmptyImportedNFTs(grid);
            }
        } else if (response.status === 401) {
            // Token expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else {
            console.error('Failed to fetch imported NFTs');
            loadImportedNFTsFromLocalStorage();
        }
        
    } catch (error) {
        console.error('Error loading imported NFTs:', error);
        loadImportedNFTsFromLocalStorage();
    }
}

function loadImportedNFTsFromLocalStorage() {
    const grid = document.getElementById('importedNFTsGrid');
    if (!grid) return;
    
    try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (!user) {
            grid.innerHTML = '<div class="empty-state">Please login to view imported NFTs</div>';
            return;
        }
        
        const userId = user._id || user.id;
        const importedNFTs = JSON.parse(localStorage.getItem(IMPORTED_NFTS_KEY) || '[]');
        
        const userImportedNFTs = importedNFTs.filter(nft => 
            nft.userId === userId && 
            nft.importedFrom && ['wallet', 'marketplace', 'manual'].includes(nft.importedFrom)
        );
        
        if (userImportedNFTs.length === 0) {
            showEmptyImportedNFTs(grid);
        } else {
            displayImportedNFTs(grid, userImportedNFTs);
            updateImportedNFTCount(userImportedNFTs.length);
        }
        
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        showEmptyImportedNFTs(grid);
    }
}

function showEmptyImportedNFTs(grid) {
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-download"></i>
            <h3>No Imported NFTs</h3>
            <p>You haven't imported any NFTs from external wallets or marketplaces yet.</p>
            <p style="font-size: 14px; color: #888; margin-top: 10px;">
                <i class="fas fa-info-circle"></i> 
                NFTs created or minted in this marketplace appear in "My NFTs" tab
            </p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="showWalletImportModal()">
                    <i class="fas fa-wallet"></i> Import from Wallet
                </button>
                <button class="btn" onclick="showMarketplaceImportModal()" style="margin-left: 0;">
                    <i class="fas fa-store"></i> Import from Marketplace
                </button>
                <button class="btn" onclick="showManualImportModal()" style="margin-left: 0;">
                    <i class="fas fa-plus-circle"></i> Manual Import
                </button>
            </div>
        </div>
    `;
    updateImportedNFTCount(0);
}

function displayImportedNFTs(grid, nfts) {
    grid.innerHTML = '';
    
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const currentUserId = currentUser ? (currentUser._id || currentUser.id) : null;
    
    nfts.sort((a, b) => new Date(b.importedAt || b.createdAt) - new Date(a.importedAt || a.createdAt));
    
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'imported-nft-card';
        card.onclick = () => showImportedNFTDetails(nft);
        
        const importSourceBadge = nft.importedFrom === 'wallet' ? '🦊 Wallet' :
                                  nft.importedFrom === 'marketplace' ? `🏪 ${nft.marketplace || 'Marketplace'}` :
                                  nft.importedFrom === 'manual' ? '📝 Manual' : '📦 Imported';
        
        const imageHtml = nft.image 
            ? `<img 
                src="${nft.image}" 
                alt="${nft.name}" 
                class="imported-nft-image" 
                loading="lazy"
                onerror="this.onerror=null; handleImageError(this, '${nft.metadata?.image || nft.image || ''}')"
              >`
            : `<div class="imported-nft-image" style="display: flex; align-items: center; justify-content: center; background: #1a1a1a;">
                <i class="fas fa-image" style="font-size: 48px; color: #333;"></i>
               </div>`;
        
        const isOwner = currentUserId && nft.owner === currentUserId;
        
        card.innerHTML = `
            ${imageHtml}
            <div class="imported-nft-info">
                <div class="imported-nft-name">${nft.name || 'Unnamed NFT'}</div>
                <div class="imported-nft-collection">${nft.collection || 'Unknown Collection'}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <span class="import-source" style="font-size: 11px; color: #888; background: #0a0a0a; padding: 3px 8px; border-radius: 12px;">
                        ${importSourceBadge}
                    </span>
                    ${nft.isListed ? 
                        `<span class="imported-nft-price">${nft.price} WETH</span>` : 
                        `<span class="imported-nft-badge">Not Listed</span>`
                    }
                </div>
                ${nft.isListed && !isOwner ? 
                    `<button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="event.stopPropagation(); buyImportedNFT('${nft._id}', ${nft.price}, '${nft.owner}', '${nft.name}')">
                        <i class="fas fa-shopping-cart"></i> Buy Now
                    </button>` : 
                    ''
                }
                ${isOwner && nft.isListed ?
                    `<button class="btn" style="width: 100%; margin-top: 10px; background: #f44336;" onclick="event.stopPropagation(); unlistImportedNFT('${nft._id}')">
                        <i class="fas fa-ban"></i> Unlist
                    </button>` :
                    ''
                }
                ${isOwner && !nft.isListed ?
                    `<button class="btn" style="width: 100%; margin-top: 10px; background: #4CAF50;" onclick="event.stopPropagation(); showSellModal('${nft._id}', '${nft.name}')">
                        <i class="fas fa-tag"></i> List for Sale
                    </button>` :
                    ''
                }
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function updateImportedNFTCount(count) {
    const countElement = document.getElementById('importedNFTCount');
    if (countElement) {
        countElement.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }
}

async function updateImportedBalanceDisplay() {
    const balanceElement = document.getElementById('importedBalance');
    if (!balanceElement) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/nft-import/balance', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                balanceElement.textContent = `${data.balance.toLocaleString()} WETH`;
                const walletBalance = document.getElementById('walletBalance');
                if (walletBalance) {
                    walletBalance.textContent = data.balance + ' WETH';
                }
                
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.wethBalance = data.balance;
                    localStorage.setItem('user', JSON.stringify(user));
                }
            }
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

async function updateImportedStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/nft-import/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const totalVolumeEl = document.getElementById('totalVolume');
                const totalTradesEl = document.getElementById('totalTrades');
                const activeListingsEl = document.getElementById('activeListings');
                
                if (totalVolumeEl) totalVolumeEl.textContent = `${data.stats.totalVolume || 0} WETH`;
                if (totalTradesEl) totalTradesEl.textContent = data.stats.totalTrades || 0;
                if (activeListingsEl) activeListingsEl.textContent = data.stats.activeListings || 0;
            }
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ========== FIXED: SELL MODAL FUNCTIONS ==========

function showSellModal(nftId, nftName) {
    console.log('💰 Showing sell modal for:', nftId, nftName);
    
    if (!nftId || !nftName) {
        showNotification('Invalid NFT data', 'error');
        return;
    }
    
    // Store the NFT data
    currentSelectedNFT = { id: nftId, name: nftName };
    console.log('✅ Stored currentSelectedNFT:', currentSelectedNFT);
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('sellNFTModal');
    if (!modal) {
        console.log('Creating sell modal');
        modal = document.createElement('div');
        modal.id = 'sellNFTModal';
        modal.className = 'modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; width: 90%; max-width: 400px; border: 1px solid #333;">
                <h2 style="color: white; margin-bottom: 20px;">List NFT for Sale</h2>
                <p style="color: #888; margin-bottom: 20px;" id="sellNFTName"></p>
                <div style="margin-bottom: 20px;">
                    <label style="color: white; display: block; margin-bottom: 8px;">Price (WETH)</label>
                    <input type="text" id="sellPrice" placeholder="0.1" value="0.1" style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; color: white; border-radius: 6px; font-size: 16px;">
                    <p style="color: #666; font-size: 12px; margin-top: 5px;">Minimum: 0.001 WETH</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="confirmListing()" class="btn btn-primary" style="flex: 1; background: #4CAF50; padding: 12px; border: none; border-radius: 6px; color: white; font-weight: bold; cursor: pointer;">List NFT</button>
                    <button onclick="closeSellModal()" class="btn" style="flex: 1; background: #f44336; padding: 12px; border: none; border-radius: 6px; color: white; font-weight: bold; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Update NFT name in modal
    const nameElement = document.getElementById('sellNFTName');
    if (nameElement) {
        nameElement.textContent = `Listing: ${nftName}`;
    }
    
    // Reset and focus input
    const priceInput = document.getElementById('sellPrice');
    if (priceInput) {
        priceInput.value = '0.1';
        priceInput.focus();
        priceInput.select();
    }
    
    modal.style.display = 'flex';
}

function closeSellModal() {
    const modal = document.getElementById('sellNFTModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // DO NOT clear currentSelectedNFT here - let confirmListing handle it
}

// ========== FIXED: CONFIRM LISTING ==========
async function confirmListing() {
    console.log('🔍 Confirm listing called');
    console.log('Current selected NFT:', currentSelectedNFT);
    
    if (!currentSelectedNFT) {
        showNotification('No NFT selected. Please try again.', 'error');
        closeSellModal();
        return;
    }
    
    // STORE THE ID IMMEDIATELY - this is the key fix!
    const nftId = currentSelectedNFT.id;
    const nftName = currentSelectedNFT.name;
    
    console.log('📌 Stored NFT ID for listing:', nftId);
    
    const priceInput = document.getElementById('sellPrice');
    if (!priceInput) {
        showNotification('Price input not found', 'error');
        return;
    }
    
    const priceValue = priceInput.value;
    console.log('Price input value:', priceValue);
    
    if (!priceValue || priceValue.trim() === '') {
        showNotification('Please enter a price', 'error');
        return;
    }
    
    const cleanedPrice = priceValue.toString().trim();
    const price = parseFloat(cleanedPrice);
    
    console.log('Parsed price:', price);
    
    if (isNaN(price) || price <= 0) {
        showNotification('Please enter a valid price greater than 0', 'error');
        return;
    }
    
    if (price < 0.001) {
        showNotification('Minimum price is 0.001 WETH', 'error');
        return;
    }
    
    console.log('✅ Validation passed, listing NFT with ID:', nftId);
    
    // Close the modal (UI only)
    const modal = document.getElementById('sellNFTModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Call the list function with the stored ID
    await listImportedNFT(nftId, price);
    
    // Clear the selected NFT ONLY AFTER successful API call
    currentSelectedNFT = null;
    console.log('✅ Listing complete, cleared currentSelectedNFT');
}

// ========== FIXED: LIST NFT FOR SALE ==========
async function listImportedNFT(nftId, price) {
    try {
        console.log('🏷️ Listing NFT for sale:', { nftId, price });
        
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login first', 'error');
            return;
        }
        
        // Validate inputs
        if (!nftId) {
            console.error('❌ NFT ID is undefined');
            showNotification('NFT ID is missing', 'error');
            return;
        }
        
        if (!price || price <= 0 || isNaN(price)) {
            showNotification('Invalid price', 'error');
            return;
        }
        
        // Ensure price is a number with proper decimal places
        const finalPrice = Number(price.toFixed(3));
        
        console.log('Making API call to:', `/api/nft-import/list/${nftId}`);
        
        const response = await fetch(`/api/nft-import/list/${nftId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ price: finalPrice })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }
            
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📥 List response:', data);
        
        if (data.success) {
            showNotification(`✅ NFT listed for ${finalPrice} WETH!`, 'success');
            await loadImportedNFTs(); // Refresh the list
            await updateImportedStats();
        } else {
            showNotification('❌ Failed to list NFT: ' + (data.error || 'Unknown error'), 'error');
        }
        
    } catch (error) {
        console.error('❌ Error listing NFT:', error);
        showNotification('❌ Error listing NFT: ' + error.message, 'error');
    }
}

// ========== UNLIST NFT ==========
async function unlistImportedNFT(nftId) {
    if (!confirm('Remove this NFT from listings?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/nft-import/unlist/${nftId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ NFT unlisted successfully', 'success');
            await loadImportedNFTs();
            await updateImportedStats();
        } else {
            showNotification(`❌ Failed to unlist: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error unlisting NFT:', error);
        showNotification('❌ Error unlisting NFT', 'error');
    }
}

// ========== FIXED: BUY NFT ==========
async function buyImportedNFT(nftId, price, ownerId, nftName) {
    if (!confirm(`Buy ${nftName} for ${price} WETH?`)) return;
    
    try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
            showNotification('Please login first', 'error');
            window.location.href = '/login';
            return;
        }
        
        const user = JSON.parse(userStr);
        
        // Check if user has enough balance
        if ((user.wethBalance || user.balance || 0) < price) {
            showNotification(`Insufficient balance. You need ${price} WETH`, 'error');
            return;
        }
        
        console.log('🛒 Buying NFT:', nftId);
        
        const response = await fetch(`/api/nft-import/buy/${nftId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📥 Buy response:', data);
        
        if (data.success) {
            showNotification(`✅ Successfully purchased ${nftName}!`, 'success');
            
            // Update local user balance
            if (data.newBalance !== undefined) {
                user.wethBalance = data.newBalance;
                localStorage.setItem('user', JSON.stringify(user));
                updateProfileHeader(user);
                updateProfileData(user);
            }
            
            await loadImportedNFTs();
            await updateImportedBalanceDisplay();
            await updateImportedStats();
        } else {
            showNotification(`❌ Purchase failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error buying NFT:', error);
        showNotification('❌ Error completing purchase: ' + error.message, 'error');
    }
}

// ========== IMPORT MODAL FUNCTIONS ==========

function showWalletImportModal() {
    const modal = document.getElementById('walletImportModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('walletStatus').innerHTML = '';
        document.getElementById('importProgress').style.display = 'none';
        document.getElementById('foundNFTs').style.display = 'none';
    }
}

function showMarketplaceImportModal() {
    const modal = document.getElementById('marketplaceImportModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('marketplaceResults').style.display = 'none';
        document.getElementById('marketplaceWallet').value = '';
    }
}

function showManualImportModal() {
    const modal = document.getElementById('manualImportModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('manualContract').value = '';
        document.getElementById('manualTokenId').value = '';
        document.getElementById('manualName').value = '';
        document.getElementById('manualImage').value = '';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ========== WALLET CONNECTION FUNCTIONS ==========

async function connectMetaMask() {
    const statusDiv = document.getElementById('walletStatus');
    
    if (typeof window.ethereum === 'undefined') {
        statusDiv.className = 'wallet-status error';
        statusDiv.innerHTML = `
            <div style="text-align: center;">
                <i class="fab fa-metamask" style="font-size: 32px; margin-bottom: 10px;"></i>
                <p>MetaMask is not installed!</p>
                <a href="https://metamask.io/download/" target="_blank" class="btn btn-primary" style="display: inline-block; margin-top: 10px;">
                    <i class="fas fa-download"></i> Install MetaMask
                </a>
            </div>
        `;
        return;
    }
    
    try {
        statusDiv.className = 'wallet-status';
        statusDiv.innerHTML = 'Connecting to MetaMask...';
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        
        statusDiv.className = 'wallet-status success';
        statusDiv.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-check-circle" style="color: #4CAF50; font-size: 24px; margin-bottom: 10px;"></i>
                <p>Connected successfully!</p>
                <p style="font-size: 12px;">${address.substring(0, 6)}...${address.substring(38)}</p>
                <p style="font-size: 11px; margin-top: 10px; color: #888;">Scanning for NFTs...</p>
            </div>
        `;
        
        document.getElementById('importProgress').style.display = 'block';
        await scanWalletForNFTs(address);
        
    } catch (error) {
        console.error('MetaMask connection error:', error);
        statusDiv.className = 'wallet-status error';
        statusDiv.innerHTML = `<p>Failed to connect to MetaMask.</p>`;
    }
}

async function connectWalletConnect() {
    const statusDiv = document.getElementById('walletStatus');
    statusDiv.className = 'wallet-status';
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing WalletConnect...';
    
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockAddress = '0x1234...5678';
        
        statusDiv.className = 'wallet-status success';
        statusDiv.innerHTML = `<p>Connected with WalletConnect! Scanning...</p>`;
        
        document.getElementById('importProgress').style.display = 'block';
        await scanWalletForNFTs(mockAddress);
        
    } catch (error) {
        statusDiv.className = 'wallet-status error';
        statusDiv.innerHTML = `<p>WalletConnect connection failed.</p>`;
    }
}

async function scanWalletForNFTs(address) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const steps = [
        { progress: 10, text: 'Connecting to blockchain...' },
        { progress: 50, text: 'Scanning tokens...' },
        { progress: 100, text: 'Complete!' }
    ];
    
    for (const step of steps) {
        progressFill.style.width = step.progress + '%';
        progressText.textContent = step.text;
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    // In a real implementation, you would fetch actual NFTs here
    // For demo, showing sample NFTs
    const sampleNFTs = [
        { id: '1', name: 'Bored Ape #1234', collection: 'Bored Ape Yacht Club', image: 'https://via.placeholder.com/150/8a2be2/ffffff?text=BAYC', contract: '0xbc4ca0...', tokenId: '1234' },
        { id: '2', name: 'CryptoPunk #5678', collection: 'CryptoPunks', image: 'https://via.placeholder.com/150/4169e1/ffffff?text=PUNK', contract: '0xb47e...', tokenId: '5678' }
    ];
    
    displayFoundNFTs(sampleNFTs);
}

function displayFoundNFTs(nfts) {
    const grid = document.getElementById('foundNFTsGrid');
    grid.innerHTML = '';
    
    nfts.forEach(nft => {
        const item = document.createElement('div');
        item.className = 'found-nft-item';
        item.onclick = () => toggleSelectNFT(item);
        item.dataset.nftId = nft.id;
        item.dataset.nftName = nft.name;
        item.dataset.nftImage = nft.image;
        item.dataset.nftCollection = nft.collection;
        item.dataset.nftContract = nft.contract;
        item.dataset.nftTokenId = nft.tokenId;
        
        item.innerHTML = `
            <img src="${nft.image}" alt="${nft.name}" class="found-nft-image">
            <div class="found-nft-name">${nft.name}</div>
        `;
        
        grid.appendChild(item);
    });
    
    document.getElementById('foundNFTs').style.display = 'block';
    document.getElementById('importProgress').style.display = 'none';
}

function toggleSelectNFT(element) {
    element.classList.toggle('selected');
}

// ========== IMPORT SELECTED NFTS FROM WALLET ==========
async function importSelectedNFTs() {
    const selectedItems = document.querySelectorAll('#foundNFTsGrid .found-nft-item.selected');
    
    if (selectedItems.length === 0) {
        showNotification('Please select at least one NFT', 'error');
        return;
    }
    
    const importedNFTs = [];
    
    selectedItems.forEach(item => {
        importedNFTs.push({
            name: item.dataset.nftName,
            image: item.dataset.nftImage,
            collection: item.dataset.nftCollection,
            contract: item.dataset.nftContract,
            tokenId: item.dataset.nftTokenId,
            marketplace: 'wallet',
            importedFrom: 'wallet'
        });
    });
    
    if (importedNFTs.length > 0) {
        await saveImportedNFTs(importedNFTs, 'wallet');
        closeModal('walletImportModal');
    }
}

// ========== MARKETPLACE IMPORT FUNCTIONS ==========

async function fetchFromMarketplaces() {
    const walletAddress = document.getElementById('marketplaceWallet').value.trim();
    if (!walletAddress) {
        showNotification('Please enter a wallet address', 'error');
        return;
    }
    
    const resultsDiv = document.getElementById('marketplaceResults');
    resultsDiv.style.display = 'block';
    const grid = document.getElementById('marketplaceNFTsGrid');
    grid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Fetching NFTs...</div>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/nft-import/fetch-nfts', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ walletAddress })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            displayMarketplaceNFTs(data.nfts);
        } else {
            throw new Error(data.error || 'Failed to fetch NFTs');
        }
    } catch (error) {
        console.error('Error fetching NFTs:', error);
        grid.innerHTML = `<div class="empty-state error"><p>${error.message}</p></div>`;
    }
}

function displayMarketplaceNFTs(nfts) {
    const grid = document.getElementById('marketplaceNFTsGrid');
    grid.innerHTML = '';
    
    nfts.forEach((nft, index) => {
        const item = document.createElement('div');
        item.className = `found-nft-item ${nft.isImported ? 'imported' : ''}`;
        if (!nft.isImported) item.onclick = () => toggleSelectNFT(item);
        
        item.dataset.nftName = nft.name;
        item.dataset.nftImage = nft.image;
        item.dataset.nftCollection = nft.collection;
        item.dataset.nftContract = nft.contract;
        item.dataset.nftTokenId = nft.tokenId;
        item.dataset.nftMarketplace = nft.marketplace || 'opensea';
        
        item.innerHTML = `
            <img src="${nft.image || 'https://picsum.photos/150/150?random=' + index}" class="found-nft-image" onerror="this.src='https://picsum.photos/150/150?random=' + Math.floor(Math.random() * 1000);">
            <div class="found-nft-name">${nft.name}</div>
            ${nft.isImported ? '<div style="font-size: 10px; color: #4CAF50;">Already imported</div>' : ''}
        `;
        grid.appendChild(item);
    });
}

// ========== IMPORT MARKETPLACE NFTS ==========
async function importMarketplaceNFTs() {
    const selectedItems = document.querySelectorAll('#marketplaceNFTsGrid .found-nft-item.selected');
    
    if (selectedItems.length === 0) {
        showNotification('Please select at least one NFT', 'error');
        return;
    }
    
    const importedNFTs = [];
    
    selectedItems.forEach(item => {
        importedNFTs.push({
            name: item.dataset.nftName,
            image: item.dataset.nftImage,
            collection: item.dataset.nftCollection,
            contract: item.dataset.nftContract,
            tokenId: item.dataset.nftTokenId,
            marketplace: item.dataset.nftMarketplace || 'opensea',
            importedFrom: 'marketplace'
        });
    });
    
    await saveImportedNFTs(importedNFTs, 'marketplace');
    closeModal('marketplaceImportModal');
}

// ========== MANUAL IMPORT FUNCTION ==========

async function importManualNFT() {
    const contract = document.getElementById('manualContract').value;
    const tokenId = document.getElementById('manualTokenId').value;
    const name = document.getElementById('manualName').value || `NFT #${tokenId}`;
    const image = document.getElementById('manualImage').value || 'https://picsum.photos/300/200?random=1';
    
    if (!contract || !tokenId) {
        showNotification('Please enter contract and token ID', 'error');
        return;
    }
    
    const nftData = [{ 
        name, 
        image, 
        contract, 
        tokenId, 
        collection: 'Manual Import', 
        importedFrom: 'manual',
        marketplace: 'manual'
    }];
    
    await saveImportedNFTs(nftData, 'manual');
    closeModal('manualImportModal');
}

// ========== FIXED: SAVE IMPORTED NFTS ==========
async function saveImportedNFTs(newNFTs, source) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login first', 'error');
            window.location.href = '/login';
            return;
        }

        console.log('📤 Saving NFTs:', newNFTs);
        
        // Format the NFTs correctly for the backend
        const selectedNFTs = newNFTs.map(nft => ({
            name: nft.name || `NFT #${nft.tokenId}`,
            image: nft.image || 'https://picsum.photos/300/200?random=1',
            collection: nft.collection || 'Imported Collection',
            contract: nft.contract,
            tokenId: nft.tokenId.toString(),
            marketplace: nft.marketplace || source || 'moralis',
            price: nft.price || 0,
            metadata: nft.metadata || {}
        }));

        // ✅ FIXED: Correct endpoint and parameter name
        const response = await fetch('/api/nft-import/save-nfts', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ selectedNFTs: selectedNFTs })
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }
            
            // Try to get error message from response
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📥 Save response:', data);
        
        if (data.success) {
            showNotification(`✅ Successfully imported ${data.saved} NFT(s)!`, 'success');
            await loadImportedNFTs();  // Refresh the list
            await updateImportedStats();  // Update stats
        } else {
            showNotification('❌ Failed to save NFTs: ' + (data.error || 'Unknown error'), 'error');
        }
        
    } catch (error) {
        console.error('❌ Error saving imported NFTs:', error);
        showNotification('❌ Error saving NFTs: ' + error.message, 'error');
    }
}

// ========== NFT DETAIL FUNCTIONS ==========

function showImportedNFTDetails(nft) {
    if (!nft) return;
    window.location.href = `/nft/${nft._id}`;
}

// ========== ACTIVITY FUNCTIONS ==========

async function loadUserActivity(userId) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`/api/user/${userId}/activity`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.activities) {
                displayActivity(activityList, data.activities);
            } else {
                showEmptyActivity(activityList);
            }
        } else {
            showEmptyActivity(activityList);
        }
    } catch (error) {
        console.error('Error loading activity:', error);
        showEmptyActivity(activityList);
    }
}

function loadUserActivityFromLocalStorage() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            loadUserActivity(user._id || user.id);
        } catch (error) {
            console.error('Error parsing user:', error);
        }
    }
}

function showEmptyActivity(container) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-history"></i>
            <h3>No Recent Activity</h3>
            <p>Your transactions will appear here</p>
        </div>
    `;
}

function displayActivity(container, activities) {
    if (!activities || activities.length === 0) {
        showEmptyActivity(container);
        return;
    }
    
    container.innerHTML = '';
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        // Determine icon based on activity type
        let icon = 'fa-history';
        let color = '#6c63ff';
        
        if (activity.type === 'nft_created' || activity.type === 'create') {
            icon = 'fa-plus-circle';
            color = '#4CAF50';
        } else if (activity.type === 'purchase' || activity.type === 'buy') {
            icon = 'fa-shopping-cart';
            color = '#2196F3';
        } else if (activity.type === 'sale' || activity.type === 'sell') {
            icon = 'fa-tag';
            color = '#FF9800';
        } else if (activity.type === 'transfer') {
            icon = 'fa-exchange-alt';
            color = '#9C27B0';
        } else if (activity.type === 'import') {
            icon = 'fa-download';
            color = '#8a2be2';
        } else if (activity.type === 'list') {
            icon = 'fa-tag';
            color = '#4CAF50';
        } else if (activity.type === 'unlist') {
            icon = 'fa-ban';
            color = '#f44336';
        }
        
        item.innerHTML = `
            <div class="activity-icon" style="background: ${color}20; color: ${color};">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-title">${activity.note || activity.title || activity.type || 'Activity'}</div>
                <div class="activity-time">${new Date(activity.createdAt).toLocaleString()}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// ========== COLLECTIONS FUNCTIONS ==========

async function loadUserCollections(userId) {
    const collectionsGrid = document.getElementById('collectionsGrid');
    if (!collectionsGrid) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            collectionsGrid.innerHTML = '<div class="empty-state">Please login to view collections</div>';
            return;
        }
        
        const response = await fetch(`/api/collections/user/${userId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.collections && data.collections.length > 0) {
                displayCollections(collectionsGrid, data.collections);
            } else {
                showEmptyCollections(collectionsGrid);
            }
        } else {
            showEmptyCollections(collectionsGrid);
        }
    } catch (error) {
        console.error('Error loading collections:', error);
        showEmptyCollections(collectionsGrid);
    }
}

function loadUserCollectionsFromLocalStorage() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            loadUserCollections(user._id || user.id);
        } catch (error) {
            console.error('Error parsing user:', error);
        }
    }
}

function showEmptyCollections(container) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-layer-group"></i>
            <h3>No Collections Found</h3>
            <p>Create your first collection to organize your NFTs</p>
            <a href="/create-collection" class="btn btn-primary">Create Collection</a>
        </div>
    `;
}

function displayCollections(container, collections) {
    container.innerHTML = '';
    collections.forEach(collection => {
        const card = document.createElement('div');
        card.className = 'collection-card';
        card.onclick = () => window.location.href = `/collection/${collection._id}`;
        
        card.innerHTML = `
            <div class="collection-header">
                <div class="collection-icon"><i class="fas fa-layer-group"></i></div>
                <div class="collection-name">${collection.name}</div>
            </div>
            <p class="collection-description">${collection.description || 'No description'}</p>
            <div class="collection-stats">
                <span><i class="fas fa-gem"></i> ${collection.nftCount || 0} NFTs</span>
            </div>
            <small>Created: ${new Date(collection.createdAt).toLocaleDateString()}</small>
        `;
        container.appendChild(card);
    });
}

// ========== SETTINGS FUNCTIONS ==========

function loadUserSettings(user) {
    const settingsEmail = document.getElementById('settingsEmail');
    const settingsName = document.getElementById('settingsName');
    const settingsBio = document.getElementById('settingsBio');
    
    if (settingsEmail) settingsEmail.value = user.email || '';
    if (settingsName) settingsName.value = user.fullName || user.name || '';
    if (settingsBio) settingsBio.value = user.bio || '';
}

function loadUserSettingsFromLocalStorage() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            loadUserSettings(user);
        } catch (error) {
            console.error('Error parsing user:', error);
        }
    }
}

async function saveProfile() {
    const fullName = document.getElementById('settingsName').value;
    const bio = document.getElementById('settingsBio').value;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login first', 'error');
            return;
        }
        
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        
        const user = JSON.parse(userStr);
        const userId = user._id || user.id;
        
        const response = await fetch(`/api/user/${userId}/profile`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ fullName, bio })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('✅ Profile updated successfully', 'success');
                
                // Update localStorage
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.fullName = fullName;
                    user.bio = bio;
                    localStorage.setItem('user', JSON.stringify(user));
                    updateProfileHeader(user);
                    updateProfileData(user);
                }
            } else {
                showNotification('❌ Failed to update profile', 'error');
            }
        } else {
            showNotification('❌ Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('❌ Error saving profile', 'error');
    }
}

// ========== BUTTON FUNCTIONS ==========

function editProfile() { 
    showProfileTab('settings'); 
}

function createCollection() { 
    window.location.href = '/create-collection';
}

function resetPassword() { 
    showNotification('Password reset feature coming soon!', 'info');
}

function showNotification(message, type = 'info') {
    // Check if toast container exists, if not create it
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `feature-toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.style.cssText = `
        background: ${type === 'success' ? '#4CAF50' : 
                     type === 'error' ? '#f44336' : 
                     '#2196F3'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ========== SHARE GALLERY FUNCTION ==========
function copyProfileLink() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    const user = JSON.parse(userStr);
    const userId = user._id || user.id;
    
    const link = `${window.location.origin}/gallery?id=${userId}`;
    
    navigator.clipboard.writeText(link).then(() => {
        showNotification('✅ Gallery link copied to clipboard!', 'success');
    }).catch(() => {
        prompt('Copy your public gallery link:', link);
    });
}

// ========== MOBILE NAVIGATION & MODALS ==========

// Close modals when clicking outside
window.onclick = function(event) { 
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none'; 
    }
}

// Mobile navigation
document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Prevent body scrolling when menu is open
            if (navMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
        });
        
        // Close menu when clicking on a nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!hamburger.contains(event.target) && 
                !navMenu.contains(event.target) && 
                navMenu.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }
});

// ========== LOGOUT FUNCTION ==========
window.logout = function() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

// ========== GLOBAL EXPORTS ==========

window.showProfileTab = showProfileTab;
window.editProfile = editProfile;
window.saveProfile = saveProfile;
window.createCollection = createCollection;
window.resetPassword = resetPassword;
window.viewNFT = function(nftId) { window.location.href = `/nft/${nftId}`; };
window.showWalletImportModal = showWalletImportModal;
window.showMarketplaceImportModal = showMarketplaceImportModal;
window.showManualImportModal = showManualImportModal;
window.closeModal = closeModal;
window.connectMetaMask = connectMetaMask;
window.connectWalletConnect = connectWalletConnect;
window.importSelectedNFTs = importSelectedNFTs;
window.fetchFromMarketplaces = fetchFromMarketplaces;
window.importMarketplaceNFTs = importMarketplaceNFTs;
window.importManualNFT = importManualNFT;
window.saveImportedNFTs = saveImportedNFTs;
window.copyProfileLink = copyProfileLink;
window.buyImportedNFT = buyImportedNFT;
window.unlistImportedNFT = unlistImportedNFT;
window.showSellModal = showSellModal;
window.closeSellModal = closeSellModal;
window.confirmListing = confirmListing;
window.listImportedNFT = listImportedNFT;
window.handleImageError = handleImageError;

window.showNFTsTab = function(event) {
    if (event) event.preventDefault();
    showProfileTab('nfts');
};
