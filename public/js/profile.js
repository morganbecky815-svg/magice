// ========== PROFILE.JS - COMPLETE WITH IMAGE ERROR HANDLING ==========

console.log('👤 Profile page JavaScript loading...');

// ========== CONSTANTS ==========
const IMPORTED_NFTS_KEY = 'imported_nfts';

// ========== IMAGE ERROR HANDLER ==========
function handleImageError(imgElement, ipfsUrl) {
    console.log('🖼️ Image failed to load, trying fallbacks...');
    
    // Try different gateways if it's an IPFS URL
    if (ipfsUrl && ipfsUrl.includes('ipfs://')) {
        const cid = ipfsUrl.replace('ipfs://', '');
        
        // List of gateways to try
        const gateways = [
            `https://ipfs.io/ipfs/${cid}`,
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            `https://cloudflare-ipfs.com/ipfs/${cid}`,
            `https://dweb.link/ipfs/${cid}`,
            `https://w3s.link/ipfs/${cid}`
        ];
        
        // Try each gateway
        let currentGateway = 0;
        
        function tryNextGateway() {
            if (currentGateway < gateways.length) {
                console.log(`Trying gateway ${currentGateway + 1}: ${gateways[currentGateway]}`);
                imgElement.src = gateways[currentGateway];
                currentGateway++;
            } else {
                // All gateways failed, use random fallback
                console.log('All gateways failed, using fallback image');
                imgElement.src = 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 1000);
            }
        }
        
        // Set up next try on error
        imgElement.onerror = tryNextGateway;
        
        // Start the first try
        tryNextGateway();
    } 
    else {
        // For any other failed image, use fallback
        console.log('Using fallback image');
        imgElement.src = 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 1000);
    }
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Profile page initialized');
    
    // Check if user is logged in
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
        
        // Update profile header
        updateProfileHeader(user);
        
        // Update main profile data
        updateProfileData(user);
        
        // Load user NFTs
        await loadUserNFTs(user._id || user.id);
        
        // Load user activity
        await loadUserActivity(user._id || user.id);
        
        // Load user settings
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
    if (!profileHeader) {
        console.error('❌ #profileHeader element not found');
        return;
    }
    
    const userName = user.fullName || user.name || user.email || 'User';
    const balance = user.wethBalance || user.balance || 0;
    
    profileHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
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
    
    if (profileName) {
        profileName.textContent = user.fullName || user.name || user.email || 'User';
    }
    
    if (profileEmail) {
        profileEmail.textContent = user.email || 'No email';
    }
    
    if (walletBalance) {
        walletBalance.textContent = (user.wethBalance || user.balance || 0) + ' WETH';
    }
    
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
        button.addEventListener('click', function() {
            const onclickText = this.getAttribute('onclick');
            const tabMatch = onclickText?.match(/showProfileTab\('(\w+)'\)/);
            const tabName = tabMatch ? tabMatch[1] : 'nfts';
            
            showProfileTab(tabName);
        });
    });
}

