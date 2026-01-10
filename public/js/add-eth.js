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

// Update balance on Add ETH page
function updateAddEthPageBalance() {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
        console.log('No user found');
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        const ethBalance = user.ethBalance || 0;
        
        console.log('💰 Updating Add ETH page balance:', ethBalance);
        
        // Update balance displays
        const balanceAmount = document.getElementById('balanceAmount');
        const marketplaceBalance = document.getElementById('marketplaceBalance');
        
        if (balanceAmount) {
            balanceAmount.textContent = `${ethBalance.toFixed(4)} ETH`;
        }
        
        if (marketplaceBalance) {
            marketplaceBalance.textContent = `${ethBalance.toFixed(4)} ETH`;
        }
        
        // Also update any other balance displays
        document.querySelectorAll('.balance-amount').forEach(el => {
            el.textContent = `${ethBalance.toFixed(4)} ETH`;
        });
        
    } catch (error) {
        console.error('Error updating Add ETH page balance:', error);
    }
}
// Check if we're on Add ETH page
if (window.location.pathname.includes('add-eth')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔄 Loading balance for Add ETH page...');
        
        // Update balance from localStorage
        updateAddEthPageBalance();
        
        // Also fetch fresh balance from backend
        if (typeof loadUserBalance === 'function') {
            loadUserBalance().then(() => {
                // Update again after loading from backend
                updateAddEthPageBalance();
            });
        }
        
        // Update balance every 10 seconds
        setInterval(updateAddEthPageBalance, 10000);
    });
}

// Calculate and display USD value of ETH balance
function updateBalanceUsdValue() {
    // Get user balance
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    try {
        const user = JSON.parse(userStr);
        const ethBalance = user.ethBalance || 0;
        
        // Get current ETH price
        const ethPrice = window.ETH_PRICE || localStorage.getItem('currentEthPrice') || 2500;
        
        // Calculate USD value
        const usdValue = (ethBalance * ethPrice).toFixed(2);
        
        console.log('💰 Balance USD calculation:', {
            ethBalance,
            ethPrice,
            usdValue
        });
        
        // Update USD value display
        const usdElement = document.getElementById('balanceUsdValue');
        if (usdElement) {
            usdElement.textContent = `($${usdValue})`;
        }
        
        // Also update any other USD value displays
        document.querySelectorAll('.balance-usd-value').forEach(el => {
            el.textContent = `$${usdValue}`;
        });
        
    } catch (error) {
        console.error('Error calculating USD value:', error);
    }
}

// Initialize when page loads
if (window.location.pathname.includes('add-eth')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('💵 Initializing USD value calculation for Add ETH page');
        
        // Initial calculation
        updateBalanceUsdValue();
        
        // Update when ETH price changes
        setInterval(updateBalanceUsdValue, 5000);
        
        // Also update when user data changes
        window.addEventListener('storage', function(event) {
            if (event.key === 'user' || event.key === 'currentEthPrice') {
                updateBalanceUsdValue();
            }
        });
    });
}

// marketplace-wallet.js
// This file handles ONLY the marketplace wallet functionality

const MARKETPLACE_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e90E4343A9B";

// Show Add ETH modal (marketplace wallet options)
function showAddETH() {
    console.log('🔄 Opening marketplace wallet modal');
    
    // Get current user
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    if (!userEmail) {
        alert('Please login first');
       // window.location.href = '/login';
        return;
    }
    
    // Update wallet address display
    const addressElement = document.getElementById('marketplaceAddress');
    if (addressElement) {
        addressElement.textContent = MARKETPLACE_WALLET_ADDRESS;
    }
    
    // Update balance in modal
    const users = db.getUsers();
    const user = users.find(u => u.email === userEmail.toLowerCase());
    if (user) {
        const ethBalance = user.ethBalance || 0;
        const marketplaceEthBalance = document.getElementById('marketplaceEthBalance');
        const marketplaceEthValue = document.getElementById('marketplaceEthValue');
        
        if (marketplaceEthBalance) marketplaceEthBalance.textContent = ethBalance.toFixed(4);
        if (marketplaceEthValue) marketplaceEthValue.textContent = `$${(ethBalance * 2500).toFixed(2)}`;
    }
    
    // Show the modal
    document.getElementById('addETHModal').style.display = 'flex';
    console.log('✅ Marketplace wallet modal opened');
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        console.log(`✅ Modal ${modalId} closed`);
    }
}

