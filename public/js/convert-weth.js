// Fetch live ETH price on load
(async function() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        
        if (data.ethereum && data.ethereum.usd) {
            window.ETH_PRICE = data.ethereum.usd;
            console.log('✅ Live ETH price loaded:', window.ETH_PRICE);
            
            // Update all price displays
            document.querySelectorAll('[data-eth-price]').forEach(el => {
                const ethAmount = parseFloat(el.getAttribute('data-eth-amount') || 0);
                el.textContent = `$${(ethAmount * window.ETH_PRICE).toFixed(2)}`;
            });
        }
    } catch (error) {
        console.error('Failed to fetch ETH price, using default');
        window.ETH_PRICE = 2500;
    }
})();

// convert-weth.js - CORRECTED VERSION
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
        
        // Get user from localStorage (same as your app.js)
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!userStr || !token) {
            console.log('❌ No user or token found');
            alert('Please login to use conversion');
            window.location.href = '/login';
            return;
        }
        
        const user = JSON.parse(userStr);
        
        // Fetch fresh user data from backend (same as your app.js)
        const response = await fetch(`http://localhost:5000/api/user/${user._id}`, {
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
            
            // Update local variables with REAL data
            userEthBalance = data.user.ethBalance || 0;
            userWethBalance = data.user.wethBalance || data.user.balance || 0;
            
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
        
        // Fallback to localStorage user data
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                userEthBalance = user.ethBalance || 0;
                userWethBalance = user.wethBalance || user.balance || 0;
                
                console.log(`💰 Fallback Balances - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
                
                updateBalanceDisplay();
                selectConversionType('ethToWeth');
            }
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
        }
    }
    return null;
}

// Update balance display with REAL values
function updateBalanceDisplay() {
    const ethPrice = window.ETH_PRICE || 2500;
    
    // Update ETH balance
    document.getElementById('ethBalanceDisplay').textContent = `${userEthBalance.toFixed(4)} ETH`;
    document.getElementById('ethValueDisplay').textContent = `$${(userEthBalance * ethPrice).toFixed(2)}`;
    
    // Update WETH balance
    document.getElementById('wethBalanceDisplay').textContent = `${userWethBalance.toFixed(4)} WETH`;
    document.getElementById('wethValueDisplay').textContent = `$${(userWethBalance * ethPrice).toFixed(2)}`;
    
    console.log('✅ Balance display updated with REAL values');
}

// Setup event listeners
function setupEventListeners() {
    // Amount input listener
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
    
    if (type === 'ethToWeth') {
        document.querySelector('.conversion-tab:nth-child(1)').classList.add('active');
        
        // Update conversion direction
        document.getElementById('fromSymbol').textContent = 'ETH';
        document.getElementById('toSymbol').textContent = 'WETH';
        document.getElementById('fromBalance').textContent = userEthBalance.toFixed(4);
        
        // Update BOTH "to" displays
        const toBalanceElement = document.getElementById('toBalance');
        if (toBalanceElement) {
            toBalanceElement.textContent = userWethBalance.toFixed(4);
        }
        
        document.getElementById('inputCurrency').textContent = 'ETH';
        document.getElementById('availableCurrency').textContent = 'ETH';
        
        // Update second "You Receive" display
        const receiveAmountElement = document.getElementById('receiveAmount');
        if (receiveAmountElement) {
            receiveAmountElement.textContent = '0.0000 WETH';
        }
        
        // Hide ETH balance warning
        document.getElementById('ethBalanceWarning').style.display = 'none';
        
    } else {
        document.querySelector('.conversion-tab:nth-child(2)').classList.add('active');
        
        // Update conversion direction
        document.getElementById('fromSymbol').textContent = 'WETH';
        document.getElementById('toSymbol').textContent = 'ETH';
        document.getElementById('fromBalance').textContent = userWethBalance.toFixed(4);
        
        // Update BOTH "to" displays
        const toBalanceElement = document.getElementById('toBalance');
        if (toBalanceElement) {
            toBalanceElement.textContent = userEthBalance.toFixed(4);
        }
        
        document.getElementById('inputCurrency').textContent = 'WETH';
        document.getElementById('availableCurrency').textContent = 'WETH';
        
        // Update second "You Receive" display
        const receiveAmountElement = document.getElementById('receiveAmount');
        if (receiveAmountElement) {
            receiveAmountElement.textContent = '0.0000 ETH';
        }
        
        // Check 15% ETH balance requirement
        checkEthBalanceRequirement();
    }
    
    // Update available balance
    updateAvailableBalance();
    
    // Reset amount input
    document.getElementById('convertAmount').value = '';
    
    // Update preview
    updateConversionPreview();
}

// Check 15% ETH balance requirement for WETH → ETH conversion
function checkEthBalanceRequirement() {
    const warningElement = document.getElementById('ethBalanceWarning');
    
    if (currentConversionType === 'wethToEth') {
        // Calculate required ETH (15% of WETH balance)
        const requiredEth = userWethBalance * 0.15;
        
        // Update warning message
        document.getElementById('requiredEthAmount').textContent = requiredEth.toFixed(4);
        
        if (userEthBalance < requiredEth) {
            // Show warning
            warningElement.style.display = 'flex';
            console.log(`⚠ ETH balance requirement not met. Need ${requiredEth.toFixed(4)} ETH, have ${userEthBalance.toFixed(4)} ETH`);
        } else {
            // Hide warning
            warningElement.style.display = 'none';
            console.log(`✅ ETH balance requirement met. Need ${requiredEth.toFixed(4)} ETH, have ${userEthBalance.toFixed(4)} ETH`);
        }
    } else {
        // Hide warning for ETH → WETH
        warningElement.style.display = 'none';
    }
}

// Update available balance display
function updateAvailableBalance() {
    const availableBalance = currentConversionType === 'ethToWeth' ? userEthBalance : userWethBalance;
    document.getElementById('availableBalance').textContent = availableBalance.toFixed(4);
}

// Set maximum amount for conversion
function setMaxAmount() {
    let maxAmount = 0;
    
    if (currentConversionType === 'ethToWeth') {
        maxAmount = userEthBalance;
    } else {
        // For WETH → ETH, also check if we have enough ETH balance
        const requiredEth = userWethBalance * 0.15;
        
        if (userEthBalance < requiredEth) {
            // Can't convert if ETH balance is less than 15% of WETH
            alert(`Cannot convert WETH to ETH. You need at least ${requiredEth.toFixed(4)} ETH balance.`);
            return;
        }
        
        maxAmount = userWethBalance;
    }
    
    // Set amount (leave a little for gas)
    const amountInput = document.getElementById('convertAmount');
    amountInput.value = (maxAmount * 0.99).toFixed(4); // Leave 1% buffer
    
    // Update preview
    updateConversionPreview();
}

// Update conversion preview
function updateConversionPreview() {
    const amountInput = document.getElementById('convertAmount');
    const convertBtn = document.getElementById('convertBtn');
    
    const amount = parseFloat(amountInput.value) || 0;
    
    // Reset button state
    convertBtn.disabled = true;
    
    if (amount <= 0) {
        // Update BOTH "You Receive" displays
        const receiveText = currentConversionType === 'ethToWeth' ? '0.0000 WETH' : '0.0000 ETH';
        
        // Update the first display (in conversion-direction)
        const toBalanceElement = document.getElementById('toBalance');
        if (toBalanceElement) {
            toBalanceElement.textContent = '0.0000';
        }
        
        // Update the second display (in conversion-details)
        const receiveAmountElement = document.getElementById('receiveAmount');
        if (receiveAmountElement) {
            receiveAmountElement.textContent = receiveText;
        }
        
        return;
    }
    
    // Check if user has enough balance
    let hasEnoughBalance = false;
    if (currentConversionType === 'ethToWeth') {
        hasEnoughBalance = amount <= userEthBalance;
    } else {
        hasEnoughBalance = amount <= userWethBalance;
        
        // Additional check for WETH → ETH: need 15% ETH balance
        if (hasEnoughBalance) {
            const requiredEth = amount * 0.15; // 15% of conversion amount
            if (userEthBalance < requiredEth) {
                alert(`Insufficient ETH balance. Need ${requiredEth.toFixed(4)} ETH for this conversion.`);
                hasEnoughBalance = false;
            }
        }
    }
    
    if (!hasEnoughBalance) {
        // Update BOTH "You Receive" displays
        const toBalanceElement = document.getElementById('toBalance');
        if (toBalanceElement) {
            toBalanceElement.textContent = 'Insufficient';
        }
        
        const receiveAmountElement = document.getElementById('receiveAmount');
        if (receiveAmountElement) {
            receiveAmountElement.textContent = 'Insufficient balance';
        }
        return;
    }
    
    // Calculate receive amount (1:1 conversion)
    const receive = amount; // 1 ETH = 1 WETH
    
    // Update BOTH "You Receive" displays
    const receiveText = `${receive.toFixed(4)}`;
    const currencyText = currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH';
    
    // Update the first display (in conversion-direction)
    const toBalanceElement = document.getElementById('toBalance');
    if (toBalanceElement) {
        toBalanceElement.textContent = receive.toFixed(4);
    }
    
    // Update the second display (in conversion-details)
    const receiveAmountElement = document.getElementById('receiveAmount');
    if (receiveAmountElement) {
        receiveAmountElement.textContent = `${receive.toFixed(4)} ${currencyText}`;
    }
    
    // Update estimated fee
    const ethPrice = window.ETH_PRICE || 2500;
    const estimatedFee = amount * 0.001 * ethPrice; // 0.1% fee in USD
    document.getElementById('estimatedFee').textContent = `~$${estimatedFee.toFixed(2)}`;
    
    // Enable convert button
    convertBtn.disabled = false;
}

// Execute conversion
async function executeConversion() {
    const amountInput = document.getElementById('convertAmount');
    const amount = parseFloat(amountInput.value);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    // Get current user
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userStr || !token) {
        alert('Please login first');
        return;
    }
    
    const user = JSON.parse(userStr);
    
    // Check balance
    if (currentConversionType === 'ethToWeth') {
        if (amount > userEthBalance) {
            alert(`Insufficient ETH balance. You have ${userEthBalance.toFixed(4)} ETH.`);
            return;
        }
    } else {
        // WETH → ETH conversion
        if (amount > userWethBalance) {
            alert(`Insufficient WETH balance. You have ${userWethBalance.toFixed(4)} WETH.`);
            return;
        }
        
        // Check 15% ETH balance requirement
        const requiredEth = amount * 0.15;
        if (userEthBalance < requiredEth) {
            alert(`Cannot convert. You need at least ${requiredEth.toFixed(4)} ETH balance (15% of conversion amount).`);
            return;
        }
    }
    
    // Show loading
    const convertBtn = document.getElementById('convertBtn');
    const originalText = convertBtn.innerHTML;
    convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
    convertBtn.disabled = true;
    
    try {
        // Make REAL API call to convert
        // NOTE: You might need to adjust the endpoint based on your backend
        const endpoint = currentConversionType === 'ethToWeth' 
            ? `/user/${user._id}/convert-to-weth`
            : `/user/${user._id}/convert-to-eth`;
        
        const response = await fetch(`http://localhost:5000/api${endpoint}`, {
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
            // Update local variables
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
            
            // Reset amount
            amountInput.value = '';
            updateConversionPreview();
            
            // Show success message
            const fromCurrency = currentConversionType === 'ethToWeth' ? 'ETH' : 'WETH';
            const toCurrency = currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH';
            
            alert(`✅ Successfully converted ${amount.toFixed(4)} ${fromCurrency} to ${toCurrency}!`);
            
            console.log(`✅ Conversion completed: ${amount} ${fromCurrency} → ${toCurrency}`);
        }
        
    } catch (error) {
        console.error('Conversion error:', error);
        alert('Conversion failed: ' + error.message);
        
    } finally {
        // Reset button
        convertBtn.innerHTML = originalText;
        convertBtn.disabled = false;
    }
}

// Make functions globally available
window.selectConversionType = selectConversionType;
window.setMaxAmount = setMaxAmount;
window.updateConversionPreview = updateConversionPreview;
window.executeConversion = executeConversion;

console.log('✅ All WETH conversion functions exported');