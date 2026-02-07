// create-nft.js
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
console.log("🚀 Initializing NFT Creation...");

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

// File Upload Handling
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('imageUpload');
    
    if (!uploadArea || !fileInput) {
        console.error("❌ Upload elements not found");
        return;
    }
    
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
    
    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    }
    
    // Handle file input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
}

function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    console.log(`📁 File selected: ${file.name} (${formatFileSize(file.size)})`);
    
    // Validate file type
    const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 
        'image/gif', 'image/svg+xml', 
        'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (!validTypes.includes(file.type)) {
        showError(`File type "${file.type}" is not supported. Please upload an image (JPG, PNG, GIF, SVG) or video (MP4, WebM)`);
        return;
    }
    
    if (file.size > maxSize) {
        showError(`File size (${formatFileSize(file.size)}) exceeds maximum limit of 50MB`);
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
    
    // Show preview, hide upload area
    uploadArea.style.display = 'none';
    preview.style.display = 'block';
    
    // Update file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // Create preview
    const previewImage = document.getElementById('previewImage');
    const previewVideo = document.getElementById('previewVideo');
    
    if (file.type.startsWith('image/')) {
        previewImage.style.display = 'block';
        previewVideo.style.display = 'none';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
        };
        reader.onerror = function() {
            showError('Failed to load image file');
            removePreview();
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        previewImage.style.display = 'none';
        previewVideo.style.display = 'block';
        
        const url = URL.createObjectURL(file);
        previewVideo.src = url;
        
        // Clean up URL when video loads
        previewVideo.onload = function() {
            URL.revokeObjectURL(url);
        };
        
        previewVideo.onerror = function() {
            showError('Failed to load video file');
            removePreview();
        };
    }
}

function removePreview() {
    const uploadArea = document.getElementById('uploadArea');
    const preview = document.getElementById('imagePreview');
    
    if (!uploadArea || !preview) return;
    
    uploadArea.style.display = 'block';
    preview.style.display = 'none';
    currentFile = null;
    
    // Reset preview elements
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

// Collection Fields Toggle
function toggleCollectionFields() {
    const select = document.getElementById('collectionSelect');
    const newFields = document.getElementById('newCollectionFields');
    
    if (!select || !newFields) return;
    
    if (select.value === '') {
        newFields.style.display = 'block';
        // Add required attribute to collection name
        const collectionName = document.getElementById('collectionName');
        if (collectionName) {
            collectionName.required = true;
        }
    } else {
        newFields.style.display = 'none';
        // Remove required attribute from collection name
        const collectionName = document.getElementById('collectionName');
        if (collectionName) {
            collectionName.required = false;
        }
    }
    
    updateCreateButton();
}

// Price Calculations
function setupPriceCalculations() {
    const priceInput = document.getElementById('nftPrice');
    if (!priceInput) return;
    
    // Update price display on input
    priceInput.addEventListener('input', function() {
        updatePriceDisplay();
        updateCostSummary();
    });
    priceInput.addEventListener('change', function() {
        updatePriceDisplay();
        updateCostSummary();
    });
    
    // Also update on royalty changes
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
        royaltyInput.addEventListener('change', function() {
            updatePriceDisplay();
            updateCostSummary();
        });
    }
    
    // Initial update
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
    
    // Calculate NFT value in USD
    const nftValueUsd = price * ethToUsdRate;
    
    // Update displays
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
    
    // Update the cost summary section
    const mintingFeeDisplay = document.querySelector('.cost-breakdown .breakdown-item:nth-child(1) span:last-child');
    const sellingPriceDisplay = document.querySelector('.cost-breakdown .breakdown-item:nth-child(2) span:last-child');
    const royaltyDisplay = document.querySelector('.cost-breakdown .breakdown-item:nth-child(3) span:last-child');
    
    if (mintingFeeDisplay) {
        mintingFeeDisplay.textContent = "0.1 ETH";
    }
    
    if (sellingPriceDisplay) {
        sellingPriceDisplay.textContent = `${price.toFixed(4)} WETH`;
    }
    
    if (royaltyDisplay) {
        royaltyDisplay.textContent = `${royalty}%`;
    }
    
    // Remove platform fee display if it exists
    const platformFeeItem = document.querySelector('.cost-breakdown .breakdown-item:nth-child(4)');
    if (platformFeeItem) {
        platformFeeItem.style.display = 'none';
    }
    
    // Update total to show just the selling price
    const totalEarnings = document.querySelector('.cost-breakdown .breakdown-item.total span:last-child');
    if (totalEarnings) {
        totalEarnings.textContent = `${price.toFixed(4)} WETH`;
    }
    
    // Remove platform fee info section if it exists
    const platformFeeInfo = document.querySelector('.platform-fee-info');
    if (platformFeeInfo) {
        platformFeeInfo.style.display = 'none';
    }
}