function showProfileTab(tabName) {
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
    if (tab) {
        tab.classList.add('active');
    }
    
    // Activate the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
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

// ========== NFT FUNCTIONS (Original) ==========

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

let currentSelectedNFT = null;

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
        
        const response = await fetch('/api/nft-import', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.nfts) {
                // Filter to ONLY show NFTs that were imported
                const importedNFTs = data.nfts.filter(nft => 
                    nft.importedFrom && ['wallet', 'marketplace', 'manual'].includes(nft.importedFrom)
                );
                
                localStorage.setItem(IMPORTED_NFTS_KEY, JSON.stringify(importedNFTs));
                
                if (importedNFTs.length === 0) {
                    grid.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-download"></i>
                            <h3>No Imported NFTs</h3>
                            <p>You haven't imported any NFTs from external wallets or marketplaces yet.</p>
                            <p style="font-size: 14px; color: #888; margin-top: 10px;">
                                <i class="fas fa-info-circle"></i> 
                                NFTs created or minted in this marketplace appear in "My NFTs" tab
                            </p>
                            <div style="margin-top: 20px;">
                                <button class="btn btn-primary" onclick="showWalletImportModal()">
                                    <i class="fas fa-wallet"></i> Import from Wallet
                                </button>
                                <button class="btn" onclick="showMarketplaceImportModal()" style="margin-left: 10px;">
                                    <i class="fas fa-store"></i> Import from Marketplace
                                </button>
                                <button class="btn" onclick="showManualImportModal()" style="margin-left: 10px;">
                                    <i class="fas fa-plus-circle"></i> Manual Import
                                </button>
                            </div>
                        </div>
                    `;
                    updateImportedNFTCount(0);
                } else {
                    displayImportedNFTs(grid, importedNFTs);
                    updateImportedNFTCount(importedNFTs.length);
                }
                
                // Update stats after loading NFTs
                await updateImportedStats();
            } else {
                showEmptyImportedNFTs(grid);
            }
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
        
        // Filter to ONLY show NFTs that were imported and belong to this user
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
        
        const warning = document.createElement('div');
        warning.className = 'wallet-status error';
        warning.innerHTML = '⚠️ Using offline mode. Some features may be limited.';
        grid.parentNode.insertBefore(warning, grid);
        
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
            <div style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="showWalletImportModal()">
                    <i class="fas fa-wallet"></i> Import from Wallet
                </button>
                <button class="btn" onclick="showMarketplaceImportModal()" style="margin-left: 10px;">
                    <i class="fas fa-store"></i> Import from Marketplace
                </button>
                <button class="btn" onclick="showManualImportModal()" style="margin-left: 10px;">
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
    
    // Sort by import date, newest first
    nfts.sort((a, b) => new Date(b.importedAt || b.createdAt) - new Date(a.importedAt || a.createdAt));
    
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'imported-nft-card';
        card.onclick = () => showImportedNFTDetails(nft);
        
        // Add a small badge showing import source
        const importSourceBadge = nft.importedFrom === 'wallet' ? '🦊 Wallet' :
                                  nft.importedFrom === 'marketplace' ? `🏪 ${nft.marketplace || 'Marketplace'}` :
                                  nft.importedFrom === 'manual' ? '📝 Manual' : '📦 Imported';
        
        // UPDATED: Image HTML with error handling
        const imageHtml = nft.image 
            ? `<img 
                src="${nft.image}" 
                alt="${nft.name}" 
                class="imported-nft-image" 
                loading="lazy"
                onerror="this.onerror=null; handleImageError(this, '${nft.metadata?.image || nft.image || ''}')"
                data-ipfs="${nft.metadata?.image || ''}"
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
                    `<button class="btn" style="width: 100%; margin-top: 10px; background: #4CAF50;" onclick="event.stopPropagation(); showSellImportedNFT()">
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
                
                // Update user object in localStorage
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
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const balance = user.wethBalance || user.balance || 0;
            balanceElement.textContent = `${balance.toLocaleString()} WETH`;
        }
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
                <p style="font-size: 12px; margin: 10px 0;">To import NFTs from your wallet, you need MetaMask:</p>
                <a href="https://metamask.io/download/" target="_blank" class="btn btn-primary" style="display: inline-block; margin-top: 10px;">
                    <i class="fas fa-download"></i> Install MetaMask
                </a>
                <p style="font-size: 11px; margin-top: 15px; color: #888;">
                    Or use the "Manual Import" option below
                </p>
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
        statusDiv.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-exclamation-triangle" style="color: #f44336; font-size: 24px; margin-bottom: 10px;"></i>
                <p>Failed to connect to MetaMask.</p>
                <p style="font-size: 12px;">${error.message || 'Please try again.'}</p>
            </div>
        `;
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
        statusDiv.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-check-circle" style="color: #4CAF50; font-size: 24px; margin-bottom: 10px;"></i>
                <p>Connected with WalletConnect!</p>
                <p style="font-size: 12px;">${mockAddress}</p>
                <p style="font-size: 11px; margin-top: 10px; color: #888;">Scanning for NFTs...</p>
            </div>
        `;
        
        document.getElementById('importProgress').style.display = 'block';
        await scanWalletForNFTs(mockAddress);
        
    } catch (error) {
        console.error('WalletConnect error:', error);
        statusDiv.className = 'wallet-status error';
        statusDiv.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-exclamation-triangle" style="color: #f44336; font-size: 24px; margin-bottom: 10px;"></i>
                <p>WalletConnect connection failed.</p>
                <p style="font-size: 12px;">${error.message || 'Please try again or use another method.'}</p>
                <button class="btn" style="margin-top: 10px;" onclick="connectWalletConnect()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

async function scanWalletForNFTs(address) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const steps = [
        { progress: 10, text: 'Connecting to blockchain...' },
        { progress: 20, text: 'Fetching NFT collections...' },
        { progress: 35, text: 'Scanning ERC-721 tokens...' },
        { progress: 50, text: 'Scanning ERC-1155 tokens...' },
        { progress: 65, text: 'Fetching metadata...' },
        { progress: 80, text: 'Processing images...' },
        { progress: 95, text: 'Almost done...' },
        { progress: 100, text: 'Complete!' }
    ];
    
    for (const step of steps) {
        progressFill.style.width = step.progress + '%';
        progressText.textContent = step.text;
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    const sampleNFTs = [
        {
            id: '1',
            name: 'Bored Ape #1234',
            collection: 'Bored Ape Yacht Club',
            image: 'https://via.placeholder.com/150/8a2be2/ffffff?text=BAYC',
            contract: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
            tokenId: '1234'
        },
        {
            id: '2',
            name: 'CryptoPunk #5678',
            collection: 'CryptoPunks',
            image: 'https://via.placeholder.com/150/4169e1/ffffff?text=PUNK',
            contract: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
            tokenId: '5678'
        },
        {
            id: '3',
            name: 'Azuki #9012',
            collection: 'Azuki',
            image: 'https://via.placeholder.com/150/ff6b6b/ffffff?text=AZUKI',
            contract: '0xed5af388653567af2f388e6224dc7c4b3241c544',
            tokenId: '9012'
        },
        {
            id: '4',
            name: 'Clone X #1000',
            collection: 'Clone X',
            image: 'https://via.placeholder.com/150/00ff00/ffffff?text=CLONEX',
            contract: '0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b',
            tokenId: '1000'
        }
    ];
    
    displayFoundNFTs(sampleNFTs);
}

function displayFoundNFTs(nfts) {
    const grid = document.getElementById('foundNFTsGrid');
    const foundNFTsDiv = document.getElementById('foundNFTs');
    
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
            <img src="${nft.image}" alt="${nft.name}" class="found-nft-image" onerror="this.onerror=null; this.src='https://picsum.photos/150/150?random=' + Math.floor(Math.random() * 1000);">
            <div class="found-nft-name">${nft.name}</div>
        `;
        
        grid.appendChild(item);
    });
    
    foundNFTsDiv.style.display = 'block';
    document.getElementById('importProgress').style.display = 'none';
}

