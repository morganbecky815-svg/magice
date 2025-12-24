// NFT Creation Functionality

// DOM Elements
let currentFile = null;
let attributes = [];
let isBalanceSufficient = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeNFTForm();
    checkUserBalance();
    setupEventListeners();
});

// Initialize Form
function initializeNFTForm() {
    // Set default balance
    document.getElementById('userEthBalance').textContent = '0.8500 ETH';
    document.getElementById('currentBalance').textContent = '0.8500 ETH';
    
    // Add initial attribute
    addAttribute();
    
    // Setup file upload
    setupFileUpload();
    
    // Validate form on input
    setupFormValidation();
}

// File Upload Handling
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('imageUpload');
    
    // Click to upload
    uploadArea.addEventListener('click', function(e) {
        const uploadBtn = uploadArea.querySelector('.upload-btn');
        if (e.target !== uploadBtn) {
            fileInput.click();
        }
    });
    
    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight);
    });
    
    function highlight() {
        uploadArea.classList.add('dragover');
    }
    
    function unhighlight() {
        uploadArea.classList.remove('dragover');
    }
    
    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop);
    
    function handleDrop(e) {
        const files = e.dataTransfer.files;
        handleFiles(files);
    }
    
    // Handle file input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
}

function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm'];
    if (!validTypes.some(type => file.type.includes(type.replace('image/', '').replace('video/', '')))) {
        showError('Please upload an image (JPG, PNG, GIF, SVG) or video (MP4, WebM) file');
        return;
    }
    
    if (file.size > maxSize) {
        showError('File size must be less than 50MB');
        return;
    }
    
    currentFile = file;
    displayPreview(file);
}

function displayPreview(file) {
    const uploadArea = document.getElementById('uploadArea');
    const preview = document.getElementById('imagePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
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
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        previewImage.style.display = 'none';
        previewVideo.style.display = 'block';
        
        const url = URL.createObjectURL(file);
        previewVideo.src = url;
    }
}

function removePreview() {
    const uploadArea = document.getElementById('uploadArea');
    const preview = document.getElementById('imagePreview');
    
    uploadArea.style.display = 'block';
    preview.style.display = 'none';
    currentFile = null;
    
    // Reset preview elements
    document.getElementById('previewImage').src = '';
    const video = document.getElementById('previewVideo');
    video.src = '';
    video.pause();
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
    
    if (select.value === '') {
        newFields.style.display = 'block';
    } else {
        newFields.style.display = 'none';
    }
}

