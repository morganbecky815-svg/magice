// Magic Eden Marketplace - Frontend JavaScript
// CONNECTS TO YOUR BACKEND SERVER

// ============================================
// GLOBAL VARIABLES
// ============================================
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://bountiful-youth.up.railway.app/api'; 
}

if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}

if (typeof window.userToken === 'undefined') {
    window.userToken = null;
}

// Now use them (don't redeclare with var/let/const)
let API_BASE_URL = 'https://bountiful-youth.up.railway.app/api';
let currentUser = window.currentUser;
let userToken = window.userToken;

// ============================================
// ETH PRICE FROM BACKEND (NEW VERSION)
// ============================================

// Get ETH price from YOUR backend (not CoinGecko directly)
async function getEthPriceFromBackend() {
    try {
        console.log('🔄 Fetching ETH price from backend...');
        
        const response = await fetch('/api/eth-price');
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success === false) {
            console.warn('ETH price fetch failed, using default');
            window.ETH_PRICE = 2500;
            return 2500;
        }
        
        window.ETH_PRICE = data.price;
        console.log('✅ ETH price loaded:', window.ETH_PRICE);
        
        // Update all price displays
        updateAllEthPriceDisplays();
        
        return data.price;
        
    } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        window.ETH_PRICE = 2500;
        updateAllEthPriceDisplays();
        return 2500;
    }
}

// Update all ETH price displays
function updateAllEthPriceDisplays() {
    const ethPrice = window.ETH_PRICE || 2500;
    
    console.log('🔄 Updating all ETH price displays:', ethPrice);
    
    // 1. Update all [data-eth-price] elements
    document.querySelectorAll('[data-eth-price]').forEach(el => {
        const ethAmount = parseFloat(el.getAttribute('data-eth-amount') || 0);
        el.textContent = `$${(ethAmount * ethPrice).toFixed(2)}`;
    });
    
    // 2. Update dashboard specific elements
    const dashboardElements = [
        'currentEthPrice',
        'ethPriceDisplay',
        'dashboardEthPrice',
        'marketplaceEthPrice'
    ];
    
    dashboardElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = `$${ethPrice}`;
        }
    });
    
    // 3. Update user balance USD values if on dashboard
    if (window.location.pathname.includes('dashboard') || 
        window.location.pathname.includes('add-eth') ||
        window.location.pathname.includes('convert-weth')) {
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.ethBalance) {
            const ethValue = (user.ethBalance * ethPrice).toFixed(2);
            const wethValue = ((user.wethBalance || user.balance || 0) * ethPrice).toFixed(2);
            
            // Update USD values
            document.querySelectorAll('[data-eth-usd]').forEach(el => {
                el.textContent = `$${ethValue}`;
            });
            
            document.querySelectorAll('[data-weth-usd]').forEach(el => {
                el.textContent = `$${wethValue}`;
            });
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Magic Eden Frontend initialized');
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Test backend connection
    testBackendConnection();
    
    // Load ETH price from backend (SINGLE CALL)
    getEthPriceFromBackend();
    
    // Load NFTs if on homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadNFTs();
    }
    
    // Initialize balance loading
    if (currentUser && currentUser._id) {
        // Load user balance
        loadUserBalance();
    }
    
    // Initialize balance pages
    setupBalancePages();
});

// ============================================
// AUTH MANAGER
// ============================================

if (!window.AuthManager) {
    window.AuthManager = {
        isLoggedIn: function() {
            return !!localStorage.getItem('token') && !!localStorage.getItem('user');
        },
        getCurrentUser: function() {
            try {
                return JSON.parse(localStorage.getItem('user'));
            } catch {
                return null;
            }
        },
        getUserEmail: function() {
            const user = this.getCurrentUser();
            return user ? user.email : localStorage.getItem('magicEdenCurrentUser');
        },
        logout: function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('magicEdenCurrentUser');
            localStorage.removeItem('userId');
            currentUser = null;
            userToken = null;
        },
        login: function(email, token, userData) {
            localStorage.setItem('token', token);
            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
            }
            localStorage.setItem('magicEdenCurrentUser', email);
            currentUser = userData;
            userToken = token;
        }
    };
}

// ========================
// BACKEND API FUNCTIONS
// ========================

// Test if backend is connected
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const data = await response.json();
        console.log('✅ Backend connected:', data);
        return true;
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error);
        showNotification('Cannot connect to server. Make sure backend is running on port 5000.', 'error');
        return false;
    }
}