function toggleSelectNFT(element) {
    element.classList.toggle('selected');
}

async function importSelectedNFTs() {
    const selectedItems = document.querySelectorAll('.found-nft-item.selected');
    const importedNFTs = [];
    
    selectedItems.forEach(item => {
        const nftData = {
            name: item.dataset.nftName,
            image: item.dataset.nftImage,
            collection: item.dataset.nftCollection,
            contract: item.dataset.nftContract,
            tokenId: item.dataset.nftTokenId,
            importedFrom: 'wallet'
        };
        importedNFTs.push(nftData);
    });
    
    if (importedNFTs.length > 0) {
        await saveImportedNFTs(importedNFTs, 'wallet');
        closeModal('walletImportModal');
        await loadImportedNFTs();
        await updateImportedStats();
    }
}

// ========== MARKETPLACE IMPORT FUNCTIONS ==========

async function fetchFromMarketplaces() {
    const walletAddress = document.getElementById('marketplaceWallet').value.trim();
    const selectedMarketplaces = [];
    
    if (document.querySelector('input[value="opensea"]')?.checked) selectedMarketplaces.push('opensea');
    if (document.querySelector('input[value="blur"]')?.checked) selectedMarketplaces.push('blur');
    if (document.querySelector('input[value="looksrare"]')?.checked) selectedMarketplaces.push('looksrare');
    if (document.querySelector('input[value="rarible"]')?.checked) selectedMarketplaces.push('rarible');
    if (document.querySelector('input[value="foundation"]')?.checked) selectedMarketplaces.push('foundation');
    
    if (!walletAddress) {
        showNotification('Please enter a wallet address', 'error');
        return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        showNotification('Please enter a valid Ethereum address', 'error');
        return;
    }
    
    if (selectedMarketplaces.length === 0) {
        showNotification('Please select at least one marketplace', 'error');
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
            body: JSON.stringify({
                walletAddress,
                marketplaces: selectedMarketplaces
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.nfts.length === 0) {
                grid.innerHTML = '<div class="empty-state">No NFTs found</div>';
            } else {
                displayMarketplaceNFTs(data.nfts);
                showNotification(`Found ${data.count} NFTs`, 'success');
            }
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('Error:', error);
        grid.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="fetchFromMarketplaces()">Retry</button>
            </div>
        `;
    }
}

function displayMarketplaceNFTs(nfts) {
    const grid = document.getElementById('marketplaceNFTsGrid');
    grid.innerHTML = '';
    
    nfts.forEach((nft, index) => {
        const item = document.createElement('div');
        item.className = `found-nft-item ${nft.isImported ? 'imported' : ''}`;
        if (!nft.isImported) {
            item.onclick = () => toggleSelectNFT(item);
        }
        item.dataset.nftId = `nft_${index}`;
        item.dataset.nftName = nft.name;
        item.dataset.nftImage = nft.image;
        item.dataset.nftCollection = nft.collection;
        item.dataset.nftContract = nft.contract;
        item.dataset.nftTokenId = nft.tokenId;
        item.dataset.nftMarketplace = nft.marketplace;
        
        const marketplaceColor = {
            'OpenSea': '#2081e2',
            'Blur': '#ff6b6b',
            'LooksRare': '#9b59b6',
            'Rarible': '#feda7a',
            'Foundation': '#ffffff'
        }[nft.marketplace] || '#888';
        
        item.innerHTML = `
            <img src="${nft.image}" alt="${nft.name}" class="found-nft-image" onerror="this.onerror=null; this.src='https://picsum.photos/150/150?random=' + Math.floor(Math.random() * 1000);">
            <div class="found-nft-name">${nft.name}</div>
            <div style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                <span style="background: ${marketplaceColor}20; color: ${marketplaceColor}; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                    ${nft.marketplace}
                </span>
                ${nft.isImported ? '<span style="background: #f4433620; color: #f44336; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Imported</span>' : ''}
            </div>
        `;
        
        grid.appendChild(item);
    });
}

async function importMarketplaceNFTs() {
    const selectedItems = document.querySelectorAll('#marketplaceNFTsGrid .found-nft-item.selected');
    
    if (selectedItems.length === 0) {
        showNotification('Please select NFTs to import', 'error');
        return;
    }
    
    const importedNFTs = [];
    
    selectedItems.forEach(item => {
        const nftData = {
            name: item.dataset.nftName,
            image: item.dataset.nftImage,
            collection: item.dataset.nftCollection,
            contract: item.dataset.nftContract,
            tokenId: item.dataset.nftTokenId,
            marketplace: item.dataset.nftMarketplace,
            importedFrom: 'marketplace'
        };
        importedNFTs.push(nftData);
    });
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/nft-import/save-nfts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ selectedNFTs: importedNFTs })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Imported ${data.saved} NFTs`, 'success');
            closeModal('marketplaceImportModal');
            await loadImportedNFTs();
            await updateImportedStats();
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to import NFTs', 'error');
    }
}