// Fix for balanceUSD showing $0.00
function updateBalanceUSD() {
    // Get the balance USD element
    const balanceUsdElement = document.getElementById('balanceUSD');
    if (!balanceUsdElement) return;
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    try {
        const user = JSON.parse(userStr);
        const ethBalance = user.ethBalance || user.balance || 0;
        
        // Get ETH price
        const ethPrice = window.ETH_PRICE || localStorage.getItem('currentEthPrice') || 2500;
        
        // Calculate USD value
        const usdValue = (ethBalance * ethPrice).toFixed(2);
        
        // Update the display
        balanceUsdElement.textContent = '$' + usdValue + ' USD';
        
    } catch (error) {
        console.error('Error updating balanceUSD:', error);
    }
}

// Run when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Update immediately
    updateBalanceUSD();
    
    // Update a few times in case data loads slowly
    setTimeout(updateBalanceUSD, 1000);
    setTimeout(updateBalanceUSD, 2000);
    
    // Update every 10 seconds
    setInterval(updateBalanceUSD, 10000);
});

// Copy wallet address to clipboard
function copyAddress() {
    try {
        navigator.clipboard.writeText(MARKETPLACE_WALLET_ADDRESS)
            .then(() => {
                // Show feedback on copy button
                const copyBtn = document.querySelector('.copy-btn');
                if (copyBtn) {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    copyBtn.classList.add('copied');
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.classList.remove('copied');
                    }, 2000);
                }
                
                console.log('✅ Address copied to clipboard');
            })
            .catch(err => {
                console.error('❌ Failed to copy:', err);
                alert('Failed to copy address. Please copy manually.');
            });
    } catch (error) {
        console.error('❌ Clipboard not supported:', error);
        alert('Clipboard not supported in your browser');
    }
}

// Open MetaMask buy interface
function openMetaMaskBuy() {
    console.log('🦊 Opening MetaMask buy interface');
    
    if (window.ethereum && window.ethereum.isMetaMask) {
        try {
            window.ethereum.request({
                method: 'wallet_buyCrypto',
                params: [{
                    address: MARKETPLACE_WALLET_ADDRESS,
                    symbol: 'ETH'
                }]
            }).then(() => {
                console.log('✅ MetaMask buy interface opened');
                alert('MetaMask buy interface opened. Please complete your purchase there.');
                closeModal('addETHModal');
            }).catch((error) => {
                console.log('⚠ MetaMask buy not available:', error);
                window.open('https://metamask.io/', '_blank');
            });
        } catch (error) {
            console.log('❌ Error opening MetaMask:', error);
            window.open('https://metamask.io/', '_blank');
        }
    } else {
        console.log('❌ MetaMask not installed');
        if (confirm('MetaMask not detected. Would you like to install it?')) {
            window.open('https://metamask.io/download/', '_blank');
        } else {
            // Show deposit instructions instead
            showDepositInstructions();
        }
    }
}

// Show deposit instructions
function showDepositInstructions() {
    const instructions = document.getElementById('depositInstructions');
    if (instructions) {
        instructions.style.display = 'block';
        console.log('✅ Deposit instructions shown');
    }
}

// Export functions to global scope
window.showAddETH = showAddETH;
window.closeModal = closeModal;
window.copyAddress = copyAddress;
window.openMetaMaskBuy = openMetaMaskBuy;
window.showDepositInstructions = showDepositInstructions;

console.log('✅ marketplace-wallet.js loaded');