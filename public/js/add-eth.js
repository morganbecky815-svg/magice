// add-eth.js - Handles Add ETH page functionality
// UPDATED VERSION - Shows user's actual wallet address

let instructionsVisible = false;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Add ETH Page Initializing...');
    
    // Load user's wallet address from localStorage
    loadUserWalletAddress();
    
    // Generate QR Code with user's wallet address
    generateQRCode();
    
    // Update wallet balance
    updateWalletBalance();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update ETH price and USD value
    updateEthPriceAndValue();
    
    // Start listening for price updates
    listenForPriceUpdates();
    
    // Show initial warning
    showNotification('⚠️ Only send ETH on Ethereum Network (ERC-20). Other networks will result in lost funds.', 'warning', 8000);
    
    console.log('✅ Add ETH Page Initialized');
});

// Load user's wallet address from localStorage
function loadUserWalletAddress() {
    console.log('🔍 Loading user wallet address...');
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.error('❌ No user data found');
        document.getElementById('walletAddress').textContent = 'Please login first';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        const walletAddress = user.systemWalletAddress || user.walletAddress;
        
        if (walletAddress) {
            console.log('✅ Found wallet address:', walletAddress);
            
            // Update display
            const addressElement = document.getElementById('walletAddress');
            if (addressElement) {
                addressElement.textContent = walletAddress;
            }
            
            // Store for QR code generation
            window.userWalletAddress = walletAddress;
            
        } else {
            console.error('❌ No wallet address in user data');
            document.getElementById('walletAddress').textContent = 'No wallet address found';
        }
    } catch (error) {
        console.error('❌ Error parsing user data:', error);
        document.getElementById('walletAddress').textContent = 'Error loading wallet';
    }
}

// Get user's wallet address (for QR code)
function getUserWalletAddress() {
    return window.userWalletAddress || '0x489D9e921383Aaa7953e0216e460c2208a375Fe1'; // Fallback
}

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
        logo.addEventListener('click', function() {
            const exchangeName = this.querySelector('span').textContent;
            console.log(`Opening ${exchangeName} exchange`);
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
    
    // Show network comparison warnings
    document.querySelectorAll('.incompatible').forEach(row => {
        row.addEventListener('click', function() {
            showNotification('This network is NOT compatible! Funds sent here will be lost.', 'error', 5000);
        });
    });
}

// SIMPLE, RELIABLE QR CODE FUNCTION
function generateQRCode() {
    console.log('🔳 Generating QR Code...');
    
    const walletAddress = getUserWalletAddress();
    const qrContainer = document.getElementById('qrCode');
    if (!qrContainer) {
        console.error('❌ QR Code container not found!');
        return;
    }
    
    // Clear container and show loading
    qrContainer.innerHTML = `
        <div class="qr-loading" style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-spinner fa-spin" style="font-size: 30px; margin-bottom: 10px; color: #8a2be2;"></i>
            <p>Loading QR Code...</p>
        </div>
    `;
    
    // Use reliable QR code service with fallback
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(walletAddress)}&format=png&color=000000&bgcolor=FFFFFF&margin=10`;
    
    // Create image element
    const qrImage = new Image();
    qrImage.src = qrUrl;
    qrImage.alt = "Ethereum Wallet QR Code";
    qrImage.style.cssText = `
        width: 250px;
        height: 250px;
        border-radius: 12px;
        border: 2px solid #e2e8f0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        cursor: pointer;
        background: white;
        display: block;
        margin: 0 auto;
        transition: all 0.3s ease;
    `;
    qrImage.title = "Click to copy address";
    
    // Add click to copy functionality
    qrImage.onclick = copyWalletAddress;
    
    // Add hover effects
    qrImage.addEventListener('mouseover', function() {
        this.style.transform = "scale(1.03)";
        this.style.boxShadow = "0 8px 30px rgba(0,0,0,0.15)";
    });
    
    qrImage.addEventListener('mouseout', function() {
        this.style.transform = "scale(1)";
        this.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)";
    });
    
    // Add load event
    qrImage.addEventListener('load', function() {
        console.log('✅ QR Code loaded successfully!');
        qrContainer.innerHTML = '';
        qrContainer.appendChild(qrImage);
    });
    
    // Add error handling with fallback
    qrImage.addEventListener('error', function() {
        console.warn('QR Server failed, using Google Charts fallback...');
        const fallbackUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(walletAddress)}&choe=UTF-8`;
        this.src = fallbackUrl;
    });
}