// ========== MANUAL IMPORT FUNCTION ==========

async function importManualNFT() {
    const contract = document.getElementById('manualContract').value;
    const tokenId = document.getElementById('manualTokenId').value;
    const name = document.getElementById('manualName').value || `NFT #${tokenId}`;
    // UPDATED: Use picsum for fallback instead of placeholder
    const image = document.getElementById('manualImage').value || 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 1000);
    
    if (!contract || !tokenId) {
        showNotification('Please enter contract and token ID', 'error');
        return;
    }
    
    const nftData = [{
        name: name,
        image: image,
        contract: contract,
        tokenId: tokenId,
        collection: 'Manual Import',
        importedFrom: 'manual'
    }];
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/nft-import/save-nfts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ selectedNFTs: nftData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('NFT imported successfully', 'success');
            closeModal('manualImportModal');
            await loadImportedNFTs();
            await updateImportedStats();
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to import NFT', 'error');
    }
}

// ========== SAVE IMPORTED NFTS ==========

async function saveImportedNFTs(newNFTs, source) {
    try {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!userStr || !token) {
            alert('Please login to import NFTs');
            return;
        }
        
        const user = JSON.parse(userStr);
        
        const nftsToSave = newNFTs.map((nft, index) => ({
            name: nft.name,
            image: nft.image,
            collection: nft.collection || nft.marketplace || 'Imported Collection',
            contract: nft.contract || '0x...',
            tokenId: nft.tokenId || `imported_${Date.now()}_${index}`,
            importedFrom: source,
            marketplace: nft.marketplace ? nft.marketplace.toLowerCase() : 'none',
            metadata: nft.metadata || {}
        }));
        
        const response = await fetch('/api/nft-import', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ importedNFTs: nftsToSave })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            const existingNFTs = JSON.parse(localStorage.getItem(IMPORTED_NFTS_KEY) || '[]');
            const updatedNFTs = [...existingNFTs, ...data.nfts];
            localStorage.setItem(IMPORTED_NFTS_KEY, JSON.stringify(updatedNFTs));
            
            let message = `Successfully imported ${data.saved} NFT(s)!`;
            if (data.errors && data.errors.length > 0) {
                message += `\n${data.errors.length} NFT(s) failed (already imported)`;
            }
            alert(message);
            
            await loadImportedNFTs();
            await updateImportedStats();
            await loadImportedActivity();
        } else {
            alert('Failed to save NFTs: ' + (data.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error saving imported NFTs:', error);
        alert('Failed to import NFTs. Please check your connection and try again.');
    }
}

// ========== NFT DETAIL FUNCTIONS ==========

// Replace your existing showImportedNFTDetails with this
// Update this function in profile.js
function showImportedNFTDetails(nft) {
    if (!nft) return;
    
    console.log('🎯 Showing imported NFT details:', nft);
    
    // Store minimal data if needed, but the detail page will fetch from API
    sessionStorage.setItem('lastViewedNFT', JSON.stringify({
        id: nft._id,
        name: nft.name
    }));
    
    // Navigate to the same NFT detail page
    window.location.href = `/nft/${nft._id}`;
}

async function confirmImportedListing() {
    const price = parseFloat(document.getElementById('sellPrice').value);
    
    if (!price || price <= 0) {
        alert('Please enter a valid price');
        return;
    }
    
    if (!currentSelectedNFT) return;
    
    await listImportedNFT(currentSelectedNFT._id, price);
}

async function listImportedNFT(nftId, price) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/nft-import/list/${nftId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ price })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('NFT listed successfully!', 'success');
            closeModal('sellImportedNFTModal');
            await loadImportedNFTs();
            await updateImportedStats();
        } else {
            alert(data.error || 'Failed to list NFT');
        }
        
    } catch (error) {
        console.error('Error listing NFT:', error);
        alert('Failed to list NFT');
    }
}

