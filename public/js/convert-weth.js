// convert-weth.js - SIMPLIFIED VERSION
console.log('💱 convert-weth.js loaded');

// Global variables
let currentConversionType = 'ethToWeth';
let userEthBalance = 2.5;  // Default values
let userWethBalance = 1.2; // Default values
const ETH_PRICE = 2500;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 WETH conversion page initializing...');
    
    // Get user from global (set by the HTML check) or localStorage
    const userEmail = window.currentUserEmail || localStorage.getItem('magicEdenCurrentUser');
    
    if (!userEmail) {
        console.error('❌ FATAL: No user found even after HTML check!');
        // Page should have redirected already, but just in case:
        window.location.href = '/login';
        return;
    }
    
    console.log('✅ User authenticated:', userEmail);
    
    // Load user data (OFFLINE VERSION)
    loadUserDataOffline(userEmail);
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ WETH conversion page ready');
});

// OFFLINE user data loader
function loadUserDataOffline(userEmail) {
    console.log('Loading OFFLINE data for:', userEmail);
    
    try {
        // Try to get from localStorage
        const storedUsers = localStorage.getItem('magicEdenUsers');
        
        if (storedUsers) {
            const users = JSON.parse(storedUsers);
            const user = users.find(u => u.email === userEmail.toLowerCase());
            
            if (user) {
                userEthBalance = user.ethBalance || 2.5;
                userWethBalance = user.wethBalance || 1.2;
                console.log('Found user data in localStorage');
            }
        } else {
            // Create initial data
            console.log('Creating initial user data');
            const newUser = {
                email: userEmail.toLowerCase(),
                ethBalance: 2.5,
                wethBalance: 1.2,
                createdAt: new Date().toISOString()
            };
            
            localStorage.setItem('magicEdenUsers', JSON.stringify([newUser]));
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        // Keep default values
    }
    
    console.log(`💰 Balances - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
    
    // Update display
    updateBalanceDisplay();
    selectConversionType('ethToWeth');
}

// ... REST OF YOUR EXISTING CODE (updateBalanceDisplay, setupEventListeners, etc.) ...
// convert-weth.js - WETH Conversion with 15% ETH Balance Check
console.log('💱 convert-weth.js loaded');

// Global variables
let currentConversionType = 'ethToWeth';
let userEthBalance = 0;
let userWethBalance = 0;
const ETH_PRICE = 2500;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 WETH conversion page initializing...');
    
    // ✅ FIXED: Changed '/login' to 'login.html'
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    if (!userEmail) {
        alert('Please login to use conversion');
        window.location.href = '/login';  // ✅ FIXED
        return;
    }
    
    // Load user data
    loadUserData(userEmail);
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ WETH conversion page ready');
});

// Load user data
function loadUserData(userEmail) {
    try {
        const users = db.getUsers();
        const user = users.find(u => u.email === userEmail.toLowerCase());
        
        if (!user) {
            console.log('❌ User not found');
            alert('User not found. Please login again.');
            window.location.href = '/login';  // ✅ FIXED
            return;
        }
        
        // Get balances (default to 0 if not set)
        userEthBalance = user.ethBalance || 0;
        userWethBalance = user.wethBalance || 0;
        
        console.log(`💰 User balances - ETH: ${userEthBalance}, WETH: ${userWethBalance}`);
        
        // Update display
        updateBalanceDisplay();
        
        // Set default conversion type
        selectConversionType('ethToWeth');
        
    } catch (error) {
        console.error('Error loading user data:', error);
        alert('Error loading your data. Please refresh the page.');
    }
}

// Update balance display
function updateBalanceDisplay() {
    // Update ETH balance
    document.getElementById('ethBalanceDisplay').textContent = `${userEthBalance.toFixed(4)} ETH`;
    document.getElementById('ethValueDisplay').textContent = `$${(userEthBalance * ETH_PRICE).toFixed(2)}`;
    
    // Update WETH balance
    document.getElementById('wethBalanceDisplay').textContent = `${userWethBalance.toFixed(4)} WETH`;
    document.getElementById('wethValueDisplay').textContent = `$${(userWethBalance * ETH_PRICE).toFixed(2)}`;
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
        document.getElementById('toBalance').textContent = userWethBalance.toFixed(4);
        document.getElementById('inputCurrency').textContent = 'ETH';
        document.getElementById('availableCurrency').textContent = 'ETH';
        
        // Hide ETH balance warning
        document.getElementById('ethBalanceWarning').style.display = 'none';
        
    } else {
        document.querySelector('.conversion-tab:nth-child(2)').classList.add('active');
        
        // Update conversion direction
        document.getElementById('fromSymbol').textContent = 'WETH';
        document.getElementById('toSymbol').textContent = 'ETH';
        document.getElementById('fromBalance').textContent = userWethBalance.toFixed(4);
        document.getElementById('toBalance').textContent = userEthBalance.toFixed(4);
        document.getElementById('inputCurrency').textContent = 'WETH';
        document.getElementById('availableCurrency').textContent = 'WETH';
        
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
    const receiveAmount = document.getElementById('receiveAmount');
    
    const amount = parseFloat(amountInput.value) || 0;
    
    // Reset button state
    convertBtn.disabled = true;
    
    if (amount <= 0) {
        receiveAmount.textContent = currentConversionType === 'ethToWeth' ? '0.0000 WETH' : '0.0000 ETH';
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
        receiveAmount.textContent = 'Insufficient balance';
        return;
    }
    
    // Calculate receive amount (1:1 conversion)
    const receive = amount; // 1 ETH = 1 WETH
    
    // Update display
    receiveAmount.textContent = `${receive.toFixed(4)} ${currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH'}`;
    
    // Update estimated fee
    const estimatedFee = amount * 0.001 * ETH_PRICE; // 0.1% fee in USD
    document.getElementById('estimatedFee').textContent = `~$${estimatedFee.toFixed(2)}`;
    
    // Enable convert button
    convertBtn.disabled = false;
}

// Execute conversion
function executeConversion() {
    const amountInput = document.getElementById('convertAmount');
    const amount = parseFloat(amountInput.value);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    // Get current user
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    if (!userEmail) {
        alert('Please login first');
        return;
    }
    
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
    
    // Get users array
    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.email === userEmail.toLowerCase());
    
    if (userIndex === -1) {
        alert('Error: User not found');
        return;
    }
    
    // Update balances
    if (currentConversionType === 'ethToWeth') {
        // ETH → WETH
        users[userIndex].ethBalance = (users[userIndex].ethBalance || 0) - amount;
        users[userIndex].wethBalance = (users[userIndex].wethBalance || 0) + amount;
    } else {
        // WETH → ETH
        users[userIndex].wethBalance = (users[userIndex].wethBalance || 0) - amount;
        users[userIndex].ethBalance = (users[userIndex].ethBalance || 0) + amount;
    }
    
    // Save to localStorage
    localStorage.setItem('magicEdenUsers', JSON.stringify(users));
    
    // Update local variables
    userEthBalance = users[userIndex].ethBalance;
    userWethBalance = users[userIndex].wethBalance;
    
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

// Make functions globally available
window.selectConversionType = selectConversionType;
window.setMaxAmount = setMaxAmount;
window.updateConversionPreview = updateConversionPreview;
window.executeConversion = executeConversion;

console.log('✅ All WETH conversion functions exported');