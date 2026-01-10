// create-nft.js
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
// NFT Creation Functionality
console.log("🚀 Initializing NFT Creation...");

// DOM Elements
let currentFile = null;
let attributes = [];
let isBalanceSufficient = false;
let ethToUsdRate = window.ETH_PRICE || localStorage.getItem // Current ETH price in USD
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
    
    // Calculate values
    const nftValueUsd = price * ethToUsdRate;
    
    // Update displays
    if (ethPriceDisplay) {
        ethPriceDisplay.textContent = `$${ethToUsdRate.toLocaleString()}`;
    }
    
    if (nftValueDisplay) {
        nftValueDisplay.textContent = `$${nftValueUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
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
    
    // Update the cost summary section (simplified)
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
    
    // Update total to show just the selling price (no earnings calculation)
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

// Balance Check - Loads real balance from backend
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
    
    // Validate on form submit
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm()) {
            mintNFT();
        }
    });
    
    // Validate terms checkbox
    const termsCheckbox = document.getElementById('agreeTerms');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', updateCreateButton);
        
        // Update terms label to remove unwanted text
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

function validateForm() {
    if (isMintingInProgress) {
        showError("Minting is already in progress. Please wait...");
        return false;
    }
    
    const form = document.getElementById('nftCreationForm');
    let isValid = true;
    
    // Check required fields
    const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    requiredInputs.forEach(input => {
        const event = { target: input };
        if (!validateField(event)) {
            isValid = false;
        }
    });
    
    // Check file upload
    if (!currentFile) {
        showError('Please upload an artwork file');
        isValid = false;
    }
    
    // Check NFT name uniqueness (simulated)
    const nftName = document.getElementById('nftName').value;
    if (nftName && nftName.length < 3) {
        showError('NFT name must be at least 3 characters long');
        isValid = false;
    }
    
    // Check price
    const price = parseFloat(document.getElementById('nftPrice').value);
    if (price < 0.01) {
        showError('Minimum price is 0.01 WETH');
        isValid = false;
    }
    
    // Check terms agreement
    if (!document.getElementById('agreeTerms').checked) {
        showError('You must agree to the terms and conditions');
        isValid = false;
    }
    
    // Check balance
    if (!isBalanceSufficient) {
        showError('Insufficient ETH balance to mint NFT');
        isValid = false;
    }
    
    return isValid;
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

// Mint NFT Function
async function mintNFT() {
    if (!validateForm()) return;
    
    if (isMintingInProgress) {
        showError("Minting is already in progress. Please wait...");
        return;
    }
    
    isMintingInProgress = true;
    
    const createBtn = document.getElementById('createBtn');
    const originalHTML = createBtn.innerHTML;
    
    // Disable button and show loading
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Minting NFT...';
    
    // Show minting modal
    showMintingModal();
    
    try {
        // Gather form data
        const nftData = {
            name: document.getElementById('nftName').value,
            description: document.getElementById('nftDescription').value,
            external_url: document.getElementById('nftExternalUrl').value || '',
            price: parseFloat(document.getElementById('nftPrice').value),
            royalty: parseFloat(document.getElementById('royaltyPercentage').value),
            collection: document.getElementById('collectionSelect').value,
            collection_name: document.getElementById('collectionSelect').value === '' 
                ? document.getElementById('collectionName').value 
                : document.getElementById('collectionSelect').options[document.getElementById('collectionSelect').selectedIndex].text,
            file: currentFile,
            timestamp: new Date().toISOString(),
            creator: AuthManager.getCurrentUser()?.username || 'Anonymous'
        };
        
        console.log('📦 NFT Data to mint:', nftData);
        
        // Simulate API call with progress updates
        await simulateMintingProcess();
        
        // Save NFT to localStorage (simulating database)
        saveNFTToStorage(nftData);
        
        // Update user balance (deduct minting fee)
        updateUserBalance(0.1);
        
        // Success
        showSuccess('🎉 NFT successfully minted and listed!');
        
        // Hide minting modal
        hideMintingModal();
        
        // Redirect to dashboard after a delay
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Minting error:', error);
        showError('Failed to mint NFT. Please try again.');
        
        // Hide minting modal
        hideMintingModal();
        
        // Reset button
        createBtn.disabled = false;
        createBtn.innerHTML = originalHTML;
        
    } finally {
        isMintingInProgress = false;
        updateCreateButton();
    }
}

async function simulateMintingProcess() {
    const steps = [
        { text: "Preparing artwork...", duration: 1000 },
        { text: "Uploading to IPFS...", duration: 1500 },
        { text: "Creating metadata...", duration: 800 },
        { text: "Initializing smart contract...", duration: 1200 },
        { text: "Confirming transaction...", duration: 2000 },
        { text: "Listing on marketplace...", duration: 1000 }
    ];
    
    for (let i = 0; i < steps.length; i++) {
        updateMintingProgress(i + 1, steps.length, steps[i].text);
        await new Promise(resolve => setTimeout(resolve, steps[i].duration));
    }
}

function updateMintingProgress(current, total, text) {
    const progressBar = document.getElementById('mintingProgress');
    const progressText = document.getElementById('mintingProgressText');
    const progressPercent = Math.round((current / total) * 100);
    
    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
        progressBar.textContent = `${progressPercent}%`;
    }
    
    if (progressText) {
        progressText.textContent = text;
    }
}

function showMintingModal() {
    const modalHTML = `
        <div id="mintingModal" class="modal">
            <div class="modal-content minting-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-spinner fa-spin"></i> Minting NFT</h3>
                </div>
                <div class="modal-body">
                    <p>Please wait while we create your NFT on the blockchain...</p>
                    
                    <div class="minting-progress">
                        <div class="progress-bar">
                            <div id="mintingProgress" class="progress-fill" style="width: 0%">0%</div>
                        </div>
                        <div id="mintingProgressText" class="progress-text">Initializing...</div>
                    </div>
                    
                    <div class="minting-note">
                        <i class="fas fa-info-circle"></i>
                        <p>Do not close this window while minting is in progress. Transaction may take a few minutes.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add minting modal styles
    addMintingModalStyles();
    
    // Insert modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('mintingModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideMintingModal() {
    const modal = document.getElementById('mintingModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

function saveNFTToStorage(nftData) {
    try {
        // Get existing NFTs or initialize array
        const existingNFTs = JSON.parse(localStorage.getItem('userNFTs') || '[]');
        
        // Create NFT object
        const nft = {
            id: 'nft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            ...nftData,
            created_at: new Date().toISOString(),
            status: 'listed',
            views: 0,
            likes: 0,
            file_size: nftData.file.size,
            file_type: nftData.file.type
        };
        
        // Remove file from data (can't store in localStorage)
        delete nft.file;
        
        // Add to array
        existingNFTs.push(nft);
        
        // Save back to localStorage
        localStorage.setItem('userNFTs', JSON.stringify(existingNFTs));
        
        console.log('💾 NFT saved to storage:', nft.id);
        
    } catch (error) {
        console.error('❌ Error saving NFT to storage:', error);
        throw error;
    }
}

function updateUserBalance(amount) {
    try {
        const user = AuthManager.getCurrentUser();
        if (user) {
            user.balance = Math.max(0, (user.balance || 0) - amount);
            AuthManager.saveUser(user);
            console.log(`💰 Updated user balance: ${user.balance.toFixed(4)} ETH`);
        }
    } catch (error) {
        console.error('❌ Error updating user balance:', error);
    }
}

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
    
    // Clean up HTML on page load
    cleanUpHTML();
}

function cleanUpHTML() {
    // Remove platform fee text from minting config
    const feeNote = document.querySelector('.fee-note');
    if (feeNote) {
        feeNote.innerHTML = `
            <i class="fas fa-handshake"></i>
            <div>
                <p><strong>Fee Structure:</strong></p>
                <ul>
                    <li><strong>Minting Fee:</strong> 0.1 ETH per NFT (paid now)</li>
                    <li><strong>Royalties:</strong> You earn ${document.getElementById('royaltyPercentage').value || '5'}% on all secondary sales</li>
                </ul>
            </div>
        `;
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
        }
        
        .preview-summary-item:last-child {
            border-bottom: none;
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

function addMintingModalStyles() {
    if (document.getElementById('minting-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'minting-styles';
    style.textContent = `
        .minting-modal {
            max-width: 500px;
            background: white;
            border-radius: 20px;
            overflow: hidden;
        }
        
        .minting-modal .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem 2rem;
            text-align: center;
        }
        
        .minting-modal .modal-header h3 {
            margin: 0;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.8rem;
        }
        
        .minting-modal .modal-body {
            padding: 2rem;
            text-align: center;
        }
        
        .minting-modal .modal-body p {
            color: #666;
            margin-bottom: 2rem;
            font-size: 1.1rem;
        }
        
        .minting-progress {
            margin: 2rem 0;
        }
        
        .progress-bar {
            height: 12px;
            background: #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 1rem;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 6px;
            transition: width 0.5s ease;
            color: white;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
        }
        
        .progress-text {
            color: #667eea;
            font-weight: 500;
            font-size: 0.9rem;
            margin-top: 0.5rem;
        }
        
        .minting-note {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            background: #fef3c7;
            border-radius: 10px;
            border-left: 4px solid #f59e0b;
            margin-top: 2rem;
            text-align: left;
        }
        
        .minting-note i {
            color: #f59e0b;
            font-size: 1.2rem;
            margin-top: 0.2rem;
        }
        
        .minting-note p {
            color: #92400e;
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
// ADDED: Real balance functions
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

console.log("✅ NFT Creation script loaded successfully");