// Make API request to backend - FIXED VERSION
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Add token if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log(`🔑 Token added to request: ${endpoint}`);
    } else {
        console.warn(`⚠️ No token for request: ${endpoint}`);
    }
    
    try {
        console.log(`📤 API Call: ${endpoint}`);
        const response = await fetch(url, {
            headers,
            ...options
        });
        
        // Check if response is OK
        if (!response.ok) {
            if (response.status === 401) {
                console.error(`🔒 Authentication error on ${endpoint}`);
                // Don't auto-redirect, let the page handle it
            } else if (response.status === 403) {
                console.error(`🔒 Authorization error on ${endpoint}`);
            } else if (response.status === 404) {
                console.error(`🔍 Endpoint not found: ${endpoint}`);
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ API Error at ${endpoint}:`, error.message);
        throw error;
    }
}

// ========================
// AUTHENTICATION
// ========================

// Check if user is logged in
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            userToken = token;
            currentUser = JSON.parse(userStr);
            console.log('✅ User authenticated:', currentUser.email);
            updateAuthUI();
            return true;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return false;
        }
    }
    
    updateAuthUI();
    return false;
}

// Update UI based on login status
function updateAuthUI() {
    const guestButtons = document.getElementById('guestButtons');
    const userInfo = document.getElementById('userInfo');
    
    if (!guestButtons || !userInfo) return;
    
    if (currentUser) {
        // User is logged in
        guestButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        const displayName = currentUser.fullName || currentUser.email.split('@')[0];
        const userInitial = displayName.charAt(0).toUpperCase();
        
        userInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="background: #6c63ff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    ${userInitial}
                </div>
                <span>${displayName}</span>
                <span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                    ${currentUser.wethBalance || currentUser.balance || 0} WETH
                </span>
                <button class="btn" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
    } else {
        // User is not logged in
        guestButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

// Login function - FIXED VERSION
async function login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // ✅ SAVE ALL THREE KEYS
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('magicEdenCurrentUser', data.user.email);
            
            userToken = data.token;
            currentUser = data.user;
            
            console.log('✅ Login successful - Data saved:');
            console.log('   User:', data.user.email);
            console.log('   Wallet:', data.user.systemWalletAddress);
            
            // Update UI
            updateAuthUI();
            
            // Load user balance after login
            if (currentUser._id) {
                await loadUserBalance();
            }
            
            // Show success message
            showNotification('Login successful!', 'success');
            
            // Redirect based on user type
            setTimeout(() => {
                if (data.user.isAdmin) {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/dashboard';
                }
            }, 1000);
            
            return data;
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login failed:', error);
        showNotification(error.message, 'error');
    }
    return null;
}

// Register function
async function register(email, password, fullName = '') {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('magicEdenCurrentUser', data.user.email);
            
            userToken = data.token;
            currentUser = data.user;
            
            console.log('✅ Registration successful - Wallet:', data.user.systemWalletAddress);
            
            // Update UI
            updateAuthUI();
            
            // Show success message
            showNotification('Registration successful!', 'success');
            
            // Redirect to homepage
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
            
            return data;
        } else {
            throw new Error(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration failed:', error);
        showNotification(error.message, 'error');
    }
    return null;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('magicEdenCurrentUser');
    userToken = null;
    currentUser = null;
    
    // Update UI
    updateAuthUI();
    
    // Show message
    showNotification('Logged out successfully', 'success');
    
    // Redirect to homepage
    window.location.href = '/';
}

// ========================
// NFT FUNCTIONS
// ========================

// Load NFTs from backend
async function loadNFTs() {
    try {
        console.log('📦 Loading NFTs from backend...');
        const data = await apiRequest('/nft');
        
        // Display NFTs
        displayNFTs(data.nfts || []);
        
        console.log(`✅ Loaded ${data.nfts?.length || 0} NFTs`);
    } catch (error) {
        console.error('Failed to load NFTs:', error);
        showNotification('Could not load NFTs', 'error');
    }
}

// Display NFTs in the grid
function displayNFTs(nfts) {
    const nftGrid = document.getElementById('nftGrid');
    if (!nftGrid) return;
    
    if (nfts.length === 0) {
        nftGrid.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No NFTs available</p>';
        return;
    }
    
    nftGrid.innerHTML = nfts.map(nft => `
        <div class="nft-card">
            <img src="${nft.image || 'https://via.placeholder.com/300x200'}" alt="${nft.name}">
            <div class="nft-info">
                <h3>${nft.name}</h3>
                <p>Collection: ${nft.collectionName || 'Unnamed'}</p>
                <p>Price: <strong>${nft.price} WETH</strong></p>
                <p>Owner: ${nft.owner?.fullName || nft.owner?.email || 'Unknown'}</p>
                <button class="btn btn-primary" onclick="buyNFT('${nft._id}')" ${!currentUser ? 'disabled' : ''}>
                    ${currentUser ? 'Buy Now' : 'Login to Buy'}
                </button>
            </div>
        </div>
    `).join('');
}

// ========================
// NFT PURCHASE FUNCTION
// ========================

async function buyNFT(nftId) {
    if (!currentUser) {
        showNotification('Please login to purchase NFTs', 'error');
        window.location.href = '/login';
        return;
    }
    
    try {
        console.log('🛒 Starting NFT purchase for ID:', nftId);
        
        // Get NFT details first
        const nftResponse = await apiRequest(`/nft/${nftId}`);
        if (!nftResponse.success || !nftResponse.nft) {
            throw new Error('Could not load NFT details');
        }
        
        const nft = nftResponse.nft;
        const price = nft.price || 0;
        
        console.log('NFT Price:', price, 'WETH');
        console.log('User WETH Balance:', currentUser.wethBalance);
        
        // Check if user is trying to buy their own NFT
        if (nft.owner && nft.owner._id === currentUser._id) {
            showNotification('You cannot buy your own NFT', 'error');
            return;
        }
        
        // Check WETH balance
        if (currentUser.wethBalance < price) {
            const shortage = price - currentUser.wethBalance;
            
            const convert = confirm(
                `❌ Insufficient WETH Balance!\n\n` +
                `NFT Price: ${price} WETH\n` +
                `Your WETH Balance: ${currentUser.wethBalance} WETH\n` +
                `Shortage: ${shortage} WETH\n\n` +
                `Would you like to convert ETH to WETH?\n` +
                `(1 ETH = 1 WETH)`
            );
            
            if (convert) {
                window.location.href = '/convert-weth';
                return;
            }
            return;
        }
        
        // Confirm purchase
        const confirmPurchase = confirm(
            `💰 Confirm NFT Purchase\n\n` +
            `NFT: ${nft.name}\n` +
            `Price: ${price} WETH\n` +
            `Seller: ${nft.owner?.email || nft.owner?.fullName || 'Unknown'}\n\n` +
            `Your WETH balance: ${currentUser.wethBalance} → ${currentUser.wethBalance - price} WETH\n\n` +
            `Proceed with purchase?`
        );
        
        if (!confirmPurchase) return;
        
        // Show loading
        const button = event?.target;
        const originalText = button ? button.innerHTML : '';
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            button.disabled = true;
        }
        
        // Make purchase API call
        console.log('Making purchase API call...');
        const result = await apiRequest(`/nft/${nftId}/purchase`, {
            method: 'POST'
        });
        
        if (result.success) {
            console.log('✅ Purchase successful!', result);
            
            // Update user data with new balance
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                currentUser = result.user;
            } else if (result.newBalance !== undefined) {
                currentUser.wethBalance = result.newBalance;
                currentUser.balance = result.newBalance;
                localStorage.setItem('user', JSON.stringify(currentUser));
            }
            
            // Update balances in UI
            updateAllBalanceDisplays();
            updateAuthUI();
            
            // Show success message
            showNotification(result.message || `✅ Successfully purchased "${nft.name}"!`, 'success');
            
            // Refresh NFT display
            setTimeout(() => {
                loadNFTs();
            }, 1000);
            
            console.log('✅ NFT Purchase Completed:', {
                nftId,
                price,
                buyer: currentUser.email,
                newBalance: currentUser.wethBalance
            });
        } else {
            throw new Error(result.error || 'Purchase failed');
        }
        
    } catch (error) {
        console.error('Purchase error:', error);
        showNotification(error.message || 'Failed to purchase NFT', 'error');
    } finally {
        // Reset button state
        if (event?.target) {
            event.target.innerHTML = originalText || 'Buy Now';
            event.target.disabled = false;
        }
    }
}

// ========================
// USER BALANCE FUNCTIONS - FIXED VERSION
// ========================

// Load user balance from backend
// In app.js, update loadUserBalance to use /me
async function loadUserBalance() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.log('No token found');
            return null;
        }
        
        console.log('🔄 Loading user data from /me...');
        
        // USE /ME ENDPOINT INSTEAD OF USER ID
        const response = await fetch('/api/user/me/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
            console.log('✅ User data loaded:', data.user);
            
            // Update localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            // Update UI
            updateAllBalanceDisplays();
            
            return data.user;
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
    return null;
}



// Update all balance displays on the page
function updateAllBalanceDisplays() {
    if (!currentUser) return;
    
    console.log('Updating balance displays:', currentUser);
    
    // Update ETH balance displays
    document.querySelectorAll('[data-eth-balance]').forEach(el => {
        el.textContent = `${currentUser.ethBalance || 0} ETH`;
    });
    
    // Update WETH balance displays  
    document.querySelectorAll('[data-weth-balance]').forEach(el => {
        el.textContent = `${currentUser.wethBalance || 0} WETH`;
    });
    
    // Update specific elements by ID
    const elements = {
        'ethBalance': `${currentUser.ethBalance || 0} ETH`,
        'wethBalance': `${currentUser.wethBalance || 0} WETH`,
        'marketplaceBalance': `${currentUser.ethBalance || 0} ETH`,
        'dashboardEthBalance': `${currentUser.ethBalance || 0} ETH`,
        'dashboardWethBalance': `${currentUser.wethBalance || 0} WETH`,
        'userEthBalance': `${currentUser.ethBalance || 0} ETH`,
        'userWethBalance': `${currentUser.wethBalance || 0} WETH`
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            console.log(`Updated ${id}: ${value}`);
        }
    }
    
    // Also update the navbar balance display
    updateAuthUI();
}

// Add ETH to user balance
async function addETH(amount) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');
        
        if (!user || !token) {
            showNotification('Please login first', 'error');
            return null;
        }
        
        console.log('Adding ETH:', amount, 'for user:', user._id);
        
        const data = await apiRequest(`/user/${user._id}/add-eth`, {
            method: 'POST',
            body: JSON.stringify({ amount: parseFloat(amount) })
        });
        
        if (data.success) {
            console.log('ETH added successfully:', data);
            
            // Update local user data
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                currentUser = data.user;
                updateAllBalanceDisplays();
                updateAuthUI();
            }
            
            showNotification(data.message || 'ETH added successfully', 'success');
            return data;
        }
    } catch (error) {
        console.error('Add ETH error:', error);
        showNotification(error.message || 'Failed to add ETH', 'error');
    }
    return null;
}

// Convert ETH to WETH
async function convertToWETH(amount) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');
        
        if (!user || !token) {
            showNotification('Please login first', 'error');
            return null;
        }
        
        console.log('Converting to WETH:', amount, 'for user:', user._id);
        
        const data = await apiRequest(`/user/${user._id}/convert-to-weth`, {
            method: 'POST',
            body: JSON.stringify({ amount: parseFloat(amount) })
        });
        
        if (data.success) {
            console.log('Converted to WETH successfully:', data);
            
            // Update local user data
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                currentUser = data.user;
                updateAllBalanceDisplays();
                updateAuthUI();
            }
            
            showNotification(data.message || 'Converted to WETH successfully', 'success');
            return data;
        }
    } catch (error) {
        console.error('Convert to WETH error:', error);
        showNotification(error.message || 'Failed to convert to WETH', 'error');
    }
    return null;
}

// Page-specific setup for ETH/WETH pages
function setupBalancePages() {
    // Add ETH page handler
    const addEthForm = document.getElementById('addEthForm');
    if (addEthForm) {
        console.log('Setting up Add ETH form');
        addEthForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const amountInput = document.getElementById('ethAmount');
            if (amountInput) {
                const amount = parseFloat(amountInput.value);
                if (amount > 0) {
                    await addETH(amount);
                    amountInput.value = '';
                } else {
                    showNotification('Please enter a valid amount', 'error');
                }
            }
        });
    }
    
    // Convert WETH page handler
    const convertForm = document.getElementById('convertWethForm');
    if (convertForm) {
        console.log('Setting up Convert WETH form');
        convertForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const amountInput = document.getElementById('convertAmount');
            if (amountInput) {
                const amount = parseFloat(amountInput.value);
                if (amount > 0) {
                    await convertToWETH(amount);
                    amountInput.value = '';
                } else {
                    showNotification('Please enter a valid amount', 'error');
                }
            }
        });
    }
    
    // Refresh balance button
    const refreshBalanceBtn = document.getElementById('refreshBalance');
    if (refreshBalanceBtn) {
        refreshBalanceBtn.addEventListener('click', async function() {
            await loadUserBalance();
            showNotification('Balance refreshed', 'success');
        });
    }
}

// ========================
// UTILITY FUNCTIONS
// ========================

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================

window.login = login;
window.register = register;
window.logout = logout;
window.buyNFT = buyNFT;
window.loadNFTs = loadNFTs;
window.showNotification = showNotification;
window.getEthPriceFromBackend = getEthPriceFromBackend;
window.updateAllEthPriceDisplays = updateAllEthPriceDisplays;
window.loadUserBalance = loadUserBalance;
window.addETH = addETH;
window.convertToWETH = convertToWETH;
window.updateAllBalanceDisplays = updateAllBalanceDisplays;
window.apiRequest = apiRequest;