// Royalties Slider
function updateRoyaltyDisplay() {
    const slider = document.getElementById('royaltySlider');
    const display = document.getElementById('royaltyDisplay');
    const input = document.getElementById('royaltyPercentage');
    
    if (!slider || !display || !input) return;
    
    const value = parseFloat(slider.value).toFixed(1);
    display.textContent = value + '%';
    input.value = value;
    
    // Update cost summary when royalty changes
    updateCostSummary();
}

function updateRoyaltySlider() {
    const input = document.getElementById('royaltyPercentage');
    const slider = document.getElementById('royaltySlider');
    const display = document.getElementById('royaltyDisplay');
    
    if (!input || !slider || !display) return;
    
    let value = parseFloat(input.value);
    
    // Validate range
    if (isNaN(value)) value = 5;
    if (value < 0) value = 0;
    if (value > 20) value = 20;
    
    input.value = value.toFixed(1);
    slider.value = value;
    display.textContent = value.toFixed(1) + '%';
    
    // Update cost summary when royalty changes
    updateCostSummary();
}

// Balance Check
async function checkUserBalance() {
    try {
        await loadRealUserBalance();
    } catch (error) {
        console.error("❌ Error checking balance:", error);
        showError("Failed to check ETH balance. Please refresh the page.");
    }
}

// Form Validation
function setupFormValidation() {
    const form = document.getElementById('nftCreationForm');
    if (!form) return;
    
    // Validate terms checkbox
    const termsCheckbox = document.getElementById('agreeTerms');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', updateCreateButton);
        updateTermsLabel();
    }
    
    // Validate on input for required fields
    const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('input', validateField);
        input.addEventListener('blur', validateField);
    });
    
    // Validate number inputs
    const numberInputs = form.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', validateNumberField);
        input.addEventListener('blur', validateNumberField);
    });
}

function updateTermsLabel() {
    const termsLabel = document.querySelector('label[for="agreeTerms"]');
    if (termsLabel) {
        termsLabel.innerHTML = `
            I agree to the <a href="#" onclick="return false;">Terms of Service</a> and understand that:
            <ul>
                <li>Minting fee of 0.1 ETH is non-refundable</li>
                <li>Royalties will be applied to secondary sales</li>
                <li>NFT will be listed for sale immediately upon minting</li>
                <li>A 15% platform and gas fee will be deducted from your sales revenue when converting WETH to ETH.</li>
                <li>NFT will be permanently recorded on Ethereum blockchain</li>
            </ul>
        `;
    }
}