async function unlistImportedNFT(nftId) {
    if (!confirm('Remove this NFT from sale?')) return;
    
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
        
        if (response.ok && data.success) {
            showNotification('NFT unlisted successfully!', 'success');
            await loadImportedNFTs();
            await updateImportedStats();
        } else {
            alert(data.error || 'Failed to unlist NFT');
        }
        
    } catch (error) {
        console.error('Error unlisting NFT:', error);
        alert('Failed to unlist NFT');
    }
}

async function buyImportedNFT(nftId, price, sellerId, nftName) {
    if (!confirm(`Buy ${nftName} for ${price} WETH?`)) return;
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/nft-import/buy/${nftId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('Purchase successful!', 'success');
            await loadImportedNFTs();
            await updateImportedBalanceDisplay();
            await loadImportedActivity();
            await updateImportedStats();
            
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.wethBalance = data.newBalance;
                localStorage.setItem('user', JSON.stringify(user));
                updateProfileHeader(user);
            }
        } else {
            alert(data.error || 'Purchase failed');
        }
        
    } catch (error) {
        console.error('Error buying NFT:', error);
        alert('Failed to complete purchase');
    }
}

// ========== ACTIVITY FUNCTIONS ==========

async function loadUserActivity(userId) {
    console.log('📊 Loading activity for user:', userId);
    
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            activityList.innerHTML = '<div class="empty-state">Please login to view activity</div>';
            return;
        }
        
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
                await loadImportedActivity();
            }
        } else {
            await loadImportedActivity();
        }
        
    } catch (error) {
        console.error('Error loading activity:', error);
        await loadImportedActivity();
    }
}