// Copy wallet address to clipboard
function copyWalletAddress() {
    const walletAddress = getUserWalletAddress();
    
    try {
        navigator.clipboard.writeText(walletAddress)
            .then(() => {
                // Show feedback on copy button
                const copyBtn = document.getElementById('copyAddressBtn');
                if (copyBtn) {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    copyBtn.style.background = '#10b981';
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.style.background = '';
                    }, 2000);
                }
                
                // Visual feedback on QR code
                const qrImage = document.querySelector('#qrCode img');
                if (qrImage) {
                    qrImage.style.borderColor = '#10b981';
                    qrImage.style.transform = 'scale(0.95)';
                    
                    setTimeout(() => {
                        qrImage.style.borderColor = '#e2e8f0';
                        qrImage.style.transform = 'scale(1)';
                    }, 500);
                }
                
                console.log('✅ Address copied to clipboard');
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
    window.open('https://metamask.io/', '_blank');
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
            showInstructionsBtn.style.background = '#6b7280';
        }
        
        console.log('📖 Instructions shown');
        
        // Smooth scroll to instructions
        setTimeout(() => {
            instructions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
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
        showInstructionsBtn.style.background = '';
    }
    
    console.log('📖 Instructions hidden');
}

// Update wallet balance from localStorage
function updateWalletBalance() {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
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
    } else {
        // Default display if no user
        const balanceAmount = document.getElementById('balanceAmount');
        if (balanceAmount) {
            balanceAmount.textContent = '0.0000 ETH';
        }
    }
}

// Update ETH price and calculate USD value
function updateEthPriceAndValue() {
    // Get user data
    const userStr = localStorage.getItem('user');
    let ethBalance = 0;
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            ethBalance = user.ethBalance || user.balance || 0;
        } catch (error) {
            console.error('Error getting user balance:', error);
        }
    }
    
    // Get current ETH price
    const ethPrice = getCurrentEthPrice();
    const usdValue = (parseFloat(ethBalance) * ethPrice).toFixed(2);
    
    // Update USD display
    const balanceUsdElement = document.getElementById('balanceUSD');
    if (balanceUsdElement) {
        balanceUsdElement.textContent = `$${usdValue} USD`;
    }
    
    // Log for debugging
    console.log('💵 ETH Price:', ethPrice, 'Balance:', ethBalance, 'USD Value:', usdValue);
}

// Get current ETH price from available sources
function getCurrentEthPrice() {
    // Priority 1: Use ethPriceService (live price)
    if (window.ethPriceService && window.ethPriceService.currentPrice) {
        return window.ethPriceService.currentPrice;
    }
    // Priority 2: Use global variable
    else if (window.ETH_PRICE) {
        return window.ETH_PRICE;
    }
    // Priority 3: Try localStorage cache
    else {
        const cached = localStorage.getItem('ethPriceCache');
        if (cached) {
            try {
                const cacheData = JSON.parse(cached);
                return cacheData.price || 2500;
            } catch (e) {
                return 2500;
            }
        }
        return 2500; // Default fallback
    }
}

// Listen for price updates from ethPriceService
function listenForPriceUpdates() {
    if (!window.ethPriceService) {
        // Try again after 1 second
        setTimeout(listenForPriceUpdates, 1000);
        return;
    }
    
    // Subscribe to price updates
    window.ethPriceService.subscribe((newPrice) => {
        console.log('🔄 Add-ETH page received price update:', newPrice);
        updateEthPriceAndValue();
    });
    
    // Force initial update
    setTimeout(() => {
        if (window.ethPriceService) {
            window.ethPriceService.updateAllDisplays();
        }
    }, 1500);
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
    
    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .eth-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                background: white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 1000;
                transform: translateX(150%);
                transition: transform 0.3s ease;
                max-width: 400px;
            }
            .eth-notification.show {
                transform: translateX(0);
            }
            .eth-notification-success {
                border-left: 4px solid #10b981;
                color: #065f46;
            }
            .eth-notification-error {
                border-left: 4px solid #ef4444;
                color: #991b1b;
            }
            .eth-notification-warning {
                border-left: 4px solid #f59e0b;
                color: #92400e;
            }
            .eth-notification-info {
                border-left: 4px solid #3b82f6;
                color: #1e40af;
            }
        `;
        document.head.appendChild(styles);
    }
    
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

// Simulate ETH purchase (for demo/testing)
function simulateETHPurchase(amount) {
    console.log(`🎮 Simulating ETH purchase of ${amount} ETH`);
    
    // Get current user
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showNotification('❌ Please login first', 'error');
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        
        // Update balance
        const currentBalance = parseFloat(user.ethBalance || user.balance || 0);
        const newBalance = currentBalance + parseFloat(amount);
        
        // Update user object
        user.ethBalance = newBalance;
        user.balance = newBalance;
        
        // Save back to localStorage
        localStorage.setItem('user', JSON.stringify(user));
        
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

// Make functions globally available
window.copyWalletAddress = copyWalletAddress;
window.openMetaMaskSite = openMetaMaskSite;
window.toggleInstructions = toggleInstructions;
window.hideInstructions = hideInstructions;
window.simulateETHPurchase = simulateETHPurchase;
window.showExchangeGuide = showExchangeGuide;

// QR Code click handler for the hardcoded image in HTML
if (document.getElementById('qrCode')) {
    document.getElementById('qrCode').addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG') {
            copyWalletAddress();
        }
    });
}