function validateField(e) {
    const field = e.target;
    const formGroup = field.closest('.form-group');
    
    if (!formGroup) return false;
    
    // Remove existing error
    formGroup.classList.remove('error');
    const existingError = formGroup.querySelector('.validation-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Check required fields
    if (field.hasAttribute('required') && !field.value.trim()) {
        formGroup.classList.add('error');
        const errorMsg = document.createElement('div');
        errorMsg.className = 'validation-error';
        errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> This field is required';
        formGroup.appendChild(errorMsg);
        return false;
    }
    
    // URL validation
    if (field.type === 'url' && field.value.trim()) {
        try {
            const url = new URL(field.value.trim());
            if (!['http:', 'https:'].includes(url.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch {
            formGroup.classList.add('error');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'validation-error';
            errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter a valid URL starting with http:// or https://';
            formGroup.appendChild(errorMsg);
            return false;
        }
    }
    
    updateCreateButton();
    return true;
}

function validateNumberField(e) {
    const field = e.target;
    const formGroup = field.closest('.form-group');
    
    if (!formGroup) return;
    
    // Remove existing error
    formGroup.classList.remove('error');
    const existingError = formGroup.querySelector('.validation-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Validate min/max constraints
    if (field.hasAttribute('min')) {
        const min = parseFloat(field.getAttribute('min'));
        const value = parseFloat(field.value);
        if (!isNaN(value) && value < min) {
            formGroup.classList.add('error');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'validation-error';
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> Value must be at least ${min}`;
            formGroup.appendChild(errorMsg);
            return false;
        }
    }
    
    if (field.hasAttribute('max')) {
        const max = parseFloat(field.getAttribute('max'));
        const value = parseFloat(field.value);
        if (!isNaN(value) && value > max) {
            formGroup.classList.add('error');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'validation-error';
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> Value must be at most ${max}`;
            formGroup.appendChild(errorMsg);
            return false;
        }
    }
    
    return true;
}

function updateCreateButton() {
    const createBtn = document.getElementById('createBtn');
    if (!createBtn) return;
    
    const hasFile = !!currentFile;
    const termsAgreed = document.getElementById('agreeTerms')?.checked || false;
    
    // Check required fields
    const requiredFields = document.querySelectorAll('input[required], textarea[required], select[required]');
    let requiredFilled = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            requiredFilled = false;
        }
    });
    
    // Check collection name if creating new collection
    const collectionSelect = document.getElementById('collectionSelect');
    if (collectionSelect?.value === '') {
        const collectionName = document.getElementById('collectionName');
        if (collectionName && !collectionName.value.trim()) {
            requiredFilled = false;
        }
    }
    
    const isDisabled = !(hasFile && requiredFilled && termsAgreed && isBalanceSufficient);
    createBtn.disabled = isDisabled;
    
    // Add/remove loading class
    if (isMintingInProgress) {
        createBtn.classList.add('loading');
        createBtn.disabled = true;
    } else {
        createBtn.classList.remove('loading');
    }
}

// Preview NFT
function previewNFT() {
    if (!currentFile) {
        showError('Please upload an artwork first');
        return;
    }
    
    const modal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    
    if (!modal || !previewContent) {
        showError('Preview modal not found');
        return;
    }
    
    // Gather form data
    const nftName = document.getElementById('nftName').value || 'Untitled NFT';
    const nftDescription = document.getElementById('nftDescription').value || 'No description provided';
    const royalty = document.getElementById('royaltyPercentage').value || '5';
    const price = document.getElementById('nftPrice').value || '0.5';
    
    // Build preview HTML
    let previewHTML = '<div class="preview-content">';
    previewHTML += '<div class="preview-image">';
    
    if (currentFile.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(currentFile);
        previewHTML += `<img src="${imageUrl}" alt="${nftName}" onload="URL.revokeObjectURL(this.src)">`;
    } else {
        const videoUrl = URL.createObjectURL(currentFile);
        previewHTML += `<video src="${videoUrl}" controls onload="URL.revokeObjectURL(this.src)"></video>`;
    }
    
    previewHTML += '</div>';
    previewHTML += '<div class="preview-details">';
    previewHTML += `<h4>${escapeHtml(nftName)}</h4>`;
    previewHTML += `<p class="preview-description">${escapeHtml(nftDescription)}</p>`;
    
    // Collection info
    const collectionSelect = document.getElementById('collectionSelect');
    if (collectionSelect) {
        const collectionName = collectionSelect.value === '' 
            ? document.getElementById('collectionName')?.value || 'New Collection'
            : collectionSelect.options[collectionSelect.selectedIndex].text;
        previewHTML += `<div class="preview-collection"><strong>Collection:</strong> ${escapeHtml(collectionName)}</div>`;
    }
    
    // Price and fees
    const nftValueUsd = (price * ethToUsdRate).toFixed(2);
    
    previewHTML += '<div class="preview-summary">';
    previewHTML += '<h5><i class="fas fa-calculator"></i> Summary</h5>';
    previewHTML += `<div class="preview-summary-item"><span>List Price</span><span>${price} WETH ($${nftValueUsd})</span></div>`;
    previewHTML += `<div class="preview-summary-item"><span>Royalty</span><span>${royalty}%</span></div>`;
    previewHTML += `<div class="preview-summary-item"><span>Minting Fee</span><span>0.1 ETH</span></div>`;
    previewHTML += '</div>';
    
    previewHTML += '<div class="preview-note">';
    previewHTML += '<i class="fas fa-info-circle"></i>';
    previewHTML += '<p><strong>Note:</strong> This is a preview. Your NFT will be listed for sale immediately at the specified price.</p>';
    previewHTML += '</div>';
    previewHTML += '</div></div>';
    
    // Add preview styles
    addPreviewStyles();
    
    previewContent.innerHTML = previewHTML;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('previewModal');
    if (e.target === modal) {
        closeModal('previewModal');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal('previewModal');
    }
});

// Notification Functions
function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${escapeHtml(message)}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => notification.remove());
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup Event Listeners
function setupEventListeners() {
    // Add notification styles
    addNotificationStyles();
    
    // Initialize royalty slider
    updateRoyaltyDisplay();
    
    // Add change event to collection select
    const collectionSelect = document.getElementById('collectionSelect');
    if (collectionSelect) {
        collectionSelect.addEventListener('change', toggleCollectionFields);
    }
    
    // Add price calculation listeners
    const nftPriceInput = document.getElementById('nftPrice');
    if (nftPriceInput) {
        nftPriceInput.addEventListener('input', updatePriceDisplay);
    }
    
    // Add preview button listener
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            previewNFT();
        });
    }
}

