// ============================================
// DASHBOARD.JS - COMPLETE VERSION
// ============================================

let currentDashboardUser = null;
let currentConversionType = 'ethToWeth';
let ETH_PRICE = window.ETH_PRICE || localStorage.getItem('currentEthPrice') ||2500; // Default price
const MARKETPLACE_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e90E4343A9B";

// Replace direct CoinGecko calls with:
async function updateEthDisplay() {
    if (window.ethPriceService) {
      const price = await window.ethPriceService.getPrice();
      // Update your display
      document.getElementById('ethPrice').textContent = `$${price}`;
    }
  }

// ============================================
// UPDATED DASHBOARD.JS WITH /me ENDPOINTS
// ============================================

// ✅ Fetch user data using /me/profile endpoint
async function fetchUserFromBackend() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ No token found');
            throw new Error('No authentication token');
        }
        
        console.log('🔄 Fetching user data from /me/profile...');
        
        const response = await fetch('/api/user/me/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error response:', errorText);
            
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                throw new Error('Session expired. Please login again.');
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Server response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch user data');
        }
        
        console.log('✅ Fresh user data from server:', result.user.email);
        
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(result.user));
        
        return result.user;
        
    } catch (error) {
        console.error('❌ Failed to fetch user from backend:', error.message);
        
        // If it's an auth error, redirect to login
        if (error.message.includes('Session expired') || 
            error.message.includes('401') || 
            error.message.includes('authenticate')) {
            window.location.href = '/login';
        }
        
        return null;
    }
}

// ✅ Fetch complete dashboard data
async function fetchDashboardData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token');
        
        console.log('📊 Fetching dashboard data from /me/dashboard...');
        
        const response = await fetch('/api/user/me/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch dashboard data');
        }
        
        console.log('✅ Dashboard data loaded:', result.dashboard.user.email);
        return result.dashboard;
        
    } catch (error) {
        console.error('❌ Failed to fetch dashboard:', error.message);
        return null;
    }
}

// ✅ UPDATED loadDashboard function
async function loadDashboard() {
    console.log("🚀 Dashboard initializing with API...");
    
    // Get token
    const token = localStorage.getItem('token');
    console.log("🔑 Token exists:", !!token);
    
    if (!token) {
        console.log("❌ No token found, redirecting to login");
        window.location.href = '/login';
        return;
    }
    
    // Try to fetch fresh data from server FIRST
    console.log("🔄 Fetching fresh user data from server...");
    const freshUser = await fetchUserFromBackend();
    
    let user;
    if (freshUser) {
        // Use fresh data from server
        user = freshUser;
        console.log("✅ Using fresh data from server");
        
        // Also load full dashboard data (NFTs, activity, etc.)
        const dashboardData = await fetchDashboardData();
        if (dashboardData) {
            console.log("✅ Loaded complete dashboard data");
            // You can use this data to populate NFTs, activity feeds, etc.
        }
        
    } else {
        // Fall back to localStorage (offline mode)
        console.log("⚠️ Using cached localStorage data");
        const userData = localStorage.getItem('user');
        
        if (!userData || userData === 'null' || userData === 'undefined') {
            window.location.href = '/login';
            return;
        }
        
        try {
            user = JSON.parse(userData);
        } catch (e) {
            console.error("❌ Error parsing user data:", e);
            window.location.href = '/login';
            return;
        }
    }
    
    // Set global variables
    currentDashboardUser = user;
    console.log("🎯 Dashboard ready for:", user.email);
    console.log("💰 User ETH balance:", user.ethBalance);
    console.log("💰 User WETH balance:", user.wethBalance);
    
    // Display dashboard
    displayDashboardData(user);
    
    // Load additional features
    setTimeout(() => {
        if (typeof updateMarketTrends === 'function') {
            updateMarketTrends();
        }
    }, 1000);
}

