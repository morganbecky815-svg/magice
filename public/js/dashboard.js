// ============================================
// DASHBOARD.JS - FRESH & WORKING
// ============================================

let currentDashboardUser = null;
let currentConversionType = 'ethToWeth';
const ETH_PRICE = 2500;
const MARKETPLACE_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e90E4343A9B";

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard initializing...');
    loadDashboard();
    setupGlobalFunctions();
});

// Setup global functions
function setupGlobalFunctions() {
    window.showAddETH = showAddETH;
    window.showWETHConversion = showWETHConversion;
    window.closeModal = closeModal;
    window.copyAddress = copyAddress;
    window.openMetaMaskBuy = openMetaMaskBuy;
    window.showDepositInstructions = showDepositInstructions;
    window.refreshBalance = refreshBalance;
    window.selectConversion = selectConversion;
    window.setMaxAmount = setMaxAmount;
    window.updateConversionPreview = updateConversionPreview;
    window.executeConversion = executeConversion;
    window.buyCrypto = buyCrypto;
    window.transferFunds = transferFunds;
    window.showStaking = showStaking;
    window.viewPortfolio = viewPortfolio;
}

// Load dashboard data
function loadDashboard() {
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    
    if (!userEmail) {
        window.location.href = 'login.html';
        return;
    }
    
    const users = db.getUsers();
    const user = users.find(u => u.email === userEmail.toLowerCase());
    
    if (!user) {
        localStorage.removeItem('magicEdenCurrentUser');
        window.location.href = 'login.html';
        return;
    }
    
    currentDashboardUser = user;
    
    // Fix user data
    db.fixUserData(userEmail);
    
    // Ensure balance fields
    if (user.balance === undefined) user.balance = 0;
    if (user.ethBalance === undefined) user.ethBalance = 0;
    if (user.wethBalance === undefined) user.wethBalance = 0;
    
    displayDashboardData(user);
    loadDashboardActivity(user.email);
    loadDashboardNFTs(user.email);
    loadRecommendedNFTs();
    updateWalletDisplay();
}

// Display dashboard data
function displayDashboardData(user) {
    // Welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const name = user.fullName || user.email.split('@')[0];
        const hour = new Date().getHours();
        let greeting = "Good ";
        if (hour < 12) greeting += "morning";
        else if (hour < 18) greeting += "afternoon";
        else greeting += "evening";
        welcomeMessage.textContent = ${greeting}, ${name}!;
    }
    
    // Update ETH balance
    const ethBalanceEl = document.getElementById('ethBalance');
    const ethValueEl = document.getElementById('ethValue');
    const marketplaceEthBalance = document.getElementById('marketplaceEthBalance');
    const marketplaceEthValue = document.getElementById('marketplaceEthValue');
    
    if (ethBalanceEl) ethBalanceEl.textContent = ${user.ethBalance.toFixed(4)} ETH;
    if (ethValueEl) ethValueEl.textContent = $${(user.ethBalance * ETH_PRICE).toFixed(2)};
    if (marketplaceEthBalance) marketplaceEthBalance.textContent = ${user.ethBalance.toFixed(4)};
    if (marketplaceEthValue) marketplaceEthValue.textContent = $${(user.ethBalance * ETH_PRICE).toFixed(2)};
    
    // Update WETH balance
    const wethBalanceEl = document.getElementById('wethBalance');
    const wethValueEl = document.getElementById('wethValue');
    if (wethBalanceEl) wethBalanceEl.textContent = ${user.wethBalance.toFixed(4)} WETH;
    if (wethValueEl) wethValueEl.textContent = $${(user.wethBalance * ETH_PRICE).toFixed(2)};
    
    // Update marketplace wallet address
    const addressEl = document.getElementById('marketplaceAddress');
    if (addressEl) addressEl.textContent = MARKETPLACE_WALLET_ADDRESS;
}

// Show Add ETH Modal
function showAddETH() {
    console.log('➕ Opening Add ETH modal');
    document.getElementById('addETHModal').style.display = 'flex';
}