// Style Functions
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            transform: translateX(120%);
            transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            border-radius: 12px;
            color: white;
            min-width: 320px;
            max-width: 400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
        
        .notification.error .notification-content {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        }
        
        .notification.success .notification-content {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        
        .notification-content i {
            font-size: 1.25rem;
        }
        
        .notification-content span {
            flex: 1;
            font-weight: 500;
        }
        
        .notification-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .notification-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }
    `;
    document.head.appendChild(style);
}

function addPreviewStyles() {
    if (document.getElementById('preview-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'preview-styles';
    style.textContent = `
        .preview-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .preview-image {
            border-radius: 12px;
            overflow: hidden;
            background: #000;
        }
        
        .preview-image img,
        .preview-image video {
            width: 100%;
            max-height: 400px;
            object-fit: contain;
            display: block;
        }
        
        .preview-details h4 {
            color: #333;
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        
        .preview-description {
            color: #666;
            line-height: 1.6;
            margin-bottom: 1rem;
        }
        
        .preview-collection {
            color: #667eea;
            font-weight: 500;
            margin-bottom: 1rem;
        }
        
        .preview-summary {
            background: #f8fafc;
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 1rem;
        }
        
        .preview-summary h5 {
            color: #333;
            margin-bottom: 1rem;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .preview-summary-item {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid #e2e8f0;
            color: #333;
        }
        
        .preview-summary-item:last-child {
            border-bottom: none;
        }
        
        .preview-summary-item span:first-child {
            color: #666;
        }
        
        .preview-summary-item span:last-child {
            color: #333;
            font-weight: 500;
        }
        
        .preview-note {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            background: #f0f9ff;
            border-radius: 10px;
            border-left: 4px solid #0ea5e9;
            margin-top: 1rem;
        }
        
        .preview-note i {
            color: #0ea5e9;
            font-size: 1.2rem;
            margin-top: 0.2rem;
        }
        
        .preview-note p {
            color: #0369a1;
            margin: 0;
            font-size: 0.9rem;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(style);
}

// Add spinner styles for loading states
function addSpinnerStyles() {
    if (document.getElementById('spinner-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'spinner-styles';
    style.textContent = `
        .loading {
            position: relative;
            opacity: 0.8;
            pointer-events: none;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
        
        .fa-spin {
            animation: fa-spin 2s linear infinite;
        }
        
        @keyframes fa-spin {
            0% {
                transform: rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize spinner styles
addSpinnerStyles();

// ============================================
// REAL BALANCE FUNCTIONS
// ============================================

// Load real user balance from backend
async function loadRealUserBalance() {
    try {
        console.log("🔄 Loading real user balance from backend...");
        
        // Get user from localStorage
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!userStr || !token) {
            console.log("❌ No user or token found");
            return 0;
        }
        
        const user = JSON.parse(userStr);
        
        // Fetch fresh user data from backend
        const response = await fetch(`http://bountiful-youth.up.railway.app/api/user/${user._id}`, {
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
            console.log("✅ Real user balance loaded:", data.user.ethBalance);
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Update balance displays
            updateBalanceDisplay(data.user.ethBalance || 0);
            
            // Check if balance is sufficient
            checkBalanceSufficiency(data.user.ethBalance || 0);
            
            return data.user.ethBalance;
        }
    } catch (error) {
        console.error("❌ Error loading real balance:", error);
        
        // Fallback to localStorage balance
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                updateBalanceDisplay(user.ethBalance || user.balance || 0);
                checkBalanceSufficiency(user.ethBalance || user.balance || 0);
            }
        } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError);
        }
    }
    return 0;
}

// Update balance display
function updateBalanceDisplay(balance) {
    const balanceElements = [
        document.getElementById('userEthBalance'),
        document.getElementById('currentBalance'),
        document.querySelector('.current-balance span:last-child')
    ];
    
    balanceElements.forEach(el => {
        if (el) {
            el.textContent = `${balance.toFixed(4)} ETH`;
        }
    });
    
    console.log("💰 Balance display updated:", balance);
}

// Check balance sufficiency
function checkBalanceSufficiency(balance) {
    const requiredBalance = 0.1;
    const statusElement = document.getElementById('balanceStatus');
    const insufficientElement = document.getElementById('insufficientBalance');
    
    if (!statusElement || !insufficientElement) return;
    
    if (balance >= requiredBalance) {
        statusElement.className = 'balance-status success';
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Sufficient ETH balance for minting';
        insufficientElement.style.display = 'none';
        isBalanceSufficient = true;
    } else {
        statusElement.className = 'balance-status error';
        statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Insufficient ETH balance';
        insufficientElement.style.display = 'flex';
        isBalanceSufficient = false;
    }
    
    statusElement.style.display = 'block';
    updateCreateButton();
}