// ✅ UPDATED executeConversion function
async function executeConversion() {
    const amountInput = document.getElementById('conversionAmount');
    if (!amountInput || !currentDashboardUser) return;
    
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login again');
        window.location.href = '/login';
        return;
    }
    
    try {
        console.log(`🔄 Converting ${amount} ETH to WETH...`);
        
        // Use /me/convert-to-weth endpoint
        const response = await fetch('/api/user/me/convert-to-weth', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount
            })
        });
        
        const result = await response.json();
        console.log('Conversion response:', result);
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Conversion failed');
        }
        
        // Update local user data with server response
        currentDashboardUser.ethBalance = result.user.ethBalance;
        currentDashboardUser.wethBalance = result.user.wethBalance;
        currentDashboardUser.balance = result.user.balance;
        
        // Save updated data to localStorage
        localStorage.setItem('user', JSON.stringify(currentDashboardUser));
        
        // Update display
        displayDashboardData(currentDashboardUser);
        
        // Show success
        alert(`✅ Successfully converted ${amount.toFixed(4)} ETH to WETH!`);
        closeModal('wethConversionModal');
        
    } catch (error) {
        console.error('Conversion error:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard initializing...');
    loadDashboard();
}, 500);

// Auto-refresh market trends every 30 seconds
setTimeout(updateMarketTrends, 1000);
setInterval(updateMarketTrends, 30000);


// REPLACE your current loadDashboard() function with this:
async function loadDashboard() {
    console.log("🔍 DASHBOARD.JS - LOADING WITH API...");
    
    // Get token
    const token = localStorage.getItem('token');
    console.log("🔑 Token exists:", !!token);
    
    if (!token) {
        console.log("❌ No token found, redirecting to login");
        window.location.href = '/login';
        return;
    }
    
    // Try to fetch fresh data from server FIRST
    console.log("🔄 Fetching fresh user data from server...");
    const freshUser = await fetchUserFromBackend();
    
    let user;
    if (freshUser) {
        // Use fresh data from server
        user = freshUser;
        console.log("✅ Using fresh data from server");
    } else {
        // Fall back to localStorage (for offline mode)
        console.log("⚠️ Using cached localStorage data");
        const userData = localStorage.getItem('user');
        
        if (!userData || userData === 'null' || userData === 'undefined') {
            window.location.href = '/login';
            return;
        }
        
        try {
            user = JSON.parse(userData);
        } catch (e) {
            console.error("❌ Error parsing user data:", e);
            window.location.href = '/login';
            return;
        }
    }
    
    // Set global variables
    currentDashboardUser = user;
    console.log("🎯 Dashboard ready for:", user.email);
    console.log("💰 User balance from server:", user.balance);
    console.log("💰 User ETH balance:", user.ethBalance);
    console.log("💰 User WETH balance:", user.wethBalance);
    
    // Display dashboard
    displayDashboardData(user);
    
    // Load additional features
    setTimeout(() => {
        if (typeof updateMarketTrends === 'function') {
            updateMarketTrends();
        }
    }, 1000);
}

// Display dashboard data
function displayDashboardData(user) {
    console.log("📊 Displaying dashboard data for:", user.email);
    console.log("💰 Current ETH price:", ETH_PRICE);
    
    // Welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const name = user.fullName || user.email.split('@')[0];
        const hour = new Date().getHours();
        let greeting = "Good ";
        if (hour < 12) greeting += "morning";
        else if (hour < 18) greeting += "afternoon";
        else greeting += "evening";
        welcomeMessage.textContent = `${greeting}, ${name}!`;
    }
    
    // Update ETH balance
    const ethBalanceEl = document.getElementById('ethBalance');
    const ethValueEl = document.getElementById('ethValue');
    
    if (ethBalanceEl) ethBalanceEl.textContent = `${user.ethBalance.toFixed(4)} ETH`;
    if (ethValueEl) ethValueEl.textContent = `$${(user.ethBalance * ETH_PRICE).toFixed(2)}`;
    
    // Update WETH balance
    const wethBalanceEl = document.getElementById('wethBalance');
    const wethValueEl = document.getElementById('wethValue');
    if (wethBalanceEl) wethBalanceEl.textContent = `${user.wethBalance.toFixed(4)} WETH`;
    if (wethValueEl) wethValueEl.textContent = `$${(user.wethBalance * ETH_PRICE).toFixed(2)}`;
    
    // Calculate and display portfolio
    updatePortfolioDisplay(user);
    
    console.log("✅ Dashboard data displayed");
}

// Add this function to sync with server every 30 seconds
function startPeriodicSync() {
    setInterval(async () => {
        if (currentDashboardUser && localStorage.getItem('token')) {
            console.log('🔄 Periodic sync with server...');
            await fetchUserFromBackend();
            
            // Refresh display if user is on dashboard
            if (window.location.pathname.includes('dashboard')) {
                const userData = localStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    displayDashboardData(user);
                }
            }
        }
    }, 30000); // Every 30 seconds
}

