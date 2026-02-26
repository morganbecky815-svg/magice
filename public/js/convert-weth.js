// convert-weth.js - FIXED VERSION (copied working pattern from add-eth.js)
console.log('💱 convert-weth.js loaded');

// Global variables
let currentConversionType = 'ethToWeth';
let userEthBalance = 0;
let userWethBalance = 0;
let priceUpdateListener = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 WETH conversion page initializing...');
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login?redirect=convert-weth';
        return;
    }
    
    // Show loading state immediately
    showLoadingState();
    
    // First try to load from localStorage (immediate display)
    loadBalancesFromLocalStorage();
    
    // Then fetch fresh from backend to ensure we have the latest
    fetchUserDataFromBackend();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update ETH price and USD value
    updateEthPriceAndValue();
    
    // Subscribe to live ETH price updates
    subscribeToEthPriceUpdates();
    
    console.log('✅ WETH conversion page initialized');
});

// Show loading state immediately
function showLoadingState() {
    const balanceElements = ['ethBalanceDisplay', 'wethBalanceDisplay', 'ethValueDisplay', 'wethValueDisplay'];
    
    balanceElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            el.style.color = '#888';
            el.style.fontStyle = 'italic';
        }
    });
    
    // Also clear any conversion displays
    const fromBalance = document.getElementById('fromBalance');
    if (fromBalance) {
        fromBalance.textContent = '0.0000';
    }
    
    const toBalance = document.getElementById('toBalance');
    if (toBalance) {
        toBalance.textContent = '0.0000';
    }
    
    const receiveAmount = document.getElementById('receiveAmount');
    if (receiveAmount) {
        receiveAmount.textContent = '0.0000 WETH';
    }
}

// Subscribe to ETH price updates
function subscribeToEthPriceUpdates() {
    if (priceUpdateListener && window.ethPriceService) {
        window.ethPriceService.unsubscribe(priceUpdateListener);
    }
    
    if (!window.ethPriceService) {
        console.log('⏳ Waiting for ETH price service...');
        setTimeout(subscribeToEthPriceUpdates, 1000);
        return;
    }
    
    console.log("✅ WETH page subscribing to price updates");
    
    priceUpdateListener = (newPrice) => {
        console.log("🔄 WETH page received price update: $", newPrice);
        updateEthPriceAndValue();
    };
    
    window.ethPriceService.subscribe(priceUpdateListener);
    
    setTimeout(() => {
        if (window.ethPriceService) {
            window.ethPriceService.updateAllDisplays();
        }
    }, 500);
}

// Update ETH price and USD value
function updateEthPriceAndValue() {
    const ethPrice = getCurrentEthPrice();
    
    // Update ETH value
    const ethValueEl = document.getElementById('ethValueDisplay');
    if (ethValueEl) {
        ethValueEl.textContent = `$${(userEthBalance * ethPrice).toFixed(2)} USD`;
    }
    
    // Update WETH value
    const wethValueEl = document.getElementById('wethValueDisplay');
    if (wethValueEl) {
        wethValueEl.textContent = `$${(userWethBalance * ethPrice).toFixed(2)} USD`;
    }
}

// Get current ETH price
function getCurrentEthPrice() {
    if (window.ethPriceService && window.ethPriceService.currentPrice) {
        return window.ethPriceService.currentPrice;
    } else if (window.ETH_PRICE) {
        return window.ETH_PRICE;
    } else {
        const cached = localStorage.getItem('ethPriceCache');
        if (cached) {
            try {
                const cacheData = JSON.parse(cached);
                return cacheData.price || 2500;
            } catch (e) {
                return 2500;
            }
        }
        return 2500;
    }
}