// ============================================
// FORM SUBMISSION HANDLER - UPDATED FOR UPLOAD
// ============================================

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('nftCreationForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('📝 Form submission started...');
        
        // Get button and show loading
        const createBtn = document.getElementById('createBtn');
        const originalBtnText = createBtn.innerHTML;
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating NFT...';
        
        try {
            // Get form values
            const nftName = document.getElementById('nftName').value;
            const nftDescription = document.getElementById('nftDescription').value;
            const nftPrice = document.getElementById('nftPrice').value;
            const royalty = document.getElementById('royaltyPercentage').value;
            const externalUrl = document.getElementById('nftExternalUrl').value;
            
            console.log('Form values:', {
                name: nftName,
                price: nftPrice,
                royalty: royalty,
                hasDescription: !!nftDescription,
                hasExternalUrl: !!externalUrl
            });
            
            // Validate required fields
            if (!nftName || !nftName.trim()) {
                throw new Error('NFT name is required');
            }
            
            if (!nftPrice || parseFloat(nftPrice) < 0.01) {
                throw new Error('Price must be at least 0.01 WETH');
            }
            
            if (!currentFile) {
                throw new Error('Please upload an image');
            }
            
            // Collection
            const collectionSelect = document.getElementById('collectionSelect');
            let collectionName = 'Unnamed Collection';
            
            if (collectionSelect) {
                if (collectionSelect.value === '') {
                    // Creating new collection
                    const newCollectionName = document.getElementById('collectionName').value;
                    collectionName = newCollectionName || 'My Collection';
                } else {
                    // Using existing collection
                    collectionName = collectionSelect.options[collectionSelect.selectedIndex].text;
                }
            }
            
            // Get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login to create NFTs');
            }
            
            console.log('📤 Starting NFT creation process...');
            console.log('Collection name:', collectionName);
            
            // 1. FIRST UPLOAD IMAGE (NOT base64)
            console.log('🖼️ Uploading image...');
            const uploadFormData = new FormData();
            uploadFormData.append('image', currentFile);
            
            const uploadResponse = await fetch('http://bountiful-youth.up.railway.app/api/upload/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type for FormData
                },
                body: uploadFormData
            });
            
            console.log('📥 Upload response status:', uploadResponse.status);
            
            if (!uploadResponse.ok) {
                const uploadError = await uploadResponse.text();
                throw new Error(`Image upload failed: ${uploadError}`);
            }
            
            const uploadData = await uploadResponse.json();
            
            if (!uploadData.success) {
                throw new Error(uploadData.error || 'Image upload failed');
            }
            
            console.log('✅ Image uploaded successfully:', uploadData.imageUrl);
            
            // 2. THEN MINT NFT WITH THE IMAGE URL
            const response = await fetch('http://bountiful-youth.up.railway.app/nft/mint', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: nftName,
                    collectionName: collectionName,
                    price: nftPrice,
                    category: 'art',
                    imageUrl: uploadData.imageUrl, // Use URL from upload
                    cloudinaryId: uploadData.cloudinaryId || 'upload_' + Date.now(),
                    description: nftDescription || '',
                    royalty: royalty || '5'
                })
            });
            
            console.log('📥 Mint response status:', response.status);
            
            // Try to parse response
            let data;
            try {
                const text = await response.text();
                console.log('Response text:', text);
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
                throw new Error('Invalid server response');
            }
            
            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }
            
            if (data.success) {
                // Success!
                console.log('✅ NFT minted successfully!', data.nft);
                console.log('ETH deducted! New balance:', data.newETHBalance);
                
                // Show success message with ETH deduction info
                showNotification(`🎉 NFT minted successfully!`, 'success');
                
                // Update user in localStorage with new ETH balance
                if (data.user) {
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const updatedUser = { ...currentUser, ...data.user };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
                
                // Reset form
                form.reset();
                removePreview();
                
                // Redirect to marketplace after 3 seconds
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
                
            } else {
                throw new Error(data.error || 'Failed to mint NFT');
            }
            
        } catch (error) {
            console.error('❌ NFT minting failed:', error);
            showNotification(error.message || 'Failed to mint NFT', 'error');
            
            // Re-enable button
            createBtn.disabled = false;
            createBtn.innerHTML = originalBtnText;
        }
    });
});

console.log("✅ NFT Creation script loaded successfully");