// Attributes Management
function addAttribute() {
    const container = document.getElementById('attributesContainer');
    const attributeId = 'attribute-' + Date.now();
    
    const attributeDiv = document.createElement('div');
    attributeDiv.className = 'attribute-item';
    attributeDiv.id = attributeId;
    
    const traitInput = document.createElement('input');
    traitInput.type = 'text';
    traitInput.placeholder = 'Trait (e.g., Background)';
    traitInput.addEventListener('input', function() {
        updateAttribute(attributeId);
    });
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Value (e.g., Blue)';
    valueInput.addEventListener('input', function() {
        updateAttribute(attributeId);
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-attribute';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', function() {
        removeAttribute(attributeId);
    });
    
    attributeDiv.appendChild(traitInput);
    attributeDiv.appendChild(valueInput);
    attributeDiv.appendChild(removeBtn);
    container.appendChild(attributeDiv);
}

function updateAttribute(id) {
    const element = document.getElementById(id);
    if (!element) return;
    
    const traitInput = element.querySelector('input[placeholder*="Trait"]');
    const valueInput = element.querySelector('input[placeholder*="Value"]');
    
    // Find or update attribute in array
    const index = attributes.findIndex(attr => attr.id === id);
    
    if (traitInput.value.trim() && valueInput.value.trim()) {
        if (index === -1) {
            attributes.push({
                id: id,
                trait: traitInput.value.trim(),
                value: valueInput.value.trim()
            });
        } else {
            attributes[index].trait = traitInput.value.trim();
            attributes[index].value = valueInput.value.trim();
        }
    } else if (index !== -1) {
        attributes.splice(index, 1);
    }
}

function removeAttribute(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
    
    const index = attributes.findIndex(attr => attr.id === id);
    if (index !== -1) {
        attributes.splice(index, 1);
    }
}

// Royalties Slider
function updateRoyaltyDisplay() {
    const slider = document.getElementById('royaltySlider');
    const display = document.getElementById('royaltyDisplay');
    const input = document.getElementById('royaltyPercentage');
    
    const value = parseFloat(slider.value).toFixed(1);
    display.textContent = value + '%';
    input.value = value;
}

function updateRoyaltySlider() {
    const input = document.getElementById('royaltyPercentage');
    const slider = document.getElementById('royaltySlider');
    const display = document.getElementById('royaltyDisplay');
    
    let value = parseFloat(input.value);
    
    // Validate range
    if (isNaN(value)) value = 5;
    if (value < 0) value = 0;
    if (value > 20) value = 20;
    
    input.value = value.toFixed(1);
    slider.value = value;
    display.textContent = value.toFixed(1) + '%';
}

// Balance Check
function checkUserBalance() {
    // Mock balance check - in production this would connect to Web3
    const userBalance = 0.85; // ETH
    const requiredBalance = 0.1;
    
    const balanceElement = document.getElementById('userEthBalance');
    const statusElement = document.getElementById('balanceStatus');
    const insufficientElement = document.getElementById('insufficientBalance');
    
    balanceElement.textContent = userBalance.toFixed(4) + ' ETH';
    document.getElementById('currentBalance').textContent = userBalance.toFixed(4) + ' ETH';
    
    if (userBalance >= requiredBalance) {
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

// Form Validation
function setupFormValidation() {
    const form = document.getElementById('nftCreationForm');
    
    // Validate on form submit
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm()) {
            mintNFT();
        }
    });
    
    // Validate terms checkbox
    const termsCheckbox = document.getElementById('agreeTerms');
    termsCheckbox.addEventListener('change', updateCreateButton);
    
    // Validate on input for required fields
    const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('input', validateField);
        input.addEventListener('blur', validateField);
    });
}

function validateField(e) {
    const field = e.target;
    const formGroup = field.closest('.form-group');
    
    // Remove existing error
    if (formGroup) {
        formGroup.classList.remove('error');
        const existingError = formGroup.querySelector('.validation-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    // Check required fields
    if (field.hasAttribute('required') && !field.value.trim()) {
        if (formGroup) {
            formGroup.classList.add('error');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'validation-error';
            errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + (field.placeholder || 'This field') + ' is required';
            formGroup.appendChild(errorMsg);
        }
        return false;
    }
    
    // URL validation
    if (field.type === 'url' && field.value.trim()) {
        try {
            new URL(field.value.trim());
        } catch {
            if (formGroup) {
                formGroup.classList.add('error');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'validation-error';
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter a valid URL';
                formGroup.appendChild(errorMsg);
            }
            return false;
        }
    }
    
    updateCreateButton();
    return true;
}

function validateForm() {
    const form = document.getElementById('nftCreationForm');
    const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;
    
    // Check required fields
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
    const hasFile = !!currentFile;
    const termsAgreed = document.getElementById('agreeTerms').checked;
    
    // Check required fields
    const requiredFields = document.querySelectorAll('input[required], textarea[required], select[required]');
    let requiredFilled = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            requiredFilled = false;
        }
    });
    
    createBtn.disabled = !(hasFile && requiredFilled && termsAgreed && isBalanceSufficient);
}

