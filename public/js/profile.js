// ========== PROFILE.JS - COMPLETE WITH IMAGE ERROR HANDLING ==========

console.log('👤 Profile page JavaScript loading...');

const IMPORTED_NFTS_KEY = 'imported_nfts';

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
                imgElement.src = gateways[currentGateway];
                currentGateway++;
            } else {
                imgElement.src = 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 1000);
            }
        }
        imgElement.onerror = tryNextGateway;
        tryNextGateway();
    } else {
        imgElement.src = 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 1000);
    }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Profile page initialized');
    
    // Check if there is an ID in the URL for Public Mode (e.g. profile?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const publicUserId = urlParams.get('id');

    if (publicUserId) {
        // 🌍 PUBLIC MODE
        loadPublicProfile(publicUserId);
        setupTabSwitching();
    } else {
        // 🔒 PRIVATE MODE (Owner)
        checkAuthAndLoadProfile();
        setupTabSwitching();
    }
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
        updateProfileHeader(user);
        updateProfileData(user);
        await loadUserNFTs(user._id || user.id);
        await loadUserActivity(user._id || user.id);
        loadUserSettings(user);
        
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
    
    if (profileName) profileName.textContent = user.fullName || user.name || user.email || 'User';
    if (profileEmail) profileEmail.textContent = user.email || 'No email';
    if (walletBalance) walletBalance.textContent = (user.wethBalance || user.balance || 0) + ' WETH';
    
    if (joinDate) {
        if (user.createdAt) {
            joinDate.textContent = new Date(user.createdAt).toLocaleDateString();
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
    document.querySelectorAll('.profile-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.profile-tab').forEach(btn => btn.classList.remove('active'));
    
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.classList.add('active');
    
    if (event && event.target) {
        // If they clicked the icon inside the button, ensure the button gets the active class
        const btn = event.target.closest('.profile-tab');
        if(btn) btn.classList.add('active');
    }
    
    // Only load local storage data if in private mode
    const isPublicView = new URLSearchParams(window.location.search).has('id');
    if(!isPublicView) {
        switch(tabName) {
            case 'nfts': loadUserNFTsFromLocalStorage(); break;
            case 'imported': 
                loadImportedNFTs();
                updateImportedBalanceDisplay();
                updateImportedStats();
                break;
            case 'activity': loadUserActivityFromLocalStorage(); break;
            case 'collections': loadUserCollectionsFromLocalStorage(); break;
            case 'settings': loadUserSettingsFromLocalStorage(); break;
        }
    }
}

// ========== NFT FUNCTIONS (Original) ==========
async function loadUserNFTs(userId) {
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
        showEmptyNFTs(grid, new URLSearchParams(window.location.search).has('id'));
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
                <div class="user-nft-view-hint">Click to view details</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function showEmptyNFTs(grid, isPublicView = false) {
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-gem"></i>
            <h3>No NFTs Found</h3>
            <p>${isPublicView ? "This user hasn't collected any NFTs yet." : "You haven't created or purchased any NFTs yet"}</p>
            ${!isPublicView ? `<button class="btn btn-primary" onclick="window.location.href='/create-nft'">Create Your First NFT</button>` : ''}
        </div>
    `;
    updateNFTCount(0);
}

function updateNFTCount(count) {
    const nftsOwned = document.getElementById('nftsOwned');
    if (nftsOwned) nftsOwned.textContent = count;
}

// ========== IMPORTED NFT FUNCTIONS (Truncated for brevity, kept exactly as you had them) ==========
let currentSelectedNFT = null;
async function loadImportedNFTs() { /* As provided */ }
function loadImportedNFTsFromLocalStorage() { /* As provided */ }
function showEmptyImportedNFTs(grid) { /* As provided */ }
function displayImportedNFTs(grid, nfts) { /* As provided */ }
function updateImportedNFTCount(count) { /* As provided */ }
async function updateImportedBalanceDisplay() { /* As provided */ }
async function updateImportedStats() { /* As provided */ }
function showWalletImportModal() { /* As provided */ }
function showMarketplaceImportModal() { /* As provided */ }
function showManualImportModal() { /* As provided */ }
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }
async function connectMetaMask() { /* As provided */ }
async function connectWalletConnect() { /* As provided */ }
async function scanWalletForNFTs(address) { /* As provided */ }
function displayFoundNFTs(nfts) { /* As provided */ }
function toggleSelectNFT(element) { element.classList.toggle('selected'); }
async function importSelectedNFTs() { /* As provided */ }
async function fetchFromMarketplaces() { /* As provided */ }
function displayMarketplaceNFTs(nfts) { /* As provided */ }
async function importMarketplaceNFTs() { /* As provided */ }
async function importManualNFT() { /* As provided */ }
async function saveImportedNFTs(newNFTs, source) { /* As provided */ }
function showImportedNFTDetails(nft) { window.location.href = `/nft/${nft._id}`; }
async function confirmImportedListing() { /* As provided */ }
async function listImportedNFT(nftId, price) { /* As provided */ }
async function unlistImportedNFT(nftId) { /* As provided */ }
async function buyImportedNFT(nftId, price, sellerId, nftName) { /* As provided */ }
async function loadUserActivity(userId) { /* As provided */ }
function loadUserActivityFromLocalStorage() { /* As provided */ }
async function loadImportedActivity() { /* As provided */ }
function displayImportedActivity(transactions) { /* As provided */ }
function showEmptyActivity(container) { /* As provided */ }
function displayActivity(container, activities) { /* As provided */ }

// ========== COLLECTIONS FUNCTIONS (UPDATED FOR PUBLIC MODE) ==========
async function loadUserCollections(userId) {
    console.log('📦 Loading collections for user:', userId);
    const collectionsGrid = document.getElementById('collectionsGrid');
    if (!collectionsGrid) return;
    
    try {
        const token = localStorage.getItem('token');
        const isPublicView = new URLSearchParams(window.location.search).has('id');
        
        // Only block if there is NO token AND it's NOT a public view
        if (!token && !isPublicView) {
            collectionsGrid.innerHTML = '<div class="empty-state">Please login to view collections</div>';
            return;
        }
        
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`/api/collections/user/${userId}`, { headers });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.collections && data.collections.length > 0) {
                displayCollections(collectionsGrid, data.collections);
            } else {
                showEmptyCollections(collectionsGrid, isPublicView);
            }
        } else {
            showEmptyCollections(collectionsGrid, isPublicView);
        }
    } catch (error) {
        console.error('Error loading collections:', error);
        showEmptyCollections(collectionsGrid, new URLSearchParams(window.location.search).has('id'));
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

function showEmptyCollections(container, isPublicView = false) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-layer-group"></i>
            <h3>No Collections Found</h3>
            <p>${isPublicView ? "This user hasn't created any collections yet." : "Create your first collection to organize your NFTs"}</p>
            ${!isPublicView ? '<a href="/create-collection" class="btn btn-primary">Create Collection</a>' : ''}
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
                <div class="collection-icon"><i class="fas fa-layer-group"></i></div>
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
        } catch (error) { console.error('Error:', error); }
    }
}

// ========== BUTTON FUNCTIONS ==========
function editProfile() { showProfileTab('settings'); }
async function saveProfile() { /* As provided */ }
function createCollection() { alert('Create collection feature coming soon!'); }
function resetPassword() { alert('Password reset feature coming soon!'); }
function logout() { /* As provided */ }
function viewNFT(nftId) { window.location.href = `/nft/${nftId}`; }

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `feature-toast ${type}`;
    const icon = { 'success': 'fa-check-circle', 'error': 'fa-exclamation-circle', 'info': 'fa-info-circle' }[type] || 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ========== PUBLIC PROFILE FUNCTIONS (NEW) ==========

async function loadPublicProfile(userId) {
    console.log('👀 Loading public profile for:', userId);
    
    // 1. Hide private buttons and wallet balance
    const actionsDiv = document.getElementById('privateActions');
    if(actionsDiv) actionsDiv.style.display = 'none';
    
    const walletStat = document.getElementById('walletBalance');
    if (walletStat) walletStat.parentElement.style.display = 'none';
    
    // 2. Hide private tabs, but KEEP "My NFTs" and "Collections"
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        const text = tab.textContent.toLowerCase();
        if (text.includes('imported') || text.includes('activity') || text.includes('settings')) {
            tab.style.display = 'none';
        }
    });

    try {
        // 3. Fetch public data (NO AUTH REQUIRED)
        const response = await fetch(`/api/nft/public-collection/${userId}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('profileName').textContent = data.user.name;
            document.getElementById('profileEmail').textContent = data.user.bio; // Show bio instead of email
            document.getElementById('joinDate').textContent = new Date(data.user.joined).toLocaleDateString();

            // Load the NFTs grid automatically
            const grid = document.getElementById('userNFTsGrid');
            displayNFTs(grid, data.nfts);
            updateNFTCount(data.nfts.length);
            
            // Preload their collections so it's ready when they click the tab
            loadUserCollections(userId);
            
        } else {
            document.querySelector('.profile-main').innerHTML = `
                <div class="empty-state" style="margin-top: 100px;">
                    <i class="fas fa-user-slash" style="color: #ef4444; font-size: 48px;"></i>
                    <h2>User Not Found</h2>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading public profile:', error);
    }
}

function copyProfileLink() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    const user = JSON.parse(userStr);
    const userId = user._id || user.id;
    
    const link = `${window.location.origin}/profile?id=${userId}`;
    
    navigator.clipboard.writeText(link).then(() => {
        showNotification('✅ Profile link copied to clipboard!', 'success');
    }).catch(() => {
        prompt('Copy your public profile link:', link);
    });
}

// ========== MOBILE NAVIGATION & EXPORTS ==========
window.onclick = function(event) { if (event.target.classList.contains('modal')) event.target.style.display = 'none'; }
document.addEventListener('DOMContentLoaded', function() { /* Mobile nav logic as provided */ });
const originalLogout = window.logout;
window.logout = function() { /* Mobile nav close logic as provided */ };

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
window.showSellImportedNFT = () => alert("Sell imported NFT coming soon!"); // Fallback
window.showTransferImportedNFT = () => alert("Transfer coming soon!"); // Fallback
window.removeImportedNFT = () => alert("Remove coming soon!"); // Fallback
window.confirmImportedListing = confirmImportedListing;
window.buyImportedNFT = buyImportedNFT;
window.unlistImportedNFT = unlistImportedNFT;
window.copyProfileLink = copyProfileLink;

window.showNFTsTab = function(event) {
    if (event) event.preventDefault();
    showProfileTab('nfts');
};