// Show WETH Conversion Modal
function showWETHConversion() {
    console.log('💱 Opening WETH conversion modal');
    
    if (!currentDashboardUser) {
        alert('Please login first');
        return;
    }
    
    // Update balances in modal
    document.getElementById('fromBalanceAmount').textContent = (currentDashboardUser.ethBalance || 0).toFixed(4);
    document.getElementById('toBalanceAmount').textContent = (currentDashboardUser.wethBalance || 0).toFixed(4);
    
    // Reset to ETH to WETH
    selectConversion('ethToWeth');
    
    // Show modal
    document.getElementById('wethConversionModal').style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Copy address to clipboard
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

// Open MetaMask buy interface
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

// Show deposit instructions
function showDepositInstructions() {
    const instructions = document.getElementById('depositInstructions');
    if (instructions) {
        instructions.style.display = 'block';
    }
}

// Refresh balance
function refreshBalance() {
    if (currentDashboardUser) {
        displayDashboardData(currentDashboardUser);
        alert('Balance refreshed!');
    }
}

// WETH Conversion Functions
function selectConversion(type) {
    currentConversionType = type;
    
    if (type === 'ethToWeth') {
        document.getElementById('ethToWethOption').classList.add('active');
        document.getElementById('wethToEthOption').classList.remove('active');
        document.getElementById('fromCurrency').textContent = 'ETH';
        document.getElementById('toCurrency').textContent = 'WETH';
        document.getElementById('fromBalanceLabel').textContent = 'ETH Balance';
        document.getElementById('toBalanceLabel').textContent = 'WETH Balance';
        
        // Hide balance check
        document.getElementById('wethToEthBalanceCheck').style.display = 'none';
    } else {
        document.getElementById('wethToEthOption').classList.add('active');
        document.getElementById('ethToWethOption').classList.remove('active');
        document.getElementById('fromCurrency').textContent = 'WETH';
        document.getElementById('toCurrency').textContent = 'ETH';
        document.getElementById('fromBalanceLabel').textContent = 'WETH Balance';
        document.getElementById('toBalanceLabel').textContent = 'ETH Balance';
        
        // Check ETH balance
        checkWETHtoETHBalance();
    }
    
    // Reset amount
    document.getElementById('conversionAmount').value = '';
    updateConversionPreview();
}

function checkWETHtoETHBalance() {
    const balanceCheck = document.getElementById('wethToEthBalanceCheck');
    const convertButton = document.getElementById('convertButton');
    
    if (!currentDashboardUser) return;
    
    const ethBalance = currentDashboardUser.ethBalance || 0;
    const wethBalance = currentDashboardUser.wethBalance || 0;
    const requiredEth = wethBalance * 0.15;
    
    if (ethBalance < requiredEth) {
        balanceCheck.style.display = 'flex';
        balanceCheck.textContent = Insufficient ETH balance. Need ${requiredEth.toFixed(4)} ETH (15% of WETH balance).;
        convertButton.disabled = true;
    } else {
        balanceCheck.style.display = 'none';
        convertButton.disabled = false;
    }
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
    
    conversionResult.textContent = ${amount.toFixed(4)} ${currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH'};
    convertButton.disabled = false;
}

function executeConversion() {
    const amountInput = document.getElementById('conversionAmount');
    if (!amountInput || !currentDashboardUser) return;
    
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    // Check balance
    if (currentConversionType === 'ethToWeth') {
        if (amount > (currentDashboardUser.ethBalance || 0)) {
            alert(Insufficient ETH balance. You have ${currentDashboardUser.ethBalance || 0} ETH.);
            return;
        }
    } else {
        if (amount > (currentDashboardUser.wethBalance || 0)) {
            alert(Insufficient WETH balance. You have ${currentDashboardUser.wethBalance || 0} WETH.);
            return;
        }
    }
    
    // Update balances
    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.email === currentDashboardUser.email);
    
    if (userIndex === -1) {
        alert('Error: User not found');
        return;
    }
    
    if (currentConversionType === 'ethToWeth') {
        users[userIndex].ethBalance = (users[userIndex].ethBalance || 0) - amount;
        users[userIndex].wethBalance = (users[userIndex].wethBalance || 0) + amount;
    } else {
        users[userIndex].wethBalance = (users[userIndex].wethBalance || 0) - amount;
        users[userIndex].ethBalance = (users[userIndex].ethBalance || 0) + amount;
    }
    
    localStorage.setItem('magicEdenUsers', JSON.stringify(users));
    
    // Update current user
    currentDashboardUser.ethBalance = users[userIndex].ethBalance;
    currentDashboardUser.wethBalance = users[userIndex].wethBalance;
    
    // Update display
    displayDashboardData(currentDashboardUser);
    
    // Show success
    const fromCurrency = currentConversionType === 'ethToWeth' ? 'ETH' : 'WETH';
    const toCurrency = currentConversionType === 'ethToWeth' ? 'WETH' : 'ETH';
    alert(Successfully converted ${amount.toFixed(4)} ${fromCurrency} to ${toCurrency}!);
    
    closeModal('wethConversionModal');
}

// Other functions (keep your existing ones)
function loadDashboardActivity(userEmail) {
    // Your existing code
}

function loadDashboardNFTs(userEmail) {
    // Your existing code
}

function loadRecommendedNFTs() {
    // Your existing code
}

function updateWalletDisplay() {
    // Your existing code
}

function buyCrypto() {
    showAddETH();
}

function transferFunds() {
    alert('Transfer funds feature coming soon!');
}

function showStaking() {
    alert('Staking feature coming soon!');
}

function viewPortfolio() {
    window.location.href = 'profile.html';
}