function loadUserActivityFromLocalStorage() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            loadUserActivity(user._id || user.id);
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

async function loadImportedActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/nft-import/transactions', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.transactions) {
                displayImportedActivity(data.transactions);
            } else {
                showEmptyActivity(activityList);
            }
        } else {
            showEmptyActivity(activityList);
        }
    } catch (error) {
        console.error('Error loading imported activity:', error);
        showEmptyActivity(activityList);
    }
}

function displayImportedActivity(transactions) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (!transactions || transactions.length === 0) {
        showEmptyActivity(activityList);
        return;
    }
    
    activityList.innerHTML = '';
    
    transactions.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        const iconMap = {
            'purchase': { icon: 'fa-shopping-cart', color: '#4CAF50' },
            'sale': { icon: 'fa-tag', color: '#FF9800' },
            'transfer': { icon: 'fa-exchange-alt', color: '#8a2be2' }
        };
        
        const iconInfo = iconMap[tx.type] || { icon: 'fa-history', color: '#6c63ff' };
        
        let title = tx.note || `${tx.type} transaction`;
        if (tx.metadata?.action === 'list') {
            title = `Listed NFT for sale`;
            iconInfo.icon = 'fa-tag';
            iconInfo.color = '#FF9800';
        } else if (tx.metadata?.importedFrom) {
            title = `Imported NFT from ${tx.metadata.importedFrom}`;
            iconInfo.icon = 'fa-download';
            iconInfo.color = '#8a2be2';
        }
        
        item.innerHTML = `
            <div class="activity-icon" style="background: ${iconInfo.color}20; color: ${iconInfo.color};">
                <i class="fas ${iconInfo.icon}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-title">${title}</div>
                <div class="activity-description">
                    ${tx.nft ? tx.nft.name : ''} 
                    ${tx.amount > 0 ? `- ${tx.amount} WETH` : ''}
                </div>
                <div class="activity-time">
                    <i class="far fa-clock"></i> ${new Date(tx.createdAt).toLocaleString()}
                </div>
            </div>
        `;
        
        activityList.appendChild(item);
    });
}