// Load balances from localStorage immediately
function loadBalancesFromLocalStorage() {
    console.log('🔍 Checking localStorage for user data...');
    
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.log('❌ No user data in localStorage');
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        console.log('👤 User from localStorage:', user);
        
        // Try different balance field names
        userEthBalance = user.ethBalance || user.balance || user.internalBalance || 0;
        userWethBalance = user.wethBalance || 0;
        
        console.log(`💰 Balances from localStorage - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
        
        // Update display
        updateBalanceDisplay();
        
    } catch (error) {
        console.error('❌ Error parsing user from localStorage:', error);
    }
}

// Fetch user data from backend (like add-eth.js does)
async function fetchUserDataFromBackend() {
    console.log('📡 Fetching user data from backend...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No token');
        }
        
        console.log('🔑 Making API request to /api/user/me/profile');
        
        const response = await fetch('/api/user/me/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📥 API Response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login?redirect=convert-weth';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 API Response data:', data);
        
        if (data.success && data.user) {
            const user = data.user;
            console.log('👤 User from backend:', user);
            
            // Get balances - check different possible field names
            userEthBalance = user.ethBalance || user.balance || user.internalBalance || 0;
            userWethBalance = user.wethBalance || 0;
            
            console.log(`💰 Balances from backend - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
            
            // Update localStorage
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...currentUser, ...user };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Update display
            updateBalanceDisplay();
            updateEthPriceAndValue();
            
            console.log('✅ User data loaded successfully');
        }
        
    } catch (error) {
        console.error('❌ Error fetching from backend:', error);
        // Keep showing loading state - don't show error
    }
}

// Update balance display
function updateBalanceDisplay() {
    console.log('📊 Updating balance display - ETH:', userEthBalance, 'WETH:', userWethBalance);
    
    const ethBalanceEl = document.getElementById('ethBalanceDisplay');
    if (ethBalanceEl) {
        ethBalanceEl.textContent = `${userEthBalance.toFixed(4)} ETH`;
        ethBalanceEl.style.cssText = 'color: #333; font-weight: 600; font-style: normal;';
    }
    
    const wethBalanceEl = document.getElementById('wethBalanceDisplay');
    if (wethBalanceEl) {
        wethBalanceEl.textContent = `${userWethBalance.toFixed(4)} WETH`;
        wethBalanceEl.style.cssText = 'color: #333; font-weight: 600; font-style: normal;';
    }
    
    // Update from/to balances based on current type
    if (currentConversionType === 'ethToWeth') {
        const fromBalance = document.getElementById('fromBalance');
        if (fromBalance) fromBalance.textContent = userEthBalance.toFixed(4);
        
        const toBalance = document.getElementById('toBalance');
        if (toBalance) toBalance.textContent = userWethBalance.toFixed(4);
        
        const availableBalance = document.getElementById('availableBalance');
        if (availableBalance) availableBalance.textContent = userEthBalance.toFixed(4);
    } else {
        const fromBalance = document.getElementById('fromBalance');
        if (fromBalance) fromBalance.textContent = userWethBalance.toFixed(4);
        
        const toBalance = document.getElementById('toBalance');
        if (toBalance) toBalance.textContent = userEthBalance.toFixed(4);
        
        const availableBalance = document.getElementById('availableBalance');
        if (availableBalance) availableBalance.textContent = userWethBalance.toFixed(4);
    }
    
    updateEthPriceAndValue();
}

// Setup event listeners
function setupEventListeners() {
    const amountInput = document.getElementById('convertAmount');
    if (amountInput) {
        amountInput.addEventListener('input', updateConversionPreview);
    }
    
    window.addEventListener('storage', (event) => {
        if (event.key === 'user') {
            console.log('📦 User data updated in another tab');
            loadBalancesFromLocalStorage();
        }
    });
}

