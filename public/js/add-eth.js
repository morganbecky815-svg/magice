// add-eth.js - Handles Add ETH page functionality

const MARKETPLACE_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e90E4343A9B";
let instructionsVisible = false;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Add ETH Page Initializing...');
    
    // Generate QR Code
    generateQRCode();
    
    // Update wallet balance
    updateWalletBalance();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update ETH price and USD value
    updateEthPriceAndValue();
    
    // Show initial warning
    showNotification('⚠️ Only send ETH on Ethereum Network (ERC-20). Other networks will result in lost funds.', 'warning', 8000);
    
    console.log('✅ Add ETH Page Initialized');
});

// Set up all event listeners
function setupEventListeners() {
    // Copy address button
    const copyBtn = document.getElementById('copyAddressBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyWalletAddress);
    }
    
    // MetaMask button
    const metamaskBtn = document.getElementById('openMetaMaskBtn');
    if (metamaskBtn) {
        metamaskBtn.addEventListener('click', openMetaMaskSite);
    }
    
    // Show instructions button
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');
    if (showInstructionsBtn) {
        showInstructionsBtn.addEventListener('click', toggleInstructions);
    }
    
    // Close instructions button
    const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
    if (closeInstructionsBtn) {
        closeInstructionsBtn.addEventListener('click', hideInstructions);
    }
    
    // Exchange logo click handlers
    document.querySelectorAll('.exchange-logo').forEach(logo => {
        logo.addEventListener('click', function(e) {
            console.log(`Opening ${this.querySelector('span').textContent} exchange`);
        });
    });
    
    // Listen for balance updates from other pages
    window.addEventListener('storage', function(event) {
        if (event.key === 'user' || event.key === 'magicEdenCurrentUser' || 
            event.key === 'ethBalance' || event.key === 'currentEthPrice') {
            updateWalletBalance();
            updateEthPriceAndValue();
        }
    });
    
    // Show network comparison on click
    document.querySelectorAll('.incompatible').forEach(row => {
        row.addEventListener('click', function() {
            showNotification('This network is NOT compatible! Funds sent here will be lost.', 'error', 5000);
        });
    });
}

// Generate QR code for wallet address
function generateQRCode() {
    const qrContainer = document.getElementById('qrCode');
    if (qrContainer && typeof QRCode !== 'undefined') {
        QRCode.toCanvas(qrContainer, MARKETPLACE_WALLET_ADDRESS, {
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        }, function(error) {
            if (error) {
                console.error('QR Code generation failed:', error);
                qrContainer.innerHTML = '<div class="qr-fallback"><i class="fas fa-qrcode"></i><p>QR Code Error</p></div>';
            } else {
                console.log('✅ QR Code generated');
            }
        });
    } else {
        console.log('QRCode library not loaded yet, will retry...');
        setTimeout(generateQRCode, 500);
    }
}

// Copy wallet address to clipboard
function copyWalletAddress() {
    try {
        navigator.clipboard.writeText(MARKETPLACE_WALLET_ADDRESS)
            .then(() => {
                // Show feedback on copy button
                const copyBtn = document.getElementById('copyAddressBtn');
                if (copyBtn) {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    copyBtn.classList.add('copied');
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.classList.remove('copied');
                    }, 2000);
                }
                
                console.log('✅ Address copied to clipboard');
                
                // Show notification with ERC-20 reminder
                showNotification('✅ Ethereum address copied! Remember: Only send ETH on ERC-20 network', 'success', 4000);
                
            })
            .catch(err => {
                console.error('❌ Failed to copy:', err);
                showNotification('❌ Failed to copy. Please copy manually.', 'error');
            });
    } catch (error) {
        console.error('❌ Clipboard not supported:', error);
        showNotification('❌ Clipboard not supported in your browser', 'error');
    }
}

// Open official MetaMask website
function openMetaMaskSite() {
    console.log('🦊 Opening MetaMask official website');
    
    // Open in new tab
    window.open('https://metamask.io/', '_blank');
    
    // Show notification
    showNotification('Opening MetaMask official website...', 'info', 3000);
}

// Toggle instructions visibility
function toggleInstructions() {
    const instructions = document.getElementById('transferInstructions');
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');
    
    if (!instructionsVisible) {
        // Show instructions
        instructions.style.display = 'block';
        instructionsVisible = true;
        
        // Update button text
        if (showInstructionsBtn) {
            showInstructionsBtn.innerHTML = '<i class="fas fa-times"></i> Hide Instructions';
        }
        
        console.log('📖 Instructions shown');
        
        // Scroll to instructions
        instructions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        // Hide instructions
        hideInstructions();
    }
}

