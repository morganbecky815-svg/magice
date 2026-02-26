// convert-weth.js - COMPLETE FIXED VERSION with bulletproof auth & data syncing
console.log('💱 convert-weth.js loaded');

let currentConversionType = 'ethToWeth';
let userEthBalance = 0;
let userWethBalance = 0;
let priceUpdateListener = null;

// Get current ETH price
function getCurrentEthPrice() {
    return window.ethPriceService?.currentPrice || 2500;
}

// ✅ Fetch user data from backend (BULLETPROOF VERSION)
async function fetchUserFromBackend() {
    try {
        // 1. Check all possible token names your app uses
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('❌ No token found');
            window.location.href = '/login?redirect=convert-weth';
            return null;
        }
        
        console.log('📡 Fetching fresh user data from backend...');
        
        // 2. Try the singular route first
        let response = await fetch('/api/user/me/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 3. Fallback: If 404, try the plural route just in case!
        if (response.status === 404) {
            console.log('⚠️ Singular route failed, trying plural /api/users/me/profile...');
            response = await fetch('/api/users/me/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear(); // Clear all bad auth data
                window.location.href = '/login?redirect=convert-weth';
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch user');
        
        console.log('✅ Fresh user data fetched:', {
            eth: result.user.internalBalance,
            weth: result.user.wethBalance
        });
        
        // 4. 🔥 CRITICAL: Force-update ALL localStorage variations so the Dashboard syncs!
        localStorage.setItem('user', JSON.stringify(result.user));
        if (localStorage.getItem('currentUser')) {
            localStorage.setItem('currentUser', JSON.stringify(result.user));
        }
        if (localStorage.getItem('magicEdenCurrentUser')) {
            localStorage.setItem('magicEdenCurrentUser', JSON.stringify(result.user));
        }
        
        return result.user;
        
    } catch (error) {
        console.error('❌ Failed to fetch user data:', error);
        return null;
    }
}

// ✅ Update USD displays
function updateUSDDisplays(ethPrice) {
    const ethValueEl = document.getElementById('ethValueDisplay');
    const wethValueEl = document.getElementById('wethValueDisplay');
    
    if (ethValueEl) {
        ethValueEl.textContent = `$${(userEthBalance * ethPrice).toFixed(2)}`;
        ethValueEl.style.transition = 'color 0.3s ease';
        ethValueEl.style.color = '#10b981';
        setTimeout(() => {
            ethValueEl.style.color = '#888';
        }, 500);
    }
    
    if (wethValueEl) {
        wethValueEl.textContent = `$${(userWethBalance * ethPrice).toFixed(2)}`;
        wethValueEl.style.transition = 'color 0.3s ease';
        wethValueEl.style.color = '#10b981';
        setTimeout(() => {
            wethValueEl.style.color = '#888';
        }, 500);
    }
}

// ✅ Subscribe to price updates
function subscribeToEthPriceUpdates() {
    if (priceUpdateListener && window.ethPriceService) {
        window.ethPriceService.unsubscribe(priceUpdateListener);
    }
    
    if (!window.ethPriceService) {
        console.log('⏳ Waiting for ETH price service...');
        setTimeout(subscribeToEthPriceUpdates, 500);
        return;
    }
    
    console.log("✅ Subscribing to price updates");
    
    priceUpdateListener = (newPrice) => {
        console.log("🔄 Price update received");
        updateUSDDisplays(newPrice);
    };
    
    window.ethPriceService.subscribe(priceUpdateListener);
    
    setTimeout(() => {
        if (window.ethPriceService) {
            window.ethPriceService.updateAllDisplays();
        }
    }, 100);
}

// ✅ Display user data
function displayUserData(user) {
    if (!user) return;
    
    console.log('📊 Displaying user data with balances:', {
        internalBalance: user.internalBalance,
        wethBalance: user.wethBalance
    });
    
    // Use the correct fields from your database
    userEthBalance = parseFloat(user.internalBalance || 0);
    userWethBalance = parseFloat(user.wethBalance || 0);
    
    // Update ETH Balance display
    const ethBalanceEl = document.getElementById('ethBalanceDisplay');
    if (ethBalanceEl) {
        ethBalanceEl.textContent = `${userEthBalance.toFixed(4)} ETH`;
        ethBalanceEl.style.color = '#10b981';
        ethBalanceEl.style.fontWeight = '600';
    }
    
    // Update WETH Balance display
    const wethBalanceEl = document.getElementById('wethBalanceDisplay');
    if (wethBalanceEl) {
        wethBalanceEl.textContent = `${userWethBalance.toFixed(4)} WETH`;
        wethBalanceEl.style.color = '#8a2be2'; // Purple for WETH
        wethBalanceEl.style.fontWeight = '600';
    }
    
    // Update USD displays
    updateUSDDisplays(getCurrentEthPrice());
    
    // Update conversion sections based on current type
    if (currentConversionType === 'ethToWeth') {
        updateElementText('fromBalance', userEthBalance.toFixed(4));
        updateElementText('toBalance', userWethBalance.toFixed(4));
        updateElementText('availableBalance', userEthBalance.toFixed(4));
    } else {
        updateElementText('fromBalance', userWethBalance.toFixed(4));
        updateElementText('toBalance', userEthBalance.toFixed(4));
        updateElementText('availableBalance', userWethBalance.toFixed(4));
    }
}

// Helper to update element text
function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// Show loading states
function showLoadingStates() {
    const ethBalanceEl = document.getElementById('ethBalanceDisplay');
    const wethBalanceEl = document.getElementById('wethBalanceDisplay');
    const ethValueEl = document.getElementById('ethValueDisplay');
    const wethValueEl = document.getElementById('wethValueDisplay');
    
    if (ethBalanceEl) ethBalanceEl.innerHTML = '<span class="loading-skeleton">0.0000 ETH</span>';
    if (wethBalanceEl) wethBalanceEl.innerHTML = '<span class="loading-skeleton">0.0000 WETH</span>';
    if (ethValueEl) ethValueEl.innerHTML = '<span class="loading-skeleton">$0.00</span>';
    if (wethValueEl) wethValueEl.innerHTML = '<span class="loading-skeleton">$0.00</span>';
}

// Storage event listener
window.addEventListener('storage', function(event) {
    if (event.key === 'user' && event.newValue) {
        console.log('📦 User data changed in localStorage');
        try {
            const updatedUser = JSON.parse(event.newValue);
            if (updatedUser) {
                displayUserData(updatedUser);
            }
        } catch (e) {
            console.error('Error in storage event:', e);
        }
    }
});

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 WETH conversion page initializing...');
    
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login?redirect=convert-weth';
        return;
    }
    
    // Show loading states
    showLoadingStates();
    
    // Subscribe to price updates immediately
    subscribeToEthPriceUpdates();
    
    // Try to get user from localStorage for immediate display
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            displayUserData(user);
        } catch (e) {
            console.error('Error parsing user:', e);
        }
    }
    
    // Then fetch fresh data from backend (this fixes the ghost data issue)
    const freshUser = await fetchUserFromBackend();
    if (freshUser) {
        displayUserData(freshUser);
    }
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ WETH conversion page ready');
});

