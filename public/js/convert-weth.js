// convert-weth.js - COMPLETE FIXED VERSION
// Now uses the SAME method as your working dashboard to get balances
console.log('💱 convert-weth.js loaded - FIXED VERSION');

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
    
    // Show loading state
    showLoadingState();
    
    // Try to load from localStorage first (immediate display)
    loadBalancesFromLocalStorage();
    
    // THEN fetch fresh from backend using SAME endpoint as dashboard
    fetchUserDataFromBackend();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update ETH price and USD value
    updateEthPriceAndValue();
    
    // Subscribe to live ETH price updates
    subscribeToEthPriceUpdates();
    
    console.log('✅ WETH conversion page initialized');
});

// Show loading state
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
    
    // Clear conversion displays
    const elements = ['fromBalance', 'toBalance', 'availableBalance', 'receiveAmount'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0.0000';
    });
}

// Load from localStorage immediately (like dashboard does)
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
        
        // Get balances - using same fields as dashboard
        userEthBalance = parseFloat(user.ethBalance || user.balance || user.internalBalance || 0);
        userWethBalance = parseFloat(user.wethBalance || 0);
        
        console.log(`💰 Balances from localStorage - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
        
        // Update display immediately
        updateBalanceDisplay();
        
    } catch (error) {
        console.error('❌ Error parsing user:', error);
    }
}

// Fetch user data from backend - EXACT same as your working dashboard
async function fetchUserDataFromBackend() {
    console.log('📡 Fetching user data from backend using /api/user/me/profile...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ No token found');
            return;
        }
        
        // Use the SAME endpoint that your dashboard uses
        const response = await fetch('/api/user/me/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📥 Response status:', response.status);
        
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
        console.log('📦 API Response:', data);
        
        if (data.success && data.user) {
            const user = data.user;
            
            // Get balances - use same field names as dashboard
            // Your dashboard shows 4.0000 ETH, so this field exists!
            userEthBalance = parseFloat(user.ethBalance || user.balance || user.internalBalance || 0);
            userWethBalance = parseFloat(user.wethBalance || 0);
            
            console.log(`💰 Balances from backend - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
            
            // Save to localStorage (like dashboard does)
            localStorage.setItem('user', JSON.stringify(user));
            
            // Update all displays
            updateBalanceDisplay();
            updateEthPriceAndValue();
            
            // Update the conversion display based on current type
            if (currentConversionType === 'ethToWeth') {
                document.getElementById('fromBalance').textContent = userEthBalance.toFixed(4);
                document.getElementById('toBalance').textContent = userWethBalance.toFixed(4);
                document.getElementById('availableBalance').textContent = userEthBalance.toFixed(4);
            } else {
                document.getElementById('fromBalance').textContent = userWethBalance.toFixed(4);
                document.getElementById('toBalance').textContent = userEthBalance.toFixed(4);
                document.getElementById('availableBalance').textContent = userWethBalance.toFixed(4);
            }
        }
        
    } catch (error) {
        console.error('❌ Error fetching user data:', error);
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
    
    console.log("✅ Subscribing to price updates");
    
    priceUpdateListener = (newPrice) => {
        console.log("🔄 Price update received: $", newPrice);
        updateEthPriceAndValue();
    };
    
    window.ethPriceService.subscribe(priceUpdateListener);
}

// Update ETH price and USD value
function updateEthPriceAndValue() {
    const ethPrice = getCurrentEthPrice();
    
    const ethValueEl = document.getElementById('ethValueDisplay');
    if (ethValueEl) {
        ethValueEl.textContent = `$${(userEthBalance * ethPrice).toFixed(2)}`;
        ethValueEl.style.color = '#333';
        ethValueEl.style.fontStyle = 'normal';
    }
    
    const wethValueEl = document.getElementById('wethValueDisplay');
    if (wethValueEl) {
        wethValueEl.textContent = `$${(userWethBalance * ethPrice).toFixed(2)}`;
        wethValueEl.style.color = '#333';
        wethValueEl.style.fontStyle = 'normal';
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

// Update balance display
function updateBalanceDisplay() {
    console.log(`📊 Updating display - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
    
    const ethBalanceEl = document.getElementById('ethBalanceDisplay');
    if (ethBalanceEl) {
        ethBalanceEl.textContent = `${userEthBalance.toFixed(4)} ETH`;
        ethBalanceEl.style.color = '#333';
        ethBalanceEl.style.fontWeight = '600';
        ethBalanceEl.style.fontStyle = 'normal';
    }
    
    const wethBalanceEl = document.getElementById('wethBalanceDisplay');
    if (wethBalanceEl) {
        wethBalanceEl.textContent = `${userWethBalance.toFixed(4)} WETH`;
        wethBalanceEl.style.color = '#333';
        wethBalanceEl.style.fontWeight = '600';
        wethBalanceEl.style.fontStyle = 'normal';
    }
    
    // Update conversion section based on current type
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
    
    // Listen for storage changes (if user updates in another tab)
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
        updateElementText('availableBalance', userEthBalance.toFixed(4));
        updateElementText('receiveAmount', '0.0000 WETH');
        
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
        updateElementText('availableBalance', userWethBalance.toFixed(4));
        updateElementText('receiveAmount', '0.0000 ETH');
        
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
            console.log(`⚠ Need ${requiredEth.toFixed(4)} ETH, have ${userEthBalance.toFixed(4)} ETH`);
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
            alert(`Need at least ${requiredEth.toFixed(4)} ETH balance.`);
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
                alert(`Need ${requiredEth.toFixed(4)} ETH for conversion.`);
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
        alert(`Insufficient ETH. You have ${userEthBalance.toFixed(4)} ETH.`);
        return;
    }
    
    if (currentConversionType === 'wethToEth') {
        if (amount > userWethBalance) {
            alert(`Insufficient WETH. You have ${userWethBalance.toFixed(4)} WETH.`);
            return;
        }
        
        const requiredEth = amount * 0.15;
        if (userEthBalance < requiredEth) {
            alert(`Need ${requiredEth.toFixed(4)} ETH balance.`);
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
        const endpoint = currentConversionType === 'ethToWeth' 
            ? `/api/user/${user._id}/convert-to-weth`
            : `/api/user/${user._id}/convert-to-eth`;
        
        console.log(`📤 Calling: ${endpoint}`);
        
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
            throw new Error(data.error || 'Conversion failed');
        }
        
        if (data.success) {
            if (data.user) {
                userEthBalance = parseFloat(data.user.ethBalance || userEthBalance);
                userWethBalance = parseFloat(data.user.wethBalance || userWethBalance);
                
                // Update localStorage
                localStorage.setItem('user', JSON.stringify({ ...user, ...data.user }));
            }
            
            // Update display
            updateBalanceDisplay();
            checkEthBalanceRequirement();
            
            // Reset form
            if (amountInput) amountInput.value = '';
            updateConversionPreview();
            
            alert(`✅ Successfully converted ${amount.toFixed(4)}!`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Conversion failed: ' + error.message);
        
    } finally {
        if (convertBtn) {
            convertBtn.innerHTML = originalText;
            convertBtn.disabled = false;
        }
    }
}

// Clean up
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

console.log('✅ Fixed convert-weth.js loaded - ready to show REAL balances!');