// Hide instructions
function hideInstructions() {
    const instructions = document.getElementById('transferInstructions');
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');
    
    if (instructions) {
        instructions.style.display = 'none';
        instructionsVisible = false;
    }
    
    // Reset button text
    if (showInstructionsBtn) {
        showInstructionsBtn.innerHTML = '<i class="fas fa-university"></i> Show Instructions';
    }
    
    console.log('📖 Instructions hidden');
}

// Update wallet balance from localStorage
function updateWalletBalance() {
    // Get user from localStorage
    const userStr = localStorage.getItem('user') || localStorage.getItem('magicEdenCurrentUser');
    
    if (userStr) {
        try {
            const user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
            const ethBalance = user.ethBalance || user.balance || 0;
            
            console.log('💰 Current ETH balance:', ethBalance);
            
            // Update ETH balance display
            const balanceAmount = document.getElementById('balanceAmount');
            if (balanceAmount) {
                balanceAmount.textContent = `${parseFloat(ethBalance).toFixed(4)} ETH`;
            }
            
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
}

// Update ETH price and calculate USD value
function updateEthPriceAndValue() {
    // Get user data
    const userStr = localStorage.getItem('user') || localStorage.getItem('magicEdenCurrentUser');
    let ethBalance = 0;
    
    if (userStr) {
        try {
            const user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
            ethBalance = user.ethBalance || user.balance || 0;
        } catch (error) {
            console.error('Error getting user balance:', error);
        }
    }
    
    // Try to get ETH price from various sources
    const ethPrice = window.ETH_PRICE || 
                    localStorage.getItem('currentEthPrice') || 
                    localStorage.getItem('ethPrice') || 
                    2500;
    
    // Parse as float
    const ethPriceNum = parseFloat(ethPrice);
    
    // Calculate USD value
    const usdValue = (parseFloat(ethBalance) * ethPriceNum).toFixed(2);
    
    // Update USD display
    const balanceUsdElement = document.getElementById('balanceUSD');
    if (balanceUsdElement) {
        balanceUsdElement.textContent = `$${usdValue} USD`;
    }
    
    console.log('💵 Updated ETH price:', ethPriceNum, 'USD value:', usdValue);
    
    // Update every 30 seconds
    setTimeout(updateEthPriceAndValue, 30000);
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notification
    const existingNotification = document.querySelector('.eth-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `eth-notification eth-notification-${type}`;
    
    // Set icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
}

// Simulate ETH purchase (for demo purposes)
function simulateETHPurchase(amount) {
    console.log(`🎮 Simulating ETH purchase of ${amount} ETH`);
    
    // Get current user
    const userStr = localStorage.getItem('user') || localStorage.getItem('magicEdenCurrentUser');
    if (!userStr) {
        showNotification('❌ Please login first', 'error');
        return;
    }
    
    try {
        const user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
        
        // Update balance
        const currentBalance = parseFloat(user.ethBalance || user.balance || 0);
        const newBalance = currentBalance + parseFloat(amount);
        
        // Update user object
        user.ethBalance = newBalance;
        user.balance = newBalance;
        
        // Save back to localStorage
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('magicEdenCurrentUser', JSON.stringify(user));
        
        // Update display
        updateWalletBalance();
        updateEthPriceAndValue();
        
        // Show success message
        showNotification(`✅ Successfully added ${amount} ETH to your wallet!`, 'success');
        
        console.log(`✅ Balance updated: ${currentBalance} → ${newBalance} ETH`);
        
        // Dispatch storage event to update other tabs
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'user',
            newValue: JSON.stringify(user)
        }));
        
    } catch (error) {
        console.error('Error simulating purchase:', error);
        showNotification('❌ Failed to add ETH', 'error');
    }
}

// Quick guide for popular exchanges
function showExchangeGuide(exchange) {
    const guides = {
        'coinbase': 'Coinbase: Go to Assets → ETH → Send → Paste address → Confirm',
        'binance': 'Binance: Wallet → Fiat & Spot → Withdraw → ETH → Ethereum Network',
        'kraken': 'Kraken: Funding → Withdraw → ETH → Ethereum → Enter address',
        'crypto.com': 'Crypto.com: Accounts → Crypto Wallet → ETH → Transfer → Withdraw',
        'gemini': 'Gemini: Portfolio → ETH → Withdraw → Ethereum Network'
    };
    
    if (guides[exchange]) {
        showNotification(`💡 ${guides[exchange]}`, 'info', 5000);
    }
}

// Export functions to window for HTML onclick attributes
window.copyWalletAddress = copyWalletAddress;
window.openMetaMaskSite = openMetaMaskSite;
window.toggleInstructions = toggleInstructions;
window.hideInstructions = hideInstructions;
window.simulateETHPurchase = simulateETHPurchase;
window.showExchangeGuide = showExchangeGuide;