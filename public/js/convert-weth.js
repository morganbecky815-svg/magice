// convert-weth.js - FIXED VERSION for your backend
console.log('💱 convert-weth.js loaded');

// Global variables
let currentConversionType = 'ethToWeth';
let userEthBalance = 0;
let userWethBalance = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 WETH conversion page initializing...');
    
    // Load REAL user data from backend
    loadRealUserData();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ WETH conversion page ready');
});

// Load REAL user data from backend
async function loadRealUserData() {
    try {
        console.log('🔄 Loading REAL user data from backend...');
        
        // Get user from localStorage
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!userStr || !token) {
            console.log('❌ No user or token found');
            showError('Please login to use conversion', '/login');
            return;
        }
        
        const user = JSON.parse(userStr);
        
        // Use the CORRECT endpoint from your routes/user.js
        const response = await fetch(`/api/user/${user._id}`, {
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
            console.log('✅ REAL user data loaded:', data.user);
            
            // Your backend uses internalBalance, ethBalance, wethBalance
            userEthBalance = data.user.ethBalance || 0;
            userWethBalance = data.user.wethBalance || 0;
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log(`💰 REAL Balances - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
            
            // Update display
            updateBalanceDisplay();
            selectConversionType('ethToWeth');
            
            return data.user;
        }
        
    } catch (error) {
        console.error('❌ Error loading real user data:', error);
        showError('Could not load user data. Please refresh.');
    }
}

// Show error message
function showError(message, redirectUrl = null) {
    const container = document.querySelector('.container') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 8px; margin: 1rem; text-align: center;';
    errorDiv.innerHTML = `
        <strong>⚠️ ${message}</strong>
        ${redirectUrl ? '<br><button onclick="window.location.href=\'' + redirectUrl + '\'" style="margin-top: 1rem; padding: 0.5rem 1rem;">Go to Login</button>' : ''}
    `;
    container.prepend(errorDiv);
}

// Update balance display
function updateBalanceDisplay() {
    const ethPrice = window.ETH_PRICE || 2500;
    
    // Update ETH balance
    const ethBalanceEl = document.getElementById('ethBalanceDisplay');
    if (ethBalanceEl) ethBalanceEl.textContent = `${userEthBalance.toFixed(4)} ETH`;
    
    const ethValueEl = document.getElementById('ethValueDisplay');
    if (ethValueEl) ethValueEl.textContent = `$${(userEthBalance * ethPrice).toFixed(2)}`;
    
    // Update WETH balance
    const wethBalanceEl = document.getElementById('wethBalanceDisplay');
    if (wethBalanceEl) wethBalanceEl.textContent = `${userWethBalance.toFixed(4)} WETH`;
    
    const wethValueEl = document.getElementById('wethValueDisplay');
    if (wethValueEl) wethValueEl.textContent = `$${(userWethBalance * ethPrice).toFixed(2)}`;
    
    console.log('✅ Balance display updated');
}

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
    
    // Update active tab
    document.querySelectorAll('.conversion-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const tabs = document.querySelectorAll('.conversion-tab');
    if (type === 'ethToWeth') {
        if (tabs[0]) tabs[0].classList.add('active');
        
        // Update UI elements
        updateElementText('fromSymbol', 'ETH');
        updateElementText('toSymbol', 'WETH');
        updateElementText('fromBalance', userEthBalance.toFixed(4));
        updateElementText('toBalance', userWethBalance.toFixed(4));
        updateElementText('inputCurrency', 'ETH');
        updateElementText('availableCurrency', 'ETH');
        updateElementText('receiveAmount', '0.0000 WETH');
        
        // Hide ETH balance warning
        const warningEl = document.getElementById('ethBalanceWarning');
        if (warningEl) warningEl.style.display = 'none';
        
    } else {
        if (tabs[1]) tabs[1].classList.add('active');
        
        // Update UI elements
        updateElementText('fromSymbol', 'WETH');
        updateElementText('toSymbol', 'ETH');
        updateElementText('fromBalance', userWethBalance.toFixed(4));
        updateElementText('toBalance', userEthBalance.toFixed(4));
        updateElementText('inputCurrency', 'WETH');
        updateElementText('availableCurrency', 'WETH');
        updateElementText('receiveAmount', '0.0000 ETH');
        
        // Check 15% ETH balance requirement
        checkEthBalanceRequirement();
    }
    
    updateAvailableBalance();
    
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

// Update available balance display
function updateAvailableBalance() {
    const availableBalance = currentConversionType === 'ethToWeth' ? userEthBalance : userWethBalance;
    const availEl = document.getElementById('availableBalance');
    if (availEl) availEl.textContent = availableBalance.toFixed(4);
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
    const ethPrice = window.ETH_PRICE || 2500;
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
    
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userStr || !token) {
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
        // Use the CORRECT endpoint from your routes/user.js
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
            // Update local variables from response
            if (data.user) {
                userEthBalance = data.user.ethBalance || 0;
                userWethBalance = data.user.wethBalance || 0;
                
                // Update localStorage
                localStorage.setItem('user', JSON.stringify({ ...user, ...data.user }));
            }
            
            // Update display
            updateBalanceDisplay();
            updateAvailableBalance();
            checkEthBalanceRequirement();
            
            // Reset form
            if (amountInput) amountInput.value = '';
            updateConversionPreview();
            
            // Show success
            const fromCurrency = currentConversionType === 'ethToWeth' ? 'ETH' : 'WETH';
            const toCurrency = currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH';
            
            alert(`✅ Successfully converted ${amount.toFixed(4)} ${fromCurrency} to ${toCurrency}!`);
            console.log(`✅ Conversion completed: ${amount} ${fromCurrency} → ${toCurrency}`);
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

// Make functions globally available
window.selectConversionType = selectConversionType;
window.setMaxAmount = setMaxAmount;
window.updateConversionPreview = updateConversionPreview;
window.executeConversion = executeConversion;

console.log('✅ Fixed WETH conversion functions loaded');
