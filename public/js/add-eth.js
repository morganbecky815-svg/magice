// add-eth.js - Handles Add ETH page functionality
// FIXED VERSION - Removed the error message, always shows loading

let instructionsVisible = false;
let priceUpdateListener = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Add ETH Page Initializing...');
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login?redirect=add-eth';
        return;
    }
    
    // Show loading message immediately
    showLoadingState();
    
    // First try to load from localStorage (immediate display)
    loadAddressFromLocalStorage();
    
    // Then fetch fresh from backend to ensure we have the latest
    fetchAddressFromBackend();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update wallet balance
    updateWalletBalance();
    
    // Update ETH price and USD value
    updateEthPriceAndValue();
    
    // Subscribe to live ETH price updates
    subscribeToEthPriceUpdates();
    
    // Show initial warning
    showNotification('⚠️ Only send ETH on Ethereum Network (ERC-20). Other networks will result in lost funds.', 'warning', 8000);
    
    console.log('✅ Add ETH Page Initialized');
});

// Show loading state immediately
function showLoadingState() {
    const addressElement = document.getElementById('walletAddress');
    const qrContainer = document.getElementById('qrCode');
    
    if (addressElement) {
        addressElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading your wallet address...';
        addressElement.style.color = '#888';
        addressElement.style.fontStyle = 'italic';
    }
    
    if (qrContainer) {
        qrContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 30px; color: #8a2be2;"></i>
                <p style="margin-top: 10px; color: #666;">Generating QR code...</p>
            </div>
        `;
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
    
    console.log("✅ Add ETH page subscribing to price updates");
    
    priceUpdateListener = (newPrice) => {
        console.log("🔄 Add ETH page received price update: $", newPrice);
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
    const userStr = localStorage.getItem('user');
    let internalBalance = 0;
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            internalBalance = user.internalBalance || 0;
        } catch (error) {
            console.error('Error getting user balance:', error);
        }
    }
    
    const ethPrice = getCurrentEthPrice();
    const usdValue = (parseFloat(internalBalance) * ethPrice).toFixed(2);
    
    console.log('💵 Updating USD display - Balance:', internalBalance, 'ETH Price:', ethPrice, 'USD:', usdValue);
    
    const balanceUsdElement = document.getElementById('balanceUSD');
    if (balanceUsdElement) {
        balanceUsdElement.textContent = `$${usdValue} USD`;
        
        balanceUsdElement.style.transition = 'color 0.3s ease';
        balanceUsdElement.style.color = '#10b981';
        setTimeout(() => {
            balanceUsdElement.style.color = '#888';
        }, 500);
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

// Update wallet balance
function updateWalletBalance() {
    const userStr = localStorage.getItem('user');
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const internalBalance = user.internalBalance || 0;
            
            console.log('💰 Current balance:', internalBalance);
            
            const balanceAmount = document.getElementById('balanceAmount');
            if (balanceAmount) {
                balanceAmount.textContent = `${parseFloat(internalBalance).toFixed(4)} ETH`;
            }
            
            updateEthPriceAndValue();
            
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
}

// Load address from localStorage immediately
function loadAddressFromLocalStorage() {
    console.log('🔍 Checking localStorage for address...');
    
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.log('❌ No user data in localStorage');
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        console.log('👤 User from localStorage:', user);
        
        const possibleAddressFields = [
            'depositAddress',
            'walletAddress', 
            'ethAddress',
            'address',
            'publicAddress',
            'systemWalletAddress',
            'deposit_address',
            'wallet_address',
            'eth_wallet'
        ];
        
        let foundAddress = null;
        
        for (const field of possibleAddressFields) {
            if (user[field]) {
                foundAddress = user[field];
                console.log(`✅ Found address in field '${field}':`, foundAddress);
                break;
            }
        }
        
        if (foundAddress) {
            updateAddressDisplay(foundAddress);
            window.userAddress = foundAddress;
            generateQRCode(foundAddress);
        }
        // ✅ REMOVED: No error message shown here
        
    } catch (error) {
        console.error('❌ Error parsing user from localStorage:', error);
        // Keep showing loading state
    }
}

// Fetch address from backend
async function fetchAddressFromBackend() {
    console.log('📡 Fetching address from backend...');
    
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
                window.location.href = '/login?redirect=add-eth';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 API Response data:', data);
        
        if (data.success && data.user) {
            const user = data.user;
            console.log('👤 User from backend:', user);
            
            const possibleAddressFields = [
                'depositAddress',
                'walletAddress', 
                'ethAddress',
                'address',
                'publicAddress',
                'systemWalletAddress',
                'deposit_address',
                'wallet_address',
                'eth_wallet'
            ];
            
            let foundAddress = null;
            let foundField = null;
            
            for (const field of possibleAddressFields) {
                if (user[field]) {
                    foundAddress = user[field];
                    foundField = field;
                    console.log(`✅ Found address in field '${foundField}':`, foundAddress);
                    break;
                }
            }
            
            if (foundAddress) {
                // Update localStorage
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                currentUser.depositAddress = foundAddress;
                currentUser.internalBalance = user.internalBalance || currentUser.internalBalance || 0;
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                // Update display
                updateAddressDisplay(foundAddress);
                window.userAddress = foundAddress;
                generateQRCode(foundAddress);
                
                // Update balance and USD
                updateWalletBalance();
                updateEthPriceAndValue();
                
                console.log('✅ Address loaded successfully:', foundAddress);
                
            } else {
                console.log('⏳ No address found yet - this is normal for new accounts');
                // ✅ REMOVED: No error message shown here
                // Just keep showing the loading state
            }
        }
        
    } catch (error) {
        console.error('❌ Error fetching from backend:', error);
        // ✅ REMOVED: No error message shown here
        // Just keep showing the loading state
    }
}

// Update address display
function updateAddressDisplay(address) {
    const addressElement = document.getElementById('walletAddress');
    if (!addressElement) return;
    
    addressElement.textContent = address;
    addressElement.style.cssText = `
        color: #8a2be2;
        font-weight: 600;
        font-family: monospace;
        font-size: 14px;
        word-break: break-all;
        padding: 8px;
        background: #f8f5ff;
        border-radius: 8px;
        border: 1px solid #e2d9f0;
        font-style: normal;
    `;
    
    console.log('✅ Address display updated');
}

// Generate QR code
function generateQRCode(address) {
    console.log('🔳 Generating QR code for:', address);
    
    const qrContainer = document.getElementById('qrCode');
    if (!qrContainer) return;
    
    qrContainer.innerHTML = '';
    
    const qrImage = new Image();
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(address)}&format=png&color=000000&bgcolor=FFFFFF&margin=10`;
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
    qrImage.onclick = copyWalletAddress;
    
    qrImage.onload = () => {
        qrContainer.appendChild(qrImage);
        console.log('✅ QR code generated successfully');
    };
    
    qrImage.onerror = () => {
        console.log('⚠️ QR generation failed, showing fallback');
        
        qrContainer.innerHTML = `
            <div style="text-align: center;">
                <div style="
                    background: #f8f5ff;
                    padding: 20px;
                    border-radius: 12px;
                    border: 2px dashed #8a2be2;
                    margin-bottom: 10px;
                ">
                    <i class="fas fa-qrcode" style="font-size: 48px; color: #8a2be2;"></i>
                    <p style="margin: 10px 0; font-family: monospace; word-break: break-all;">
                        ${address}
                    </p>
                </div>
                <button onclick="copyWalletAddress()" style="
                    background: #8a2be2;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                ">
                    <i class="fas fa-copy"></i> Copy Address
                </button>
            </div>
        `;
    };
}

// Copy wallet address
function copyWalletAddress() {
    console.log('📋 Copy button clicked');
    
    const address = window.userAddress || document.getElementById('walletAddress')?.textContent;
    
    if (!address || address.includes('Loading') || address.includes('loading') || address.includes('spinner')) {
        console.error('❌ No valid address to copy yet');
        showNotification('Wallet address is still loading...', 'info', 2000);
        return;
    }
    
    navigator.clipboard.writeText(address).then(() => {
        console.log('✅ Address copied:', address);
        
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
        
        showNotification('Wallet address copied!', 'success', 2000);
    }).catch(err => {
        console.error('❌ Failed to copy:', err);
        showNotification('Failed to copy address', 'error');
    });
}

// Setup event listeners
function setupEventListeners() {
    const copyBtn = document.getElementById('copyAddressBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyWalletAddress);
    }
    
    const metamaskBtn = document.getElementById('openMetaMaskBtn');
    if (metamaskBtn) {
        metamaskBtn.addEventListener('click', () => {
            window.open('https://metamask.io/', '_blank');
        });
    }
    
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');
    if (showInstructionsBtn) {
        showInstructionsBtn.addEventListener('click', toggleInstructions);
    }
    
    const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
    if (closeInstructionsBtn) {
        closeInstructionsBtn.addEventListener('click', hideInstructions);
    }
    
    document.querySelectorAll('.incompatible').forEach(row => {
        row.addEventListener('click', () => {
            showNotification('This network is NOT compatible! Funds sent here will be lost.', 'error', 5000);
        });
    });
    
    window.addEventListener('storage', (event) => {
        if (event.key === 'user') {
            console.log('📦 User data updated in another tab');
            loadAddressFromLocalStorage();
            updateWalletBalance();
            updateEthPriceAndValue();
        }
    });
}

// Toggle instructions
function toggleInstructions() {
    const instructions = document.getElementById('transferInstructions');
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');
    
    if (!instructionsVisible) {
        instructions.style.display = 'block';
        instructionsVisible = true;
        
        if (showInstructionsBtn) {
            showInstructionsBtn.innerHTML = '<i class="fas fa-times"></i> Hide Instructions';
            showInstructionsBtn.style.background = '#6b7280';
        }
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
    
    if (showInstructionsBtn) {
        showInstructionsBtn.innerHTML = '<i class="fas fa-university"></i> Show Instructions';
        showInstructionsBtn.style.background = '';
    }
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.eth-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'eth-notification';
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        background: ${colors[type] || colors.info};
        color: white;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(150%);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(150%)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (priceUpdateListener && window.ethPriceService) {
        window.ethPriceService.unsubscribe(priceUpdateListener);
    }
});

// Make functions globally available
window.copyWalletAddress = copyWalletAddress;
window.toggleInstructions = toggleInstructions;
window.hideInstructions = hideInstructions;