// Call this in your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard initializing...');
    loadDashboard();
    startPeriodicSync(); // Add this line
}, 500);

// Update portfolio display
function updatePortfolioDisplay(user) {
    const portfolioValueEl = document.getElementById('portfolioValue');
    const portfolioChangeEl = document.getElementById('portfolioChange');
    
    if (!portfolioValueEl && !portfolioChangeEl) return;
    
    // Calculate total portfolio value
    const ethValue = (user.ethBalance || 0) * ETH_PRICE;
    const wethValue = (user.wethBalance || 0) * ETH_PRICE;
    const totalPortfolioValue = ethValue + wethValue;
    
    // Update portfolio value
    if (portfolioValueEl) {
        portfolioValueEl.textContent = `$${totalPortfolioValue.toFixed(2)}`;
    }
    
    // Calculate portfolio change
    const portfolioChange = calculatePortfolioChange(totalPortfolioValue);
    
    if (portfolioChangeEl) {
        const isPositive = portfolioChange >= 0;
        portfolioChangeEl.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(portfolioChange).toFixed(1)}%
        `;
        portfolioChangeEl.className = `balance-change ${isPositive ? 'positive' : 'negative'}`;
    }
    
    // Store in history
    updatePortfolioHistory(totalPortfolioValue);
}

// Store portfolio history
function updatePortfolioHistory(currentValue) {
    try {
        const today = new Date().toDateString();
        const portfolioHistory = JSON.parse(localStorage.getItem('portfolioHistory') || '{}');
        
        portfolioHistory[today] = {
            value: currentValue,
            timestamp: Date.now()
        };
        
        localStorage.setItem('portfolioHistory', JSON.stringify(portfolioHistory));
    } catch (error) {
        console.error('Error updating portfolio history:', error);
    }
}

// Calculate portfolio change from history
function calculatePortfolioChange(currentValue) {
    try {
        const portfolioHistory = JSON.parse(localStorage.getItem('portfolioHistory') || '{}');
        const entries = Object.entries(portfolioHistory);
        
        if (entries.length < 2) {
            return 5.2; // Default first-time value
        }
        
        // Get yesterday's value
        const today = new Date().toDateString();
        const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        let yesterdayValue = null;
        for (const [date, data] of sorted) {
            if (date !== today) {
                yesterdayValue = data.value;
                break;
            }
        }
        
        if (!yesterdayValue || yesterdayValue === 0) {
            return 0;
        }
        
        const change = ((currentValue - yesterdayValue) / yesterdayValue) * 100;
        return isNaN(change) ? 0 : change;
    } catch (error) {
        console.error('Error calculating portfolio change:', error);
        return 0;
    }
}

// Market Trends Functions
function updateMarketTrends() {
    console.log('📈 Updating market trends...');
    
    const trendsContainer = document.querySelector('.market-trends');
    if (!trendsContainer) {
        console.log('Market trends container not found');
        return;
    }
    
    // Sample trends with randomization
    const trends = [
        { name: "Art Collection", baseVolume: 1.2, baseChange: 12.5 },
        { name: "Gaming NFTs", baseVolume: 0.85, baseChange: 8.3 },
        { name: "PFPs", baseVolume: 2.1, baseChange: -3.2 },
        { name: "Utility NFTs", baseVolume: 0.6, baseChange: 15.2 },
        { name: "Generative Art", baseVolume: 0.9, baseChange: 7.8 }
    ];
    
    trendsContainer.innerHTML = '';
    
    // Calculate overall market change
    let totalChange = 0;
    
    trends.forEach(trend => {
        // Add small random variation (±15%)
        const randomFactor = 0.85 + (Math.random() * 0.3);
        const volume = trend.baseVolume * randomFactor;
        const change = trend.baseChange * randomFactor;
        
        totalChange += change;
        
        const trendItem = document.createElement('div');
        trendItem.className = 'trend-item';
        trendItem.innerHTML = `
            <div class="trend-info">
                <span class="trend-name">${trend.name}</span>
                <span class="trend-volume">${volume.toFixed(1)}K ETH volume</span>
            </div>
            <div class="trend-change ${change >= 0 ? 'positive' : 'negative'}">
                <i class="fas fa-arrow-${change >= 0 ? 'up' : 'down'}"></i>
                ${Math.abs(change).toFixed(1)}%
            </div>
        `;
        trendsContainer.appendChild(trendItem);
    });
    
    // Update overall market change badge
    const overallChange = totalChange / trends.length;
    const badge = document.querySelector('.trend-badge');
    if (badge) {
        badge.textContent = `${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(1)}%`;
        badge.className = `trend-badge ${overallChange >= 0 ? 'positive' : 'negative'}`;
        
        // Update icon
        const icon = badge.querySelector('i');
        if (icon) {
            icon.className = `fas fa-arrow-${overallChange >= 0 ? 'up' : 'down'}`;
        } else {
            badge.innerHTML = `<i class="fas fa-arrow-${overallChange >= 0 ? 'up' : 'down'}"></i> ${overallChange >= 0 ? '+' : ''}${Math.abs(overallChange).toFixed(1)}%`;
        }
    }
    
    console.log(`Market trends updated. Overall change: ${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(1)}%`);
}

// Basic dashboard functions
function refreshBalance() {
    if (currentDashboardUser) {
        displayDashboardData(currentDashboardUser);
        alert('Balance refreshed!');
    } else {
        alert('Please login first');
    }
}

function transferFunds() {
    alert('Transfer funds feature coming soon!');
}

function showStaking() {
    alert('Staking feature coming soon!');
}

function buyCrypto() {
    window.location.href = '/add-eth';
}

function viewPortfolio() {
    window.location.href = '/profile';
}

// Utility Functions
function openMetaMaskBuy() {
    if (window.ethereum && window.ethereum.isMetaMask) {
        try {
            window.ethereum.request({
                method: 'wallet_buyCrypto',
                params: [{
                    address: MARKETPLACE_WALLET_ADDRESS,
                    symbol: 'ETH'
                }]
            }).then(() => {
                console.log('MetaMask buy opened');
                closeModal('addETHModal');
            }).catch((error) => {
                window.open('https://metamask.io/', '_blank');
            });
        } catch (error) {
            window.open('https://metamask.io/', '_blank');
        }
    } else {
        if (confirm('MetaMask not detected. Install it?')) {
            window.open('https://metamask.io/download/', '_blank');
        }
    }
}

function copyAddress() {
    if (!navigator.clipboard) {
        alert('Clipboard not supported');
        return;
    }
    
    navigator.clipboard.writeText(MARKETPLACE_WALLET_ADDRESS)
        .then(() => {
            alert('Wallet address copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy address');
        });
}

function showDepositInstructions() {
    const instructions = document.getElementById('depositInstructions');
    if (instructions) {
        instructions.style.display = 'block';
    }
}

// WETH Conversion Functions
function showWETHConversion() {
    if (!currentDashboardUser) {
        alert('Please login first');
        return;
    }
    
    // Update balances in modal
    const fromBalance = document.getElementById('fromBalanceAmount');
    const toBalance = document.getElementById('toBalanceAmount');
    
    if (fromBalance) fromBalance.textContent = (currentDashboardUser.ethBalance || 0).toFixed(4);
    if (toBalance) toBalance.textContent = (currentDashboardUser.wethBalance || 0).toFixed(4);
    
    // Reset to ETH to WETH
    selectConversion('ethToWeth');
    
    // Show modal
    const modal = document.getElementById('wethConversionModal');
    if (modal) modal.style.display = 'flex';
}

function selectConversion(type) {
    currentConversionType = type;
    
    const fromCurrency = document.getElementById('fromCurrency');
    const toCurrency = document.getElementById('toCurrency');
    
    if (type === 'ethToWeth') {
        if (fromCurrency) fromCurrency.textContent = 'ETH';
        if (toCurrency) toCurrency.textContent = 'WETH';
    } else {
        if (fromCurrency) fromCurrency.textContent = 'WETH';
        if (toCurrency) toCurrency.textContent = 'ETH';
    }
    
    // Reset amount
    const amountInput = document.getElementById('conversionAmount');
    if (amountInput) amountInput.value = '';
    updateConversionPreview();
}

function setMaxAmount() {
    const amountInput = document.getElementById('conversionAmount');
    if (!amountInput || !currentDashboardUser) return;
    
    let maxAmount = 0;
    if (currentConversionType === 'ethToWeth') {
        maxAmount = currentDashboardUser.ethBalance || 0;
    } else {
        maxAmount = currentDashboardUser.wethBalance || 0;
    }
    
    amountInput.value = maxAmount.toFixed(4);
    updateConversionPreview();
}

function updateConversionPreview() {
    const amountInput = document.getElementById('conversionAmount');
    const conversionResult = document.getElementById('conversionResult');
    const convertButton = document.getElementById('convertButton');
    
    if (!amountInput || !conversionResult || !convertButton || !currentDashboardUser) return;
    
    const amount = parseFloat(amountInput.value) || 0;
    
    if (amount <= 0) {
        conversionResult.textContent = currentConversionType === 'ethToWeth' ? '0.0000 WETH' : '0.0000 ETH';
        convertButton.disabled = true;
        return;
    }
    
    // Check balance
    let hasEnoughBalance = false;
    if (currentConversionType === 'ethToWeth') {
        hasEnoughBalance = amount <= (currentDashboardUser.ethBalance || 0);
    } else {
        hasEnoughBalance = amount <= (currentDashboardUser.wethBalance || 0);
    }
    
    if (!hasEnoughBalance) {
        conversionResult.textContent = 'Insufficient balance';
        convertButton.disabled = true;
        return;
    }
    
    conversionResult.textContent = `${amount.toFixed(4)} ${currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH'}`;
    convertButton.disabled = false;
}

// REPLACE your executeConversion() function with this:
async function executeConversion() {
    const amountInput = document.getElementById('conversionAmount');
    if (!amountInput || !currentDashboardUser) return;
    
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login again');
        window.location.href = '/login';
        return;
    }
    
    try {
        // Call your Node.js API to perform conversion
        const response = await fetch('/api/user/convert', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversionType: currentConversionType,
                amount: amount
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Conversion failed');
        }
        
        const result = await response.json();
        
        // Update local user data with server response
        currentDashboardUser.ethBalance = result.ethBalance;
        currentDashboardUser.wethBalance = result.wethBalance;
        
        // Save updated data to localStorage
        localStorage.setItem('user', JSON.stringify(currentDashboardUser));
        
        // Update display
        displayDashboardData(currentDashboardUser);
        
        // Show success
        const fromCurrency = currentConversionType === 'ethToWeth' ? 'ETH' : 'WETH';
        const toCurrency = currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH';
        alert(`Successfully converted ${amount.toFixed(4)} ${fromCurrency} to ${toCurrency}!`);
        
        closeModal('wethConversionModal');
        
    } catch (error) {
        console.error('Conversion error:', error);
        alert(`Error: ${error.message}`);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Dashboard ETH price updates
function updateDashboardPrices() {
    const ethPrice = window.ETH_PRICE || localStorage.getItem('currentEthPrice') || 2500;
    
    // Update all price displays
    document.querySelectorAll('[data-eth-price]').forEach(el => {
        const ethAmount = parseFloat(el.getAttribute('data-eth-amount') || 0);
        el.textContent = `$${(ethAmount * ethPrice).toFixed(2)}`;
    });
    
    // Update ETH price display
    const ethPriceEl = document.getElementById('currentEthPrice');
    if (ethPriceEl) {
        ethPriceEl.textContent = `$${ethPrice}`;
    }
    
    // Update user balance values
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.ethBalance) {
        document.querySelectorAll('[data-eth-usd]').forEach(el => {
            const usdValue = (user.ethBalance * ethPrice).toFixed(2);
            el.textContent = `$${usdValue}`;
        });
    }
}

// Initialize when dashboard loads
if (window.location.pathname.includes('dashboard')) {
    document.addEventListener('DOMContentLoaded', function() {
        // Update prices on load
        updateDashboardPrices();
        
        // Update every 30 seconds
        setInterval(updateDashboardPrices, 30000);
    });
}

// Make functions globally available
window.refreshBalance = refreshBalance;
window.transferFunds = transferFunds;
window.showStaking = showStaking;
window.showWETHConversion = showWETHConversion;
window.selectConversion = selectConversion;
window.setMaxAmount = setMaxAmount;
window.updateConversionPreview = updateConversionPreview;
window.executeConversion = executeConversion;
window.closeModal = closeModal;
window.openMetaMaskBuy = openMetaMaskBuy;
window.copyAddress = copyAddress;
window.showDepositInstructions = showDepositInstructions;
window.buyCrypto = buyCrypto;
window.viewPortfolio = viewPortfolio;
window.updateMarketTrends = updateMarketTrends;