// Setup event listeners
function setupEventListeners() {
    const amountInput = document.getElementById('convertAmount');
    if (amountInput) {
        amountInput.addEventListener('input', updateConversionPreview);
    }
}

// Select conversion type
function selectConversionType(type) {
    console.log(`🔄 Selecting conversion type: ${type}`);
    currentConversionType = type;
    
    document.querySelectorAll('.conversion-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (type === 'ethToWeth') {
        document.querySelector('.conversion-tab:first-child')?.classList.add('active');
        updateElementText('fromSymbol', 'ETH');
        updateElementText('toSymbol', 'WETH');
        updateElementText('inputCurrency', 'ETH');
        updateElementText('availableCurrency', 'ETH');
        updateElementText('receiveAmount', '0.0000 WETH');
        
        const warningEl = document.getElementById('ethBalanceWarning');
        if (warningEl) warningEl.style.display = 'none';
        
        // Update balances based on fresh global variables
        updateElementText('fromBalance', userEthBalance.toFixed(4));
        updateElementText('toBalance', userWethBalance.toFixed(4));
        updateElementText('availableBalance', userEthBalance.toFixed(4));
        
    } else {
        document.querySelector('.conversion-tab:last-child')?.classList.add('active');
        updateElementText('fromSymbol', 'WETH');
        updateElementText('toSymbol', 'ETH');
        updateElementText('inputCurrency', 'WETH');
        updateElementText('availableCurrency', 'WETH');
        updateElementText('receiveAmount', '0.0000 ETH');
        
        checkEthBalanceRequirement();
        
        // Update balances based on fresh global variables
        updateElementText('fromBalance', userWethBalance.toFixed(4));
        updateElementText('toBalance', userEthBalance.toFixed(4));
        updateElementText('availableBalance', userWethBalance.toFixed(4));
    }
    
    const amountInput = document.getElementById('convertAmount');
    if (amountInput) amountInput.value = '';
    
    updateConversionPreview();
}

// Check 15% ETH balance requirement
function checkEthBalanceRequirement() {
    const warningEl = document.getElementById('ethBalanceWarning');
    if (!warningEl) return;
    
    if (currentConversionType === 'wethToEth') {
        const requiredEth = userWethBalance * 0.15;
        
        const requiredEl = document.getElementById('requiredEthAmount');
        if (requiredEl) requiredEl.textContent = requiredEth.toFixed(4);
        
        warningEl.style.display = userEthBalance < requiredEth ? 'flex' : 'none';
    } else {
        warningEl.style.display = 'none';
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
            alert(`Cannot convert WETH to ETH. You need at least ${requiredEth.toFixed(4)} ETH balance to cover fees.`);
            return;
        }
        maxAmount = userWethBalance;
    }
    
    const amountInput = document.getElementById('convertAmount');
    if (amountInput) {
        amountInput.value = (maxAmount * 0.99).toFixed(4); // Leave a tiny bit for dust rounding
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
    
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        alert('Please login first');
        window.location.href = '/login';
        return;
    }
    
    const user = JSON.parse(userStr);
    
    // Validate balance locally before sending
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
    
    const convertBtn = document.getElementById('convertBtn');
    const originalText = convertBtn?.innerHTML || 'Convert';
    if (convertBtn) {
        convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
        convertBtn.disabled = true;
    }
    
    try {
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
        
        if (data.success && data.user) {
            // Update localStorage with new user data
            localStorage.setItem('user', JSON.stringify(data.user));
            if (localStorage.getItem('currentUser')) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
            }
            if (localStorage.getItem('magicEdenCurrentUser')) {
                localStorage.setItem('magicEdenCurrentUser', JSON.stringify(data.user));
            }
            
            // Refresh the page to show updated balances cleanly
            alert(`✅ Successfully converted ${amount.toFixed(4)}!`);
            window.location.reload();
        }
        
    } catch (error) {
        console.error('❌ Conversion error:', error);
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

console.log('✅ Complete convert-weth.js loaded successfully');
