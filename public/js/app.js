// Magic Eden Marketplace - Frontend JavaScript
// CONNECTS TO YOUR BACKEND SERVER

const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let userToken = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Magic Eden Frontend initialized');
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Test backend connection
    testBackendConnection();
    
    // Load NFTs if on homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadNFTs();
    }
});

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
                    ${currentUser.balance || 0} WETH
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

// Buy NFT
async function buyNFT(nftId) {
    if (!currentUser) {
        showNotification('Please login to purchase NFTs', 'error');
        window.location.href = '/login';
        return;
    }
    
    try {
        const data = await apiRequest(`/nft/${nftId}/purchase`, {
            method: 'POST'
        });
        
        if (data.success) {
            showNotification(data.message, 'success');
            
            // Refresh user data
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                currentUser = data.user;
                updateAuthUI();
            }
            
            // Reload NFTs
            loadNFTs();
        }
    } catch (error) {
        console.error('Purchase failed:', error);
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
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const fullName = document.getElementById('fullName')?.value || '';
            await register(email, password, fullName);
        });
    }
}

// Initialize the setup
setupEventListeners();


// Make functions available globally
window.login = login;
window.register = register;
window.logout = logout;
window.buyNFT = buyNFT;
window.loadNFTs = loadNFTs;
window.showNotification = showNotification;