// Select conversion type
function selectConversionType(type) {
    console.log(`🔄 Selecting conversion type: ${type}`);
    currentConversionType = type;
    
    // Update active tab
    document.querySelectorAll('.conversion-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (type === 'ethToWeth') {
        const tab = document.querySelector('.conversion-tab:first-child');
        if (tab) tab.classList.add('active');
        
        // Update UI
        updateElementText('fromSymbol', 'ETH');
        updateElementText('toSymbol', 'WETH');
        updateElementText('fromBalance', userEthBalance.toFixed(4));
        updateElementText('toBalance', userWethBalance.toFixed(4));
        updateElementText('inputCurrency', 'ETH');
        updateElementText('availableCurrency', 'ETH');
        updateElementText('receiveAmount', '0.0000 WETH');
        updateElementText('availableBalance', userEthBalance.toFixed(4));
        
        // Hide warning
        const warningEl = document.getElementById('ethBalanceWarning');
        if (warningEl) warningEl.style.display = 'none';
        
    } else {
        const tab = document.querySelector('.conversion-tab:last-child');
        if (tab) tab.classList.add('active');
        
        // Update UI
        updateElementText('fromSymbol', 'WETH');
        updateElementText('toSymbol', 'ETH');
        updateElementText('fromBalance', userWethBalance.toFixed(4));
        updateElementText('toBalance', userEthBalance.toFixed(4));
        updateElementText('inputCurrency', 'WETH');
        updateElementText('availableCurrency', 'WETH');
        updateElementText('receiveAmount', '0.0000 ETH');
        updateElementText('availableBalance', userWethBalance.toFixed(4));
        
        // Check 15% requirement
        checkEthBalanceRequirement();
    }
    
    const amountInput = document.getElementById('convertAmount');
    if (amountInput) amountInput.value = '';
    
    updateConversionPreview();
}

// Helper to safely update element text
function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// Check 15% ETH balance requirement
function checkEthBalanceRequirement() {
    const warningElement = document.getElementById('ethBalanceWarning');
    if (!warningElement) return;
    
    if (currentConversionType === 'wethToEth') {
        const requiredEth = userWethBalance * 0.15;
        const requiredEl = document.getElementById('requiredEthAmount');
        if (requiredEl) requiredEl.textContent = requiredEth.toFixed(4);
        
        if (userEthBalance < requiredEth) {
            warningElement.style.display = 'flex';
            console.log(`⚠ ETH requirement: Need ${requiredEth.toFixed(4)} ETH, have ${userEthBalance.toFixed(4)} ETH`);
        } else {
            warningElement.style.display = 'none';
        }
    } else {
        warningElement.style.display = 'none';
    }
}

// Set maximum amount
function setMaxAmount() {
    let maxAmount = 0;
    
    if (currentConversionType === 'ethToWeth') {
        maxAmount = userEthBalance;
    } else {
        const requiredEth = userWethBalance * 0.15;
        if (userEthBalance < requiredEth) {
            alert(`Cannot convert WETH to ETH. You need at least ${requiredEth.toFixed(4)} ETH balance.`);
            return;
        }
        maxAmount = userWethBalance;
    }
    
    const amountInput = document.getElementById('convertAmount');
    if (amountInput) {
        amountInput.value = (maxAmount * 0.99).toFixed(4);
        updateConversionPreview();
    }
}

// Update conversion preview
function updateConversionPreview() {
    const amountInput = document.getElementById('convertAmount');
    const convertBtn = document.getElementById('convertBtn');
    
    if (!amountInput || !convertBtn) return;
    
    const amount = parseFloat(amountInput.value) || 0;
    
    convertBtn.disabled = true;
    
    if (amount <= 0) {
        const receiveText = currentConversionType === 'ethToWeth' ? '0.0000 WETH' : '0.0000 ETH';
        updateElementText('toBalance', '0.0000');
        updateElementText('receiveAmount', receiveText);
        return;
    }
    
    // Check if user has enough balance
    let hasEnoughBalance = false;
    if (currentConversionType === 'ethToWeth') {
        hasEnoughBalance = amount <= userEthBalance;
    } else {
        hasEnoughBalance = amount <= userWethBalance;
        if (hasEnoughBalance) {
            const requiredEth = amount * 0.15;
            if (userEthBalance < requiredEth) {
                alert(`Insufficient ETH balance. Need ${requiredEth.toFixed(4)} ETH for this conversion.`);
                hasEnoughBalance = false;
            }
        }
    }
    
    if (!hasEnoughBalance) {
        updateElementText('toBalance', 'Insufficient');
        updateElementText('receiveAmount', 'Insufficient balance');
        return;
    }
    
    const receive = amount;
    const receiveText = `${receive.toFixed(4)} ${currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH'}`;
    
    updateElementText('toBalance', receive.toFixed(4));
    updateElementText('receiveAmount', receiveText);
    
    // Update fee
    const ethPrice = getCurrentEthPrice();
    const estimatedFee = amount * 0.001 * ethPrice;
    const feeEl = document.getElementById('estimatedFee');
    if (feeEl) feeEl.textContent = `~$${estimatedFee.toFixed(2)}`;
    
    convertBtn.disabled = false;
}

// Execute conversion
async function executeConversion() {
    const amountInput = document.getElementById('convertAmount');
    const amount = parseFloat(amountInput?.value || 0);
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        alert('Please login first');
        window.location.href = '/login';
        return;
    }
    
    const user = JSON.parse(userStr);
    
    // Validate balance
    if (currentConversionType === 'ethToWeth' && amount > userEthBalance) {
        alert(`Insufficient ETH balance. You have ${userEthBalance.toFixed(4)} ETH.`);
        return;
    }
    
    if (currentConversionType === 'wethToEth') {
        if (amount > userWethBalance) {
            alert(`Insufficient WETH balance. You have ${userWethBalance.toFixed(4)} WETH.`);
            return;
        }
        
        const requiredEth = amount * 0.15;
        if (userEthBalance < requiredEth) {
            alert(`Cannot convert. You need at least ${requiredEth.toFixed(4)} ETH balance.`);
            return;
        }
    }
    
    // Show loading
    const convertBtn = document.getElementById('convertBtn');
    const originalText = convertBtn ? convertBtn.innerHTML : 'Convert';
    if (convertBtn) {
        convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
        convertBtn.disabled = true;
    }
    
    try {
        // Use the correct endpoint
        const endpoint = currentConversionType === 'ethToWeth' 
            ? `/api/user/${user._id}/convert-to-weth`
            : `/api/user/${user._id}/convert-to-eth`;
        
        console.log(`📤 Calling endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Conversion failed');
        }
        
        if (data.success) {
            // Update balances from response
            if (data.user) {
                userEthBalance = data.user.ethBalance || userEthBalance;
                userWethBalance = data.user.wethBalance || userWethBalance;
                
                // Update localStorage
                const updatedUser = { ...user, ...data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            
            // Update display
            updateBalanceDisplay();
            checkEthBalanceRequirement();
            
            // Reset form
            if (amountInput) amountInput.value = '';
            updateConversionPreview();
            
            // Show success
            const fromCurrency = currentConversionType === 'ethToWeth' ? 'ETH' : 'WETH';
            const toCurrency = currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH';
            
            alert(`✅ Successfully converted ${amount.toFixed(4)} ${fromCurrency} to ${toCurrency}!`);
        }
        
    } catch (error) {
        console.error('❌ Conversion error:', error);
        alert('Conversion failed: ' + error.message);
        
    } finally {
        // Reset button
        if (convertBtn) {
            convertBtn.innerHTML = originalText;
            convertBtn.disabled = false;
        }
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (priceUpdateListener && window.ethPriceService) {
        window.ethPriceService.unsubscribe(priceUpdateListener);
    }
});

// Make functions globally available
window.selectConversionType = selectConversionType;
window.setMaxAmount = setMaxAmount;
window.updateConversionPreview = updateConversionPreview;
window.executeConversion = executeConversion;

console.log('✅ Fixed WETH conversion functions loaded');