function showEmptyActivity(container) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-history"></i>
            <h3>No Recent Activity</h3>
            <p>When you create, buy, sell, or import NFTs, activity will appear here</p>
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
        
        const iconMap = {
            'purchase': { icon: 'fa-shopping-cart', color: '#4CAF50' },
            'sale': { icon: 'fa-tag', color: '#FF9800' },
            'mint': { icon: 'fa-plus-circle', color: '#9C27B0' },
            'transfer': { icon: 'fa-exchange-alt', color: '#8a2be2' },
            'deposit': { icon: 'fa-arrow-down', color: '#2196F3' },
            'withdrawal': { icon: 'fa-arrow-up', color: '#f44336' }
        };
        
        const iconInfo = iconMap[activity.type] || { icon: 'fa-history', color: '#6c63ff' };
        
        item.innerHTML = `
            <div class="activity-icon" style="background: ${iconInfo.color}20; color: ${iconInfo.color};">
                <i class="fas ${iconInfo.icon}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-title">${activity.note || activity.type}</div>
                <div class="activity-description">${activity.amount ? `${activity.amount} WETH` : ''}</div>
                <div class="activity-time">
                    <i class="far fa-clock"></i> ${new Date(activity.createdAt).toLocaleString()}
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// ========== COLLECTIONS FUNCTIONS ==========

async function loadUserCollections(userId) {
    console.log('📦 Loading collections for user:', userId);
    
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
            console.error('Error:', error);
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
        
        card.innerHTML = `
            <div class="collection-header">
                <div class="collection-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="collection-name">${collection.name}</div>
            </div>
            <p class="collection-description">${collection.description || 'No description'}</p>
            <div class="collection-stats">
                <span><i class="fas fa-gem"></i> ${collection.nftCount || 0} NFTs</span>
                <span><i class="fas fa-tag"></i> ${collection.category || 'Art'}</span>
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
            console.error('Error:', error);
        }
    }
}

// ========== BUTTON FUNCTIONS ==========

function editProfile() {
    showProfileTab('settings');
}

async function saveProfile() {
    const fullName = document.getElementById('settingsName').value;
    const bio = document.getElementById('settingsBio').value;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/auth/profile', {
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
                alert('Profile updated successfully');
                
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.fullName = fullName;
                    user.bio = bio;
                    localStorage.setItem('user', JSON.stringify(user));
                    
                    updateProfileHeader(user);
                    updateProfileData(user);
                }
            }
        } else {
            alert('Failed to update profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to update profile');
    }
}

function createCollection() {
    alert('Create collection feature coming soon!');
}

function resetPassword() {
    alert('Password reset feature coming soon!');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

function viewNFT(nftId) {
    window.location.href = `/nft/${nftId}`;
}

// ========== NOTIFICATION FUNCTION ==========

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `feature-toast ${type}`;
    
    const icon = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== MODAL CLICK OUTSIDE ==========

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ========== MOBILE NAVIGATION ==========

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

// Also add this to your existing logout function to ensure menu closes on logout
const originalLogout = window.logout;
window.logout = function() {
    // Close mobile menu if open
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    // Call original logout function
    if (originalLogout) originalLogout();
    else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
};

// ========== GLOBAL EXPORTS ==========

window.showProfileTab = showProfileTab;
window.editProfile = editProfile;
window.saveProfile = saveProfile;
window.createCollection = createCollection;
window.resetPassword = resetPassword;
window.logout = logout;
window.viewNFT = viewNFT;
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
window.showSellImportedNFT = showSellImportedNFT;
window.showTransferImportedNFT = showTransferImportedNFT;
window.removeImportedNFT = removeImportedNFT;
window.confirmImportedListing = confirmImportedListing;
window.buyImportedNFT = buyImportedNFT;
window.unlistImportedNFT = unlistImportedNFT;

// For the "My NFTs" link in navigation
window.showNFTsTab = function(event) {
    if (event) event.preventDefault();
    showProfileTab('nfts');
};