// Preview NFT
function previewNFT() {
    if (!currentFile) {
        showError('Please upload an artwork first');
        return;
    }
    
    const modal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    
    // Gather form data
    const nftName = document.getElementById('nftName').value || 'Untitled NFT';
    const nftDescription = document.getElementById('nftDescription').value || 'No description provided';
    const royalty = document.getElementById('royaltyPercentage').value;
    
    // Build preview HTML
    let previewHTML = '<div class="preview-content">';
    previewHTML += '<div class="preview-image">';
    
    if (currentFile.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(currentFile);
        previewHTML += '<img src="' + imageUrl + '" alt="' + nftName + '">';
    } else {
        const videoUrl = URL.createObjectURL(currentFile);
        previewHTML += '<video src="' + videoUrl + '" controls></video>';
    }
    
    previewHTML += '</div>';
    previewHTML += '<div class="preview-details">';
    previewHTML += '<h4>' + nftName + '</h4>';
    previewHTML += '<p>' + nftDescription + '</p>';
    
    if (attributes.length > 0) {
        previewHTML += '<div class="preview-attributes">';
        attributes.forEach(attr => {
            previewHTML += '<div class="attribute-badge">';
            previewHTML += '<span>' + attr.trait + ':</span>';
            previewHTML += '<span>' + attr.value + '</span>';
            previewHTML += '</div>';
        });
        previewHTML += '</div>';
    }
    
    previewHTML += '<div class="preview-summary">';
    previewHTML += '<div class="preview-summary-item"><span>Minting Fee</span><span>0.1 ETH</span></div>';
    previewHTML += '<div class="preview-summary-item"><span>Royalty Percentage</span><span>' + royalty + '%</span></div>';
    previewHTML += '<div class="preview-summary-item total"><span>Total Cost</span><span>0.1 ETH</span></div>';
    previewHTML += '</div>';
    
    previewHTML += '<div class="platform-fee-info" style="margin-top: 1.5rem;">';
    previewHTML += '<i class="fas fa-info-circle"></i>';
    previewHTML += '<p><strong>Platform Fee:</strong> 15% will be deducted from your sales revenue when converting WETH to ETH.</p>';
    previewHTML += '</div>';
    previewHTML += '</div></div>';
    
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
    
    const createBtn = document.getElementById('createBtn');
    const originalHTML = createBtn.innerHTML;
    
    // Disable button and show loading
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="spinner"><i class="fas fa-spinner fa-spin"></i> Minting NFT...</span>';
    
    try {
        // Gather form data
        const nftData = {
            name: document.getElementById('nftName').value,
            description: document.getElementById('nftDescription').value,
            external_url: document.getElementById('nftExternalUrl').value || '',
            collection: document.getElementById('collectionSelect').value,
            collection_name: document.getElementById('collectionName') ? document.getElementById('collectionName').value : '',
            attributes: attributes,
            royalty: parseFloat(document.getElementById('royaltyPercentage').value),
            file: currentFile
        };
        
        console.log('NFT Data to mint:', nftData);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Success
        showSuccess('NFT successfully minted!');
        
        // Redirect to dashboard after a delay
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 2000);
        
    } catch (error) {
        console.error('Minting error:', error);
        showError('Failed to mint NFT. Please try again.');
        
        // Reset button
        createBtn.disabled = false;
        createBtn.innerHTML = originalHTML;
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
    const existing = document.getElementById('global-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'global-notification';
    notification.className = 'notification ' + type;
    
    const content = document.createElement('div');
    content.className = 'notification-content';
    
    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    
    const text = document.createElement('span');
    text.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function() {
        notification.remove();
    });
    
    content.appendChild(icon);
    content.appendChild(text);
    content.appendChild(closeBtn);
    notification.appendChild(content);
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.display = 'block';
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
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
}

function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: none;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            color: white;
            min-width: 300px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        }
        
        .notification.error .notification-content {
            background: #dc2626;
            border-left: 4px solid #b91c1c;
        }
        
        .notification.success .notification-content {
            background: #059669;
            border-left: 4px solid #047857;
        }
        
        .notification-content i {
            font-size: 1.25rem;
        }
        
        .notification-content span {
            flex: 1;
        }
        
        .notification-content button {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);
}