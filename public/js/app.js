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
            return !!localStorage.getItem('magicEdenCurrentUser') || 
                   !!localStorage.getItem('token');
        },
        getCurrentUser: function() {
            return localStorage.getItem('magicEdenCurrentUser');
        },
        logout: function() {
            localStorage.removeItem('magicEdenCurrentUser');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userId');
        },
        login: function(email, token) {
            localStorage.setItem('magicEdenCurrentUser', email);
            localStorage.setItem('token', token);
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

// Make API request to backend
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
    }
    
    try {
        console.log(`📤 API Call: ${endpoint}`);
        const response = await fetch(url, {
            headers,
            ...options
        });
        
        // Check if response is OK
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ API Error at ${endpoint}:`, error.message);
        showNotification(error.message || 'API request failed', 'error');
        throw error;
    }
}

// ========================
// AUTHENTICATION
// ========================

// Check if user is logged in
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
        userToken = token;
        currentUser = JSON.parse(userData);
        updateAuthUI();
        return true;
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
        userInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="background: #6c63ff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                    ${currentUser.fullName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                </div>
                <span>${currentUser.fullName || currentUser.email}</span>
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

// Login function (connects to backend)
async function login(email, password) {
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.success) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            userToken = data.token;
            currentUser = data.user;
            
            // Update UI
            updateAuthUI();
            
            // Load user balance after login
            if (currentUser._id) {
                await loadUserBalance();
            }
            
            // Show success message
            showNotification('Login successful!', 'success');
            
            // Redirect to homepage
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
            return data;
        }
    } catch (error) {
        console.error('Login failed:', error);
    }
    return null;
}

// Register function (connects to backend)
async function register(email, password, fullName = '') {
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName })
        });
        
        if (data.success) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            userToken = data.token;
            currentUser = data.user;
            
            // Update UI
            updateAuthUI();
            
            // Load user balance after registration
            if (currentUser._id) {
                await loadUserBalance();
            }
            
            // Show success message
            showNotification('Registration successful!', 'success');
            
            // Redirect to homepage
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
            return data;
        }
    } catch (error) {
        console.error('Registration failed:', error);
    }
    return null;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
// NFT FUNCTIONS - FIXED CASH FLOW VERSION
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
// FIXED: COMPLETE NFT PURCHASE WITH CASH FLOW
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
        const nftResponse = await fetch(`${API_BASE_URL}/nft/${nftId}`);
        if (!nftResponse.ok) throw new Error('Failed to load NFT details');
        
        const nftData = await nftResponse.json();
        if (!nftData.success || !nftData.nft) {
            throw new Error('Could not load NFT details');
        }
        
        const nft = nftData.nft;
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
        const response = await fetch(`${API_BASE_URL}/nft/${nftId}/purchase`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `Purchase failed: ${response.status}`);
        }
        
        if (result.success) {
            console.log('✅ Purchase successful!', result);
            
            // Update user data with new balance
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                currentUser = result.user;
            } else if (result.newBalance !== undefined) {
                // Update user's WETH balance
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
// FIXED: NFT CREATION WITH ETH DEDUCTION
// ========================

// MINT NFT (Deducts ETH from user)
async function mintNFT(formData) {
    try {
        if (!currentUser) {
            showNotification('Please login to create NFTs', 'error');
            window.location.href = '/login';
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }
        
        const mintingFee = 0.01; // 0.01 ETH minting fee
        
        // Check ETH balance
        if (currentUser.ethBalance < mintingFee) {
            const choice = confirm(
                `❌ Insufficient ETH for minting fee!\n\n` +
                `Minting Fee: ${mintingFee} ETH\n` +
                `Your ETH Balance: ${currentUser.ethBalance} ETH\n` +
                `Shortage: ${mintingFee - currentUser.ethBalance} ETH\n\n` +
                `Would you like to add ETH?`
            );
            
            if (choice) {
                window.location.href = '/add-eth';
            }
            return;
        }
        
        // Get form values
        const name = formData.get('name');
        const collectionName = formData.get('collectionName');
        const price = formData.get('price');
        
        // Confirm minting
        const confirmMint = confirm(
            `🎨 Mint NFT Confirmation\n\n` +
            `NFT Name: ${name}\n` +
            `Collection: ${collectionName || 'Default'}\n` +
            `Price: ${price || 0.01} WETH\n\n` +
            `Minting Fee: ${mintingFee} ETH\n` +
            `Your ETH balance: ${currentUser.ethBalance} → ${currentUser.ethBalance - mintingFee} ETH\n\n` +
            `Proceed with minting?`
        );
        
        if (!confirmMint) return;
        
        // Show loading
        const createButton = document.getElementById('createNFTBtn');
        if (createButton) {
            createButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Minting...';
            createButton.disabled = true;
        }
        
        // Prepare NFT data
        const nftData = {
            name: name,
            collectionName: collectionName,
            price: parseFloat(price) || 0.01,
            category: formData.get('category') || 'art',
            image: formData.get('image')
        };
        
        console.log('Minting NFT with data:', nftData);
        
        // Send to backend minting endpoint
        const response = await fetch(`${API_BASE_URL}/nft/mint`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nftData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Minting failed');
        }
        
        if (result.success) {
            console.log('✅ NFT minted successfully!', result);
            
            // Update user balance
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                currentUser = result.user;
                updateAllBalanceDisplays();
                updateAuthUI();
            } else if (result.newETHBalance !== undefined) {
                // Update ETH balance
                currentUser.ethBalance = result.newETHBalance;
                localStorage.setItem('user', JSON.stringify(currentUser));
                updateAllBalanceDisplays();
                updateAuthUI();
            }
            
            showNotification(`✅ NFT minted successfully! ${mintingFee} ETH deducted for minting fee.`, 'success');
            
            // Redirect to homepage after 2 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Minting failed');
        }
        
    } catch (error) {
        console.error('Minting error:', error);
        showNotification(error.message || 'Failed to mint NFT', 'error');
    } finally {
        const createButton = document.getElementById('createNFTBtn');
        if (createButton) {
            createButton.innerHTML = 'Create & List NFT';
            createButton.disabled = false;
        }
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

// Setup form event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await login(email, password);
        });
    }
}

// Initialize the setup
setupEventListeners();

// ============================================
// USER BALANCE FUNCTIONS - UPDATED FOR CASH FLOW
// ============================================

// Load user balance from backend
async function loadUserBalance() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');
        
        if (!user || !user._id || !token) {
            console.log('User not logged in or missing user ID');
            return null;
        }
        
        console.log('🔄 Loading user balance for:', user._id);
        
        const response = await fetch(`${API_BASE_URL}/user/${user._id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to load balance:', response.status, errorText);
            return null;
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
            console.log('✅ User balance loaded:', data.user);
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            // Update UI displays
            updateAllBalanceDisplays();
            
            return data.user;
        }
    } catch (error) {
        console.error('Failed to load user balance:', error);
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
        
        const response = await fetch(`${API_BASE_URL}/user/${user._id}/add-eth`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: parseFloat(amount) })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Failed to add ETH: ${response.status}`);
        }
        
        if (data.success) {
            console.log('ETH added successfully:', data);
            
            // Update local user data
            if (data.user) {
                const updatedUser = { ...user, ...data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                currentUser = updatedUser;
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
        
        const response = await fetch(`${API_BASE_URL}/user/${user._id}/convert-to-weth`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: parseFloat(amount) })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Failed to convert to WETH: ${response.status}`);
        }
        
        if (data.success) {
            console.log('Converted to WETH successfully:', data);
            
            // Update local user data
            if (data.user) {
                const updatedUser = { ...user, ...data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                currentUser = updatedUser;
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
                    // Clear the input
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
                    // Clear the input
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
// UPDATED NFT CREATION FORM HANDLER WITH ETH DEDUCTION
// ========================

document.addEventListener('DOMContentLoaded', function() {
    const createNFTForm = document.getElementById('createNFTForm');
    const imagePreview = document.getElementById('imagePreview');
    const imageInput = document.getElementById('image');
    const createButton = document.getElementById('createNFTBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    if (!createNFTForm) return;
    
    // Preview uploaded image
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview" style="max-width: 300px; border-radius: 8px;">
                        <p>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Handle form submission
    createNFTForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            showNotification('Please login to create NFTs', 'error');
            window.location.href = '/login';
            return;
        }
        
        const formData = new FormData(createNFTForm);
        
        // Validate
        const name = formData.get('name');
        const price = formData.get('price');
        const imageFile = formData.get('image');
        
        if (!name || !price || !imageFile || imageFile.size === 0) {
            showNotification('Please fill all required fields', 'error');
            return;
        }
        
        // Use the new mintNFT function that deducts ETH
        await mintNFT(formData);
    });
    
    // Price validation
    const priceInput = document.getElementById('price');
    if (priceInput) {
        priceInput.addEventListener('input', function(e) {
            let value = parseFloat(e.target.value);
            if (value < 0) e.target.value = 0;
            if (value > 1000) e.target.value = 1000;
        });
    }
});

// Make sure we have currentUser and API_BASE_URL
if (typeof currentUser === 'undefined') {
    currentUser = JSON.parse(localStorage.getItem('user'));
}

if (typeof API_BASE_URL === 'undefined') {
    API_BASE_URL = window.API_BASE_URL || 'http://bountiful-youth.up.railway.app/api';
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
window.mintNFT = mintNFT;