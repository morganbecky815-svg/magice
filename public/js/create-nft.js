// ============================================
// create-nft.js - PRODUCTION VERSION (V1)
// ============================================

// Fetch live ETH price on load
(async function() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        
        if (data.ethereum && data.ethereum.usd) {
            window.ETH_PRICE = data.ethereum.usd;
            ethToUsdRate = data.ethereum.usd; // Set the global rate
            console.log('✅ Live ETH price loaded:', window.ETH_PRICE);
            
            // Update ONLY the ETH price display
            const ethPriceDisplay = document.getElementById('ethPriceDisplay');
            if (ethPriceDisplay) {
                ethPriceDisplay.textContent = `$${ethToUsdRate.toLocaleString()}`;
            }
            
            // Also update any NFT value display if price is set
            const priceInput = document.getElementById('nftPrice');
            if (priceInput) {
                const price = parseFloat(priceInput.value) || 0;
                const nftValueDisplay = document.getElementById('nftValueDisplay');
                if (nftValueDisplay) {
                    const nftValueUsd = price * ethToUsdRate;
                    nftValueDisplay.textContent = `$${nftValueUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                }
            }
        }
    } catch (error) {
        console.error('Failed to fetch ETH price, using default');
        window.ETH_PRICE = 2500;
        ethToUsdRate = 2500; // Set default rate
        
        // Update ETH price display with default
        const ethPriceDisplay = document.getElementById('ethPriceDisplay');
        if (ethPriceDisplay) {
            ethPriceDisplay.textContent = `$${ethToUsdRate.toLocaleString()}`;
        }
    }
})();

// NFT Creation Functionality
console.log("🚀 Initializing Production NFT Creation...");

// DOM Elements
let currentFile = null;
let attributes = [];
let isBalanceSufficient = false;
let ethToUsdRate = window.ETH_PRICE || 2500; // Current ETH price in USD
let isMintingInProgress = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeNFTForm();
    checkUserBalance();
    setupEventListeners();
    updatePriceDisplay();
});

// Initialize Form
function initializeNFTForm() {
    console.log("📝 Initializing NFT Form...");
    
    try {
        // Load real balance from backend
        loadRealUserBalance();
        
        // Load user's actual collections from database
        loadUserCollections();
        
        // Setup file upload
        setupFileUpload();
        
        // Setup price calculations
        setupPriceCalculations();
        
        // Validate form on input
        setupFormValidation();
        
        // Initialize minting status
        isMintingInProgress = false;
        
        // Update initial display
        updateCostSummary();
        
        console.log("✅ NFT Form initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing NFT form:", error);
        showError("Failed to initialize form. Please refresh the page.");
    }
}

// ============================================
// DYNAMIC COLLECTIONS 
// ============================================

async function loadUserCollections() {
    try {
        const userStr = localStorage.getItem('magicEdenCurrentUser') || localStorage.getItem('user');
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        
        if (!userStr || !token) return;
        
        const user = JSON.parse(userStr);
        const userId = user._id || user.id;
        const select = document.getElementById('collectionSelect');
        
        if (!select) return;

        // Clear hardcoded options, keep "Create New Collection"
        select.innerHTML = '<option value="">Create New Collection</option>';

        // Try to fetch real collections
        const response = await fetch(`/api/collections/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) return; // Silent fail if endpoint doesn't exist yet
        
        const data = await response.json();
        
        if (data.success && data.collections && data.collections.length > 0) {
            data.collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.name; 
                option.textContent = collection.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("❌ Error loading collections:", error);
    }
}

// ============================================
// FILE UPLOAD HANDLING
// ============================================

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('imageUpload');
    
    if (!uploadArea || !fileInput) return;
    
    // Click to upload
    uploadArea.addEventListener('click', function(e) {
        const uploadBtn = uploadArea.querySelector('.upload-btn');
        if (e.target !== uploadBtn) {
            fileInput.click();
        }
    });
    
    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        uploadArea.classList.add('dragover');
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.backgroundColor = '#f0f4ff';
    }
    
    function unhighlight() {
        uploadArea.classList.remove('dragover');
        uploadArea.style.borderColor = '#cbd5e0';
        uploadArea.style.backgroundColor = '#f8fafc';
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFiles(files);
    }
    
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
}

function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 
        'image/gif', 'image/svg+xml', 
        'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (!validTypes.includes(file.type)) {
        showError(`File type "${file.type}" is not supported. Please upload an image or video.`);
        return;
    }
    
    if (file.size > maxSize) {
        showError(`File size exceeds maximum limit of 50MB`);
        return;
    }
    
    currentFile = file;
    displayPreview(file);
    updateCreateButton();
}

function displayPreview(file) {
    const uploadArea = document.getElementById('uploadArea');
    const preview = document.getElementById('imagePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    if (!uploadArea || !preview) return;
    
    uploadArea.style.display = 'none';
    preview.style.display = 'block';
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    const previewImage = document.getElementById('previewImage');
    const previewVideo = document.getElementById('previewVideo');
    
    if (file.type.startsWith('image/')) {
        previewImage.style.display = 'block';
        previewVideo.style.display = 'none';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        previewImage.style.display = 'none';
        previewVideo.style.display = 'block';
        
        const url = URL.createObjectURL(file);
        previewVideo.src = url;
        
        previewVideo.onload = function() { URL.revokeObjectURL(url); };
    }
}

function removePreview() {
    const uploadArea = document.getElementById('uploadArea');
    const preview = document.getElementById('imagePreview');
    
    if (!uploadArea || !preview) return;
    
    uploadArea.style.display = 'block';
    preview.style.display = 'none';
    currentFile = null;
    
    const previewImage = document.getElementById('previewImage');
    const previewVideo = document.getElementById('previewVideo');
    
    if (previewImage) previewImage.src = '';
    if (previewVideo) {
        previewVideo.src = '';
        previewVideo.pause();
    }
    
    updateCreateButton();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function toggleCollectionFields() {
    const select = document.getElementById('collectionSelect');
    const newFields = document.getElementById('newCollectionFields');
    
    if (!select || !newFields) return;
    
    if (select.value === '') {
        newFields.style.display = 'block';
        const collectionName = document.getElementById('collectionName');
        if (collectionName) collectionName.required = true;
    } else {
        newFields.style.display = 'none';
        const collectionName = document.getElementById('collectionName');
        if (collectionName) collectionName.required = false;
    }
    
    updateCreateButton();
}

// ============================================
// PRICE CALCULATIONS
// ============================================

function setupPriceCalculations() {
    const priceInput = document.getElementById('nftPrice');
    if (!priceInput) return;
    
    priceInput.addEventListener('input', function() {
        updatePriceDisplay();
        updateCostSummary();
    });
    
    const royaltySlider = document.getElementById('royaltySlider');
    const royaltyInput = document.getElementById('royaltyPercentage');
    
    if (royaltySlider) {
        royaltySlider.addEventListener('input', function() {
            updatePriceDisplay();
            updateCostSummary();
        });
    }
    
    if (royaltyInput) {
        royaltyInput.addEventListener('input', function() {
            updatePriceDisplay();
            updateCostSummary();
        });
    }
    
    updatePriceDisplay();
    updateCostSummary();
}

function updatePriceDisplay() {
    const priceInput = document.getElementById('nftPrice');
    const ethPriceDisplay = document.getElementById('ethPriceDisplay');
    const nftValueDisplay = document.getElementById('nftValueDisplay');
    const sellingPriceDisplay = document.getElementById('sellingPriceDisplay');
    
    if (!priceInput) return;
    
    const price = parseFloat(priceInput.value) || 0;
    const nftValueUsd = price * ethToUsdRate;
    
    if (ethPriceDisplay) {
        ethPriceDisplay.textContent = `$${ethToUsdRate.toLocaleString()}`;
    }
    
    if (nftValueDisplay) {
        if (isNaN(nftValueUsd) || nftValueUsd === 0) {
            nftValueDisplay.textContent = '$0.00';
        } else {
            nftValueDisplay.textContent = `$${nftValueUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
    }
    
    if (sellingPriceDisplay) {
        sellingPriceDisplay.textContent = `${price.toFixed(4)} WETH`;
    }
}

function updateCostSummary() {
    const priceInput = document.getElementById('nftPrice');
    const royaltyInput = document.getElementById('royaltyPercentage');
    
    if (!priceInput || !royaltyInput) return;
    
    const price = parseFloat(priceInput.value) || 0;
    const royalty = parseFloat(royaltyInput.value) || 0;
    
    const mintingFeeDisplay = document.querySelector('.cost-breakdown .breakdown-item:nth-child(1) span:last-child');
    const sellingPriceDisplay = document.querySelector('.cost-breakdown .breakdown-item:nth-child(2) span:last-child');
    const royaltyDisplay = document.querySelector('.cost-breakdown .breakdown-item:nth-child(3) span:last-child');
    
    if (mintingFeeDisplay) mintingFeeDisplay.textContent = "0.1 ETH";
    if (sellingPriceDisplay) sellingPriceDisplay.textContent = `${price.toFixed(4)} WETH`;
    if (royaltyDisplay) royaltyDisplay.textContent = `${royalty}%`;
    
    const platformFeeItem = document.querySelector('.cost-breakdown .breakdown-item:nth-child(4)');
    if (platformFeeItem) platformFeeItem.style.display = 'none';
    
    const totalEarnings = document.querySelector('.cost-breakdown .breakdown-item.total span:last-child');
    if (totalEarnings) totalEarnings.textContent = `${price.toFixed(4)} WETH`;
    
    const platformFeeInfo = document.querySelector('.platform-fee-info');
    if (platformFeeInfo) platformFeeInfo.style.display = 'none';
}

function updateRoyaltyDisplay() {
    const slider = document.getElementById('royaltySlider');
    const display = document.getElementById('royaltyDisplay');
    const input = document.getElementById('royaltyPercentage');
    
    if (!slider || !display || !input) return;
    
    const value = parseFloat(slider.value).toFixed(1);
    display.textContent = value + '%';
    input.value = value;
    
    updateCostSummary();
}

function updateRoyaltySlider() {
    const input = document.getElementById('royaltyPercentage');
    const slider = document.getElementById('royaltySlider');
    const display = document.getElementById('royaltyDisplay');
    
    if (!input || !slider || !display) return;
    
    let value = parseFloat(input.value);
    
    if (isNaN(value)) value = 5;
    if (value < 0) value = 0;
    if (value > 20) value = 20;
    
    input.value = value.toFixed(1);
    slider.value = value;
    display.textContent = value.toFixed(1) + '%';
    
    updateCostSummary();
}

// ============================================
// LIVE PRODUCTION BALANCE FETCHER
// ============================================

async function loadRealUserBalance() {
    try {
        console.log("🔄 Fetching live balance from production database...");
        
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) {
            updateBalanceDisplay(0);
            checkBalanceSufficiency(0);
            return 0;
        }

        // 1. Fetch exactly like the dashboard does
        let response = await fetch('/api/user/me/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Fallback route from dashboard.js
        if (response.status === 404) {
            response = await fetch('/api/users/me/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                // V1 strictly uses internalBalance for ETH
                const liveEthBalance = parseFloat(data.user.internalBalance) || parseFloat(data.user.ethBalance) || 0;
                console.log("✅ Live Database Balance:", liveEthBalance);

                // Keep localStorage in sync with the database globally
                localStorage.setItem('user', JSON.stringify(data.user));

                // Update UI
                updateBalanceDisplay(liveEthBalance);
                checkBalanceSufficiency(liveEthBalance);
                return liveEthBalance;
            }
        }
        
        return 0;
    } catch (error) {
        console.error("❌ Error fetching live balance:", error);
        updateBalanceDisplay(0);
        checkBalanceSufficiency(0);
        return 0;
    }
}

async function checkUserBalance() {
    try {
        await loadRealUserBalance();
    } catch (error) {
        console.error("Error in checkUserBalance:", error);
    }
}

function updateBalanceDisplay(balance) {
    const balanceElements = [
        document.getElementById('userEthBalance'),
        document.getElementById('currentBalance'),
        document.querySelector('.current-balance span:last-child')
    ];
    
    balanceElements.forEach(el => {
        if (el) el.textContent = `${parseFloat(balance).toFixed(4)} ETH`;
    });
}

function checkBalanceSufficiency(balance) {
    const requiredBalance = 0.1; // 0.1 ETH Minting fee
    const statusElement = document.getElementById('balanceStatus');
    const insufficientElement = document.getElementById('insufficientBalance');
    
    if (!statusElement || !insufficientElement) return;
    
    if (balance >= requiredBalance) {
        statusElement.className = 'balance-status success';
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Sufficient ETH balance for minting';
        insufficientElement.style.display = '
