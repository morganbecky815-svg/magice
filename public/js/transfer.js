// transfer.js - Complete Transfer & Withdrawal with Admin Approval Flow
// Magic Eden - Transfer Page

console.log('🚀 Transfer.js loaded successfully');

// Global data store - No hardcoded data!
let transferData = {
    balances: {
        eth: 0,
        weth: 0,
        usd: 0
    },
    transactions: [],
    savedBanks: [],
    recentContacts: [],
    ethPrice: 2500
};

// ========== NEW: Verification Helper Functions ==========
function getUserFromStorage() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        return null;
    }
}

function isUserVerified() {
    const user = getUserFromStorage();
    return user?.isVerified === true;
}

function getVerificationBadge() {
    const user = getUserFromStorage();
    if (!user?.isVerified) return null;
    
    const badge = user.verificationBadge || 'basic';
    const badges = {
        basic: { icon: '✓', color: '#10b981', name: 'Verified' },
        premium: { icon: '⭐', color: '#8a2be2', name: 'Premium' },
        business: { icon: '💼', color: '#3b82f6', name: 'Business' }
    };
    return badges[badge] || badges.basic;
}

function showVerificationBadgeInUI() {
    // Add badge to header if it exists
    const badgeContainer = document.getElementById('verificationBadge');
    if (!badgeContainer) return;
    
    const user = getUserFromStorage();
    if (user?.isVerified) {
        const badge = getVerificationBadge();
        badgeContainer.innerHTML = `
            <span class="verification-badge" style="
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: ${badge.color}20;
                color: ${badge.color};
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                margin-left: 10px;
            ">
                <i class="fas fa-check-circle" style="color: ${badge.color};"></i>
                ${badge.icon} ${badge.name}
            </span>
        `;
    } else {
        badgeContainer.innerHTML = `
            <span class="verification-badge pending" style="
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: #f59e0b20;
                color: #f59e0b;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                margin-left: 10px;
            ">
                <i class="fas fa-clock"></i>
                Pending Verification
            </span>
        `;
    }
}

function checkVerificationAndNotify(action = 'perform this action') {
    if (!isUserVerified()) {
        showCustomNotification(
            '⏳ Account Pending Verification',
            `Your account is pending verification. Please contact support to verify your account before you can ${action}.`,
            'pending'
        );
        return false;
    }
    return true;
}
// ========== END NEW ==========

// Main initialization
async function initializeTransferPage() {
    console.log('🔄 Initializing transfer page...');
    
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    if (!token) {
        console.warn('⚠️ No authentication found, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    setupTabs();
    setupEventListeners();
    await fetchUserFromBackend();
    loadSavedBanks();
    await loadTransactionHistory();
    loadRecentContacts();
    
    // ========== NEW: Show verification badge ==========
    showVerificationBadgeInUI();
    // ========== END NEW ==========
    
    console.log('✅ Transfer page initialized successfully');
}

// Fetch fresh user data from backend
async function fetchUserFromBackend() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) return null;
        
        console.log('📡 Fetching fresh user data for transfer page...');
        
        let response = await fetch('/api/user/me/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 404) {
            response = await fetch('/api/users/me/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch user');
        
        console.log('✅ Real balances loaded:', {
            eth: result.user.internalBalance,
            weth: result.user.wethBalance
        });

        transferData.balances.eth = parseFloat(result.user.internalBalance || 0);
        transferData.balances.weth = parseFloat(result.user.wethBalance || 0);
        
        // ========== UPDATED: Save user with verification fields ==========
        localStorage.setItem('user', JSON.stringify(result.user));
        
        const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
        updateBalanceDisplay(ethPrice);
        
        // ========== NEW: Update verification badge ==========
        showVerificationBadgeInUI();
        // ========== END NEW ==========
        
        return result.user;
        
    } catch (error) {
        console.error('❌ Failed to fetch user data:', error);
        return null;
    }
}

// Update balance display
function updateBalanceDisplay(ethPrice) {
    console.log('💰 Updating balance display...');
    
    const ethBalanceEl = document.getElementById('transferEthBalance');
    const ethValueEl = document.getElementById('transferEthValue');
    
    if (ethBalanceEl && ethValueEl) {
        ethBalanceEl.textContent = transferData.balances.eth.toFixed(4) + ' ETH';
        ethValueEl.textContent = '$' + (transferData.balances.eth * ethPrice).toFixed(2);
    }
    
    const wethBalanceEl = document.getElementById('transferWethBalance');
    const wethValueEl = document.getElementById('transferWethValue');
    
    if (wethBalanceEl && wethValueEl) {
        wethBalanceEl.textContent = transferData.balances.weth.toFixed(4) + ' WETH';
        wethValueEl.textContent = '$' + (transferData.balances.weth * ethPrice).toFixed(2);
    }
    
    updateAvailableBalance();
    
    const totalUsd = (transferData.balances.eth + transferData.balances.weth) * ethPrice;
    const withdrawBalanceEl = document.getElementById('withdrawAvailableBalance');
    if (withdrawBalanceEl) {
        withdrawBalanceEl.textContent = '$' + totalUsd.toFixed(2);
    }
    
    updateWithdrawalSummary();
}

// ============================================
// DYNAMIC RECENT CONTACTS
// ============================================

function loadRecentContacts() {
    try {
        const storedContacts = localStorage.getItem('recentContacts');
        if (storedContacts) {
            transferData.recentContacts = JSON.parse(storedContacts);
        } else {
            transferData.recentContacts = []; 
        }
        renderRecentContacts();
    } catch (error) {
        console.error('Error loading recent contacts:', error);
        transferData.recentContacts = [];
        renderRecentContacts();
    }
}

function renderRecentContacts() {
    const contactsContainer = document.getElementById('recentContacts');
    if (!contactsContainer) return;

    if (transferData.recentContacts.length === 0) {
        contactsContainer.innerHTML = '<p style="color: #888; font-size: 0.9rem; padding: 10px;">No recent contacts yet. Your saved addresses will appear here.</p>';
        return;
    }

    contactsContainer.innerHTML = transferData.recentContacts.map(contact => {
        const shortAddress = contact.address.substring(0, 6) + '...' + contact.address.substring(contact.address.length - 4);
        return `
            <div class="contact-item" onclick="fillContact('${contact.address}')">
                <div class="contact-avatar">
                    <i class="fas ${contact.icon || 'fa-user'}"></i>
                </div>
                <div class="contact-info">
                    <span class="contact-name">${contact.name}</span>
                    <span class="contact-address">${shortAddress}</span>
                </div>
            </div>
        `;
    }).join('');
}

function saveToRecentContacts(address) {
    const exists = transferData.recentContacts.find(c => c.address.toLowerCase() === address.toLowerCase());
    
    if (!exists) {
        transferData.recentContacts.unshift({
            name: 'External Wallet',
            address: address,
            icon: 'fa-wallet'
        });
        
        if (transferData.recentContacts.length > 5) {
            transferData.recentContacts.pop();
        }
        
        localStorage.setItem('recentContacts', JSON.stringify(transferData.recentContacts));
        renderRecentContacts();
    }
}

// ============================================
// UI & EVENT SETUP
// ============================================

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabContents.forEach(content => { content.style.display = 'none'; });
    if (tabContents.length > 0) { tabContents[0].style.display = 'block'; }
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabId = this.getAttribute('data-tab');
            tabButtons.forEach(btn => { btn.classList.remove('active'); });
            this.classList.add('active');
            
            tabContents.forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(tabId + '-tab');
            if (targetContent) {
                targetContent.style.display = 'block';
                targetContent.classList.add('active');
                if (tabId === 'history') loadTransactionHistory();
            }
        });
    });
}

function setupEventListeners() {
    const transferCurrency = document.getElementById('transferCurrency');
    if (transferCurrency) {
        transferCurrency.addEventListener('change', function() {
            updateTransferForm();
            updateAvailableBalance();
        });
    }
    
    const transferAmount = document.getElementById('transferAmount');
    if (transferAmount) transferAmount.addEventListener('input', updateTransferSummary);
    
    const recipientAddress = document.getElementById('recipientAddress');
    if (recipientAddress) recipientAddress.addEventListener('input', validateAddress);
    
    const withdrawAmount = document.getElementById('withdrawAmount');
    if (withdrawAmount) withdrawAmount.addEventListener('input', updateWithdrawalSummary);
    
    const withdrawMethods = document.querySelectorAll('input[name="withdrawMethod"]');
    withdrawMethods.forEach(method => {
        method.addEventListener('change', updateWithdrawalSummary);
    });
    
    const accountTypeSelect = document.getElementById('accountType');
    if (accountTypeSelect) accountTypeSelect.addEventListener('change', toggleAccountFields);
    
    const saveBankCheckbox = document.getElementById('saveBankDetails');
    if (saveBankCheckbox) saveBankCheckbox.addEventListener('change', toggleSaveBank);
    
    const savedBankSelect = document.getElementById('savedBankSelect');
    if (savedBankSelect) savedBankSelect.addEventListener('change', fillSavedBankDetails);
    
    const historyTypeFilter = document.getElementById('historyTypeFilter');
    if (historyTypeFilter) historyTypeFilter.addEventListener('change', loadTransactionHistory);
    
    const historyCurrencyFilter = document.getElementById('historyCurrencyFilter');
    if (historyCurrencyFilter) historyCurrencyFilter.addEventListener('change', loadTransactionHistory);
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
    });
}

// ============================================
// BANK & WITHDRAWAL LOGIC
// ============================================

function loadSavedBanks() {
    try {
        const savedBanks = localStorage.getItem('savedBanks');
        if (savedBanks) {
            transferData.savedBanks = JSON.parse(savedBanks);
            updateSavedBanksDropdown();
        }
    } catch (error) {
        transferData.savedBanks = [];
    }
    if (transferData.savedBanks.length === 0) showNewBankForm();
}

function updateSavedBanksDropdown() {
    const savedBankSelect = document.getElementById('savedBankSelect');
    if (!savedBankSelect) return;
    
    savedBankSelect.innerHTML = '<option value="">Select a saved bank</option>';
    transferData.savedBanks.forEach(function(bank, index) {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = bank.bankName + ' - ****' + bank.accountNumber.slice(-4);
        savedBankSelect.appendChild(option);
    });
    
    const newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.textContent = '+ Add New Bank Account';
    savedBankSelect.appendChild(newOption);
}

function showNewBankForm() {
    const bankDetailsSection = document.getElementById('bankDetailsSection');
    const newBankSection = document.getElementById('newBankSection');
    if (bankDetailsSection) bankDetailsSection.style.display = 'none';
    if (newBankSection) newBankSection.style.display = 'block';
    
    const fields = ['bankName', 'accountHolderName', 'accountNumber'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const accountType = document.getElementById('accountType');
    if (accountType) accountType.value = 'checking';
    
    const saveBankDetails = document.getElementById('saveBankDetails');
    if (saveBankDetails) saveBankDetails.checked = true;
    
    toggleAccountFields();
}

function showSavedBankDetails() {
    const bankDetailsSection = document.getElementById('bankDetailsSection');
    const newBankSection = document.getElementById('newBankSection');
    if (bankDetailsSection) bankDetailsSection.style.display = 'block';
    if (newBankSection) newBankSection.style.display = 'none';
}

function fillSavedBankDetails() {
    const savedBankSelect = document.getElementById('savedBankSelect');
    const selectedIndex = savedBankSelect ? savedBankSelect.value : null;
    if (!selectedIndex || selectedIndex === 'new') return;
    
    const bank = transferData.savedBanks[selectedIndex];
    if (!bank) return;
    
    const selectedBankName = document.getElementById('selectedBankName');
    const selectedAccountHolder = document.getElementById('selectedAccountHolder');
    const selectedAccountNumber = document.getElementById('selectedAccountNumber');
    const selectedAccountType = document.getElementById('selectedAccountType');
    
    if (selectedBankName) selectedBankName.textContent = bank.bankName;
    if (selectedAccountHolder) selectedAccountHolder.textContent = bank.accountHolderName;
    if (selectedAccountNumber) selectedAccountNumber.textContent = '****' + bank.accountNumber.slice(-4);
    if (selectedAccountType) selectedAccountType.textContent = bank.accountType.charAt(0).toUpperCase() + bank.accountType.slice(1);
}

function toggleAccountFields() {
    const accountType = document.getElementById('accountType');
    const swiftCodeGroup = document.getElementById('swiftCodeGroup');
    const routingNumberGroup = document.getElementById('routingNumberGroup');
    if (!accountType || !swiftCodeGroup || !routingNumberGroup) return;
    
    if (accountType.value === 'international') {
        swiftCodeGroup.style.display = 'block';
        routingNumberGroup.style.display = 'none';
    } else {
        swiftCodeGroup.style.display = 'none';
        routingNumberGroup.style.display = 'block';
    }
}

function toggleSaveBank() {
    const saveBankCheckbox = document.getElementById('saveBankDetails');
    const bankNicknameGroup = document.getElementById('bankNicknameGroup');
    if (bankNicknameGroup && saveBankCheckbox) {
        bankNicknameGroup.style.display = saveBankCheckbox.checked ? 'block' : 'none';
    }
}

function validateBankForm() {
    const accountType = document.getElementById('accountType');
    const bankName = document.getElementById('bankName');
    const accountHolder = document.getElementById('accountHolderName');
    const accountNumber = document.getElementById('accountNumber');
    const routingNumber = document.getElementById('routingNumber');
    const swiftCode = document.getElementById('swiftCode');
    
    if (!accountType || !bankName || !accountHolder || !accountNumber) return false;
    
    if (!bankName.value.trim() || bankName.value.trim().length < 2) { alert('Please enter a valid bank name'); return false; }
    if (!accountHolder.value.trim() || accountHolder.value.trim().length < 2) { alert('Please enter account holder name'); return false; }
    if (!accountNumber.value.trim() || accountNumber.value.trim().length < 8) { alert('Please enter a valid account number'); return false; }
    
    if (accountType.value === 'international') {
        if (!swiftCode || !swiftCode.value.trim() || swiftCode.value.trim().length < 8) {
            alert('Please enter a valid SWIFT/BIC code'); return false;
        }
    } else {
        if (!routingNumber || !routingNumber.value.trim() || routingNumber.value.trim().length !== 9) {
            alert('Please enter a valid 9-digit routing number'); return false;
        }
    }
    return true;
}

function saveBankDetails() {
    if (!validateBankForm()) return null;
    
    const bankName = document.getElementById('bankName');
    const accountHolder = document.getElementById('accountHolderName');
    const accountNumber = document.getElementById('accountNumber');
    const accountType = document.getElementById('accountType');
    const routingNumber = document.getElementById('routingNumber');
    const swiftCode = document.getElementById('swiftCode');
    const saveBankDetailsCheckbox = document.getElementById('saveBankDetails');
    const bankNickname = document.getElementById('bankNickname');
    
    const newBank = {
        id: Date.now(),
        bankName: bankName.value.trim(),
        nickname: bankNickname && bankNickname.value.trim() ? bankNickname.value.trim() : bankName.value.trim(),
        accountHolderName: accountHolder.value.trim(),
        accountNumber: accountNumber.value.trim(),
        accountType: accountType.value,
        routingNumber: routingNumber ? routingNumber.value.trim() : '',
        swiftCode: swiftCode ? swiftCode.value.trim() : '',
        isDefault: transferData.savedBanks.length === 0,
        createdAt: new Date().toISOString()
    };
    
    if (saveBankDetailsCheckbox && saveBankDetailsCheckbox.checked) {
        transferData.savedBanks.unshift(newBank);
        localStorage.setItem('savedBanks', JSON.stringify(transferData.savedBanks));
        updateSavedBanksDropdown();
        
        const savedBankSelect = document.getElementById('savedBankSelect');
        if (savedBankSelect) {
            savedBankSelect.value = '0';
            fillSavedBankDetails();
            showSavedBankDetails();
        }
        alert('✅ Bank account saved successfully!');
    }
    return newBank;
}

function updateWithdrawalSummary() {
    const withdrawAmount = document.getElementById('withdrawAmount');
    if (!withdrawAmount) return;
    
    const amount = parseFloat(withdrawAmount.value) || 0;
    let method = 'standard';
    document.querySelectorAll('input[name="withdrawMethod"]').forEach(r => { if (r.checked) method = r.value; });
    
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    const cryptoAmount = amount / ethPrice;
    let fee = method === 'instant' ? amount * 0.015 : 0;
    const receiveAmount = amount - fee;
    
    const els = {
        cryptoAmount: document.getElementById('withdrawCryptoAmount'),
        amount: document.getElementById('withdrawalAmount'),
        fee: document.getElementById('withdrawalFee'),
        receive: document.getElementById('withdrawalReceive')
    };
    
    if (els.cryptoAmount) els.cryptoAmount.textContent = cryptoAmount.toFixed(4) + ' ETH';
    if (els.amount) els.amount.textContent = '$' + amount.toFixed(2);
    if (els.fee) els.fee.textContent = '$' + fee.toFixed(2);
    if (els.receive) els.receive.textContent = '$' + receiveAmount.toFixed(2);
}

// ========== UPDATED: REVIEW WITHDRAWAL with verification check ==========
function reviewWithdrawal() {
    console.log('🔍 reviewWithdrawal called');
    
    // ========== NEW: Check verification first ==========
    if (!checkVerificationAndNotify('make withdrawals')) {
        return;
    }
    // ========== END NEW ==========
    
    const withdrawAmount = document.getElementById('withdrawAmount');
    if (!withdrawAmount) return;
    const amount = parseFloat(withdrawAmount.value) || 0;
    
    if (amount < 10) { 
        alert('Minimum withdrawal amount is $10'); 
        return; 
    }
    
    let method = 'standard';
    document.querySelectorAll('input[name="withdrawMethod"]').forEach(r => { if (r.checked) method = r.value; });
    
    const savedBankSelect = document.getElementById('savedBankSelect');
    let bankDetails = null;
    
    if (savedBankSelect && savedBankSelect.value && savedBankSelect.value !== 'new') {
        bankDetails = transferData.savedBanks[savedBankSelect.value];
        console.log('Using saved bank:', bankDetails);
    } else {
        if (!validateBankForm()) { 
            alert('Please enter valid bank details'); 
            return; 
        }
        bankDetails = saveBankDetails();
        if (!bankDetails) return;
        console.log('Created new bank:', bankDetails);
    }
    
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    const cryptoAmount = amount / ethPrice;
    const fee = method === 'instant' ? amount * 0.015 : 0;
    const receiveAmount = amount - fee;
    
    const modal = document.getElementById('withdrawalModal');
    const modalBody = document.getElementById('withdrawalModalBody');
    const confirmBtn = document.getElementById('confirmWithdrawalBtn');
    
    if (!modal || !modalBody || !confirmBtn) {
        console.error('Modal elements not found!');
        return;
    }
    
    // Clear any existing onclick handlers
    confirmBtn.onclick = null;
    
    // ========== UPDATED: Only show pending message if not verified ==========
    const user = getUserFromStorage();
    const pendingMessage = !user?.isVerified ? `
        <!-- Pending activation message for unverified users -->
        <div class="info-note" style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); border-radius: 12px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: #f59e0b20; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-clock" style="color: #f59e0b; font-size: 24px;"></i>
                </div>
                <div style="flex: 1;">
                    <h4 style="color: #f59e0b; margin: 0 0 5px 0; font-size: 16px;">⏳ Account Pending Verification</h4>
                    <p style="color: #e0e0e0; margin: 0; font-size: 14px; line-height: 1.5;">
                        Your account is pending verification. 
                        <strong style="color: #f59e0b; display: block; margin-top: 8px;">
                            <i class="fas fa-headset"></i> Contact support to verify your account
                        </strong>
                    </p>
                </div>
            </div>
        </div>
    ` : '';
    // ========== END UPDATED ==========
    
    modalBody.innerHTML = `
        <div class="withdrawal-review">
            <div class="review-icon"><i class="fas fa-university"></i></div>
            <h4>Withdrawal Details</h4>
            <div class="review-details">
                <div class="detail-row"><span>Amount</span><strong>$${amount.toFixed(2)}</strong></div>
                <div class="detail-row"><span>Equivalent</span><strong>${cryptoAmount.toFixed(4)} ETH</strong></div>
                <div class="detail-row"><span>Method</span><strong>${method === 'instant' ? 'Instant (1.5% fee)' : 'Standard'}</strong></div>
                <div class="detail-row"><span>Fee</span><strong>$${fee.toFixed(2)}</strong></div>
                <div class="detail-row total"><span>You Receive</span><strong>$${receiveAmount.toFixed(2)}</strong></div>
                <div class="detail-row"><span>Bank</span><strong>${bankDetails.bankName}</strong></div>
                <div class="detail-row"><span>Account</span><strong>****${bankDetails.accountNumber.slice(-4)}</strong></div>
            </div>
            
            ${pendingMessage}
        </div>
    `;
    
    // Set the onclick handler
    confirmBtn.onclick = function() { 
        console.log('Confirm button clicked, executing withdrawal...');
        executeWithdrawal(amount, method, cryptoAmount, bankDetails); 
    };
    
    console.log('✅ Withdrawal modal ready, confirm button handler attached');
    modal.style.display = 'flex';
}

// ========== UPDATED: EXECUTE WITHDRAWAL with verification check ==========
function executeWithdrawal(amount, method, cryptoAmount, bankDetails) {
    console.log('💰 executeWithdrawal called with:', { amount, method, cryptoAmount, bankDetails });
    
    // ========== NEW: Double-check verification ==========
    if (!isUserVerified()) {
        showCustomNotification(
            '⏳ Account Pending Verification',
            'Your account is pending verification. Please contact support to verify your account before making withdrawals.',
            'pending'
        );
        closeWithdrawalModal();
        return;
    }
    // ========== END NEW ==========
    
    const confirmBtn = document.getElementById('confirmWithdrawalBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
    }
    
    if (cryptoAmount > transferData.balances.eth) {
        alert('Insufficient ETH balance for withdrawal');
        closeWithdrawalModal();
        return;
    }
    
    setTimeout(async function() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            
            if (!token) {
                alert('Please login first');
                window.location.href = '/login';
                return;
            }
            
            // Format bank details for backend
            const withdrawalData = {
                amount: cryptoAmount,
                usdAmount: amount,
                bankDetails: {
                    bankName: bankDetails.bankName,
                    accountHolderName: bankDetails.accountHolderName,
                    accountNumber: bankDetails.accountNumber,
                    accountType: bankDetails.accountType,
                    routingNumber: bankDetails.routingNumber || '',
                    swiftCode: bankDetails.swiftCode || ''
                }
            };
            
            console.log('📤 Sending withdrawal request to /api/withdraw/request:', withdrawalData);
            
            const response = await fetch('/api/withdraw/request', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(withdrawalData)
            });
            
            console.log('📥 Response status:', response.status);
            
            let data;
            try {
                data = await response.json();
                console.log('📥 Withdrawal response:', data);
            } catch (e) {
                console.error('Failed to parse response:', e);
                alert('Server returned an invalid response');
                closeWithdrawalModal();
                return;
            }
            
            if (data.success) {
                closeWithdrawalModal();
                
                // Add to local transactions with PENDING status
                transferData.transactions.unshift({
                    id: data.withdrawal?.id || Date.now(),
                    type: 'withdrawal',
                    amount: cryptoAmount,
                    usdAmount: amount,
                    currency: 'ETH',
                    status: 'pending',
                    note: `Withdrawal request to ${bankDetails.bankName}`,
                    recipient: 'Bank Withdrawal',
                    createdAt: new Date().toISOString(),
                    bankDetails: {
                        bankName: bankDetails.bankName,
                        lastFour: bankDetails.accountNumber.slice(-4)
                    }
                });
                
                // Update the display
                updateTransactionHistoryDisplay();
                
                // Show appropriate message based on verification status
                const user = getUserFromStorage();
                if (user?.isVerified) {
                    showCustomNotification(
                        '✅ Withdrawal Request Submitted',
                        'Your withdrawal request has been submitted and is pending admin approval.',
                        'success'
                    );
                } else {
                    showCustomNotification(
                        '⏳ Withdrawal Pending Verification',
                        'Your withdrawal request has been submitted. Your account is pending verification. Please contact support for assistance.',
                        'pending'
                    );
                }
                
                // Clear the form
                document.getElementById('withdrawAmount').value = '';
                
                // Refresh transaction history from backend
                await loadTransactionHistory();
                
            } else {
                alert('❌ Error: ' + (data.error || 'Failed to submit withdrawal'));
                if (confirmBtn) {
                    confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Withdrawal';
                    confirmBtn.disabled = false;
                }
            }
            
        } catch(e) {
            console.error('Withdrawal error:', e);
            alert('Error processing withdrawal. Please try again.');
            closeWithdrawalModal();
        } finally {
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Withdrawal';
                confirmBtn.disabled = false;
            }
        }
    }, 1500);
}

// ============================================
// TRANSFER LOGIC
// ============================================

function updateAvailableBalance() {
    const currency = document.getElementById('transferCurrency');
    let availableBalance = 0;
    if (!currency) return;
    
    switch(currency.value) {
        case 'eth': availableBalance = transferData.balances.eth; break;
        case 'weth': availableBalance = transferData.balances.weth; break;
    }
    
    const availableBalanceEl = document.getElementById('transferAvailableBalance');
    if (availableBalanceEl) {
        availableBalanceEl.textContent = availableBalance.toFixed(4) + ' ' + currency.value.toUpperCase();
    }
}

function updateTransferForm() {
    const currency = document.getElementById('transferCurrency');
    const currencyDisplay = document.getElementById('transferCurrencyDisplay');
    if (currencyDisplay && currency) {
        currencyDisplay.textContent = currency.value.toUpperCase();
    }
    updateTransferSummary();
}

function updateTransferSummary() {
    const amountInput = document.getElementById('transferAmount');
    const currency = document.getElementById('transferCurrency');
    if (!amountInput || !currency) return;
    
    const amount = parseFloat(amountInput.value) || 0;
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    
    const usdValue = amount * ethPrice;
    const usdValueEl = document.getElementById('transferUsdValue');
    if (usdValueEl) usdValueEl.textContent = '$' + usdValue.toFixed(2);
    
    const gasFeeEth = currency.value === 'weth' ? 0.0015 : 0.0012;
    const gasFeeUsd = gasFeeEth * ethPrice;
    
    const gasFeeEl = document.getElementById('gasFee');
    if (gasFeeEl) gasFeeEl.textContent = gasFeeEth.toFixed(4) + ' ETH ($' + gasFeeUsd.toFixed(2) + ')';
    
    const sendAmountEl = document.getElementById('sendAmount');
    const networkFeeEl = document.getElementById('networkFee');
    const totalAmountEl = document.getElementById('totalAmount');
    
    if (sendAmountEl) sendAmountEl.textContent = amount.toFixed(4) + ' ' + currency.value.toUpperCase();
    if (networkFeeEl) networkFeeEl.textContent = gasFeeEth.toFixed(4) + ' ETH';
    if (totalAmountEl) {
        const totalEth = currency.value === 'eth' ? amount + gasFeeEth : gasFeeEth;
        totalAmountEl.textContent = totalEth.toFixed(4) + ' ETH';
    }
}

function validateAddress() {
    const addressInput = document.getElementById('recipientAddress');
    const validationEl = document.getElementById('addressValidation');
    if (!addressInput || !validationEl) return false;
    
    const address = addressInput.value;
    if (!address) {
        validationEl.textContent = '';
        validationEl.className = 'address-validation';
        return false;
    }
    
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (ethAddressRegex.test(address)) {
        validationEl.textContent = '✓ Valid Ethereum address';
        validationEl.className = 'address-validation valid';
        return true;
    } else {
        validationEl.textContent = '✗ Invalid Ethereum address';
        validationEl.className = 'address-validation invalid';
        return false;
    }
}

function setMaxTransfer() {
    const currency = document.getElementById('transferCurrency');
    const transferAmount = document.getElementById('transferAmount');
    if (!currency || !transferAmount) return;
    
    let maxAmount = currency.value === 'eth' ? transferData.balances.eth : transferData.balances.weth;
    let maxTransfer = maxAmount;
    
    if (currency.value === 'eth') {
        maxTransfer = Math.max(0, maxAmount - 0.0012);
    }
    
    transferAmount.value = maxTransfer.toFixed(4);
    updateTransferSummary();
}

function pasteAddress() {
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function(text) {
            const addressInput = document.getElementById('recipientAddress');
            if (addressInput) {
                addressInput.value = text;
                validateAddress();
            }
        }).catch(function() {
            alert('Unable to read clipboard. Please paste manually.');
        });
    } else {
        alert('Clipboard access not supported. Please paste manually.');
    }
}

function fillContact(address) {
    const addressInput = document.getElementById('recipientAddress');
    if (addressInput) {
        addressInput.value = address;
        validateAddress();
    }
}

// ========== UPDATED: validateTransferForm with verification check ==========
function validateTransferForm() {
    // ========== NEW: Check verification first ==========
    if (!isUserVerified()) {
        showCustomNotification(
            '⏳ Account Pending Verification',
            'Your account is pending verification. Please contact support to verify your account before making transfers.',
            'pending'
        );
        return false;
    }
    // ========== END NEW ==========
    
    const amount = parseFloat(document.getElementById('transferAmount')?.value) || 0;
    const currency = document.getElementById('transferCurrency')?.value || 'eth';
    
    if (!amount || amount <= 0) { alert('Please enter a valid amount'); return false; }
    if (!validateAddress()) { alert('Please enter a valid recipient address'); return false; }
    
    let availableBalance = currency === 'eth' ? transferData.balances.eth : transferData.balances.weth;
    
    // Check if amount exceeds available balance
    if (amount > availableBalance) {
        alert('Insufficient ' + currency.toUpperCase() + ' balance. Available: ' + availableBalance.toFixed(4));
        return false;
    }
    
    // For ETH transfers, also check if we have enough for gas fee
    if (currency === 'eth') {
        const totalNeeded = amount + 0.0012;
        if (totalNeeded > availableBalance) {
            alert('Insufficient balance for transfer + gas fee. Available: ' + availableBalance.toFixed(4) + ' ETH, Needed: ' + totalNeeded.toFixed(4) + ' ETH');
            return false;
        }
    }
    
    return true;
}

// ========== UPDATED: REVIEW TRANSFER with verification check ==========
function reviewTransfer() {
    if (!validateTransferForm()) return;
    
    const currency = document.getElementById('transferCurrency')?.value || 'eth';
    const amount = parseFloat(document.getElementById('transferAmount').value) || 0;
    const recipient = document.getElementById('recipientAddress').value;
    const network = document.getElementById('transferNetwork').value;
    const note = document.getElementById('transferNote')?.value || '';
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    
    const modal = document.getElementById('transferModal');
    const modalBody = document.getElementById('transferModalBody');
    const confirmBtn = document.getElementById('confirmTransferBtn');
    
    if (!modal || !modalBody || !confirmBtn) return;
    
    const usdValue = amount * ethPrice;
    const gasFeeEth = 0.0012;
    const gasFeeUsd = gasFeeEth * ethPrice;
    
    // ========== UPDATED: Only show pending message if not verified ==========
    const user = getUserFromStorage();
    const pendingMessage = !user?.isVerified ? `
        <!-- Pending activation message for unverified users -->
        <div class="info-note" style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); border-radius: 12px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: #f59e0b20; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-clock" style="color: #f59e0b; font-size: 24px;"></i>
                </div>
                <div style="flex: 1;">
                    <h4 style="color: #f59e0b; margin: 0 0 5px 0; font-size: 16px;">⏳ Account Pending Verification</h4>
                    <p style="color: #e0e0e0; margin: 0; font-size: 14px; line-height: 1.5;">
                        Your account is pending verification. 
                        <strong style="color: #f59e0b; display: block; margin-top: 8px;">
                            <i class="fas fa-headset"></i> Contact support to verify your account
                        </strong>
                    </p>
                </div>
            </div>
        </div>
    ` : '';
    // ========== END UPDATED ==========
    
    modalBody.innerHTML = `
        <div class="transfer-review">
            <div class="review-icon"><i class="fas fa-paper-plane"></i></div>
            <h4>Transfer Details</h4>
            <div class="review-details">
                <div class="detail-row"><span>Amount</span><strong>${amount.toFixed(4)} ${currency.toUpperCase()}</strong></div>
                <div class="detail-row"><span>Value</span><strong>$${usdValue.toFixed(2)} USD</strong></div>
                <div class="detail-row"><span>Recipient</span><code class="recipient-address">${recipient.substring(0, 10)}...${recipient.substring(recipient.length - 8)}</code></div>
                <div class="detail-row"><span>Network</span><strong>${network.charAt(0).toUpperCase() + network.slice(1)}</strong></div>
                <div class="detail-row"><span>Gas Fee</span><strong>${gasFeeEth.toFixed(4)} ETH ($${gasFeeUsd.toFixed(2)})</strong></div>
                <div class="detail-row total"><span>Total Deduction</span><strong>${(amount + (currency === 'eth' ? gasFeeEth : 0)).toFixed(4)} ETH</strong></div>
            </div>
            
            ${pendingMessage}
            
            <div class="warning" style="margin-top: 15px; background: rgba(239, 68, 68, 0.1); border-left-color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                <span style="color: #ef4444;">Transactions cannot be reversed. Please verify all details.</span>
            </div>
        </div>
    `;
    
    confirmBtn.onclick = function() { executeTransfer({ currency, amount, recipient, network, note }); };
    modal.style.display = 'flex';
}

// ========== UPDATED: EXECUTE TRANSFER with verification check ==========
function executeTransfer(details) {
    console.log('💰 executeTransfer called with:', details);
    
    // ========== NEW: Double-check verification ==========
    if (!isUserVerified()) {
        showCustomNotification(
            '⏳ Account Pending Verification',
            'Your account is pending verification. Please contact support to verify your account before making transfers.',
            'pending'
        );
        closeTransferModal();
        return;
    }
    // ========== END NEW ==========
    
    const confirmBtn = document.getElementById('confirmTransferBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
    }
    
    setTimeout(async function() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!token || !user) {
                alert('Please login first');
                window.location.href = '/login';
                return;
            }
            
            // Calculate gas fee
            const gasFee = 0.0012;
            
            console.log('📤 Sending transfer request to backend:', {
                amount: details.amount,
                currency: details.currency,
                recipient: details.recipient,
                network: details.network,
                note: details.note,
                gasFee: gasFee
            });
            
            // Send to transfer request endpoint
            const response = await fetch('/api/transfers/request', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: details.amount,
                    currency: details.currency,
                    recipient: details.recipient,
                    network: details.network,
                    note: details.note,
                    gasFee: gasFee
                })
            });
            
            const data = await response.json();
            console.log('📥 Transfer response:', data);
            
            if (data.success) {
                // Add to local transactions with PENDING status
                transferData.transactions.unshift({
                    id: data.transfer?.id || Date.now(),
                    type: 'transfer',
                    amount: details.amount,
                    currency: details.currency.toUpperCase(),
                    recipient: details.recipient,
                    status: 'pending',
                    note: details.note || `Transfer to ${details.recipient.substring(0, 8)}...`,
                    createdAt: new Date().toISOString()
                });
                
                updateTransactionHistoryDisplay();
                closeTransferModal();
                
                // Show appropriate message based on verification status
                if (user?.isVerified) {
                    showCustomNotification(
                        '✅ Transfer Request Submitted',
                        'Your transfer request has been submitted and is pending admin approval.',
                        'success'
                    );
                } else {
                    showCustomNotification(
                        '⏳ Transfer Pending Verification',
                        'Your transfer request has been submitted. Your account is pending verification. Please contact support for assistance.',
                        'pending'
                    );
                }
                
                // Save to recent contacts
                saveToRecentContacts(details.recipient);
                
                // Clear the form
                document.getElementById('transferAmount').value = '';
                document.getElementById('recipientAddress').value = '';
                
            } else {
                throw new Error(data.error || 'Transfer request failed');
            }
            
        } catch(e) {
            console.error('❌ Transfer error:', e);
            alert('Error processing transfer: ' + e.message);
            closeTransferModal();
        } finally {
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirm Transfer';
                confirmBtn.disabled = false;
            }
        }
    }, 1500);
}

// ========== NEW: Custom Notification Function ==========
function showCustomNotification(title, message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('customNotificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'customNotificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    
    // Set colors based on type
    let colors = {
        pending: {
            bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            icon: 'fa-clock'
        },
        success: {
            bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            icon: 'fa-check-circle'
        },
        error: {
            bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            icon: 'fa-exclamation-circle'
        },
        info: {
            bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            icon: 'fa-info-circle'
        }
    };
    
    const color = colors[type] || colors.info;
    
    notification.style.cssText = `
        background: ${color.bg};
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 15px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        animation: slideInNotification 0.3s ease;
        display: flex;
        gap: 15px;
        align-items: flex-start;
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
    `;
    
    notification.innerHTML = `
        <div style="font-size: 28px;">
            <i class="fas ${color.icon}"></i>
        </div>
        <div style="flex: 1;">
            <h4 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${title}</h4>
            <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; opacity: 0.95;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('.custom-notification').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                    <i class="fas fa-times"></i> Dismiss
                </button>
                <button onclick="window.location.href='/support'" style="background: white; border: none; color: #333; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
                    <i class="fas fa-headset"></i> Contact Support
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 10 seconds (longer for pending)
    setTimeout(() => {
        notification.style.animation = 'slideOutNotification 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, type === 'pending' ? 10000 : 5000);
}

// Add keyframe animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInNotification {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutNotification {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// TRANSACTION HISTORY
// ============================================

async function loadTransactionHistory() {
    const historyContainer = document.getElementById('transactionHistory');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading transactions...</div>`;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Fetch withdrawals from backend
        const withdrawResponse = await fetch('/api/withdraw/history', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const withdrawData = await withdrawResponse.json();
        
        // Fetch transfers from backend
        const transferResponse = await fetch('/api/transfers/history', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const transferData_response = await transferResponse.json();
        
        // Process withdrawals
        if (withdrawData.success && withdrawData.withdrawals) {
            const backendWithdrawals = withdrawData.withdrawals.map(w => ({
                id: w.id,
                type: 'withdrawal',
                amount: w.amount,
                currency: 'ETH',
                status: w.status || 'pending',
                note: w.note || `Withdrawal to ${w.bankDetails?.bankName || 'bank'}`,
                recipient: 'Bank Withdrawal',
                createdAt: w.requestedAt || w.createdAt,
                bankDetails: w.bankDetails
            }));
            
            // Keep existing transfers and add backend withdrawals
            const transfers = transferData.transactions.filter(t => t.type === 'transfer');
            transferData.transactions = [...transfers, ...backendWithdrawals];
        }
        
        // Process transfers
        if (transferData_response.success && transferData_response.transfers) {
            const backendTransfers = transferData_response.transfers.map(t => ({
                id: t.id,
                type: 'transfer',
                amount: t.amount,
                currency: t.currency || 'ETH',
                recipient: t.recipient,
                status: t.status || 'pending',
                note: t.note || `Transfer to ${t.recipient?.substring(0, 8)}...`,
                createdAt: t.requestedAt || t.createdAt
            }));
            
            // Replace local transfers with backend transfers
            const withdrawals = transferData.transactions.filter(t => t.type === 'withdrawal');
            transferData.transactions = [...withdrawals, ...backendTransfers];
        }
        
        // Sort by date (newest first)
        transferData.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        updateTransactionHistoryDisplay();
        
    } catch (error) {
        console.error('Error loading transaction history:', error);
        // Still show local transactions if backend fails
        updateTransactionHistoryDisplay();
    }
}

function updateTransactionHistoryDisplay() {
    const historyContainer = document.getElementById('transactionHistory');
    if (!historyContainer) return;
    
    if (transferData.transactions.length === 0) {
        historyContainer.innerHTML = `<div class="empty-history"><i class="fas fa-history"></i><p>No transactions yet</p></div>`;
        return;
    }
    
    const typeFilter = document.getElementById('historyTypeFilter')?.value || 'all';
    const currencyFilter = document.getElementById('historyCurrencyFilter')?.value || 'all';
    
    let filteredTransactions = transferData.transactions;
    if (typeFilter !== 'all') filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    if (currencyFilter !== 'all') filteredTransactions = filteredTransactions.filter(t => t.currency.toLowerCase() === currencyFilter.toLowerCase());
    
    if (filteredTransactions.length === 0) {
        historyContainer.innerHTML = `<div class="empty-history"><i class="fas fa-filter"></i><p>No transactions match your filters</p></div>`;
        return;
    }
    
    let tableHTML = `<table><thead><tr><th>Type</th><th>Amount</th><th>Currency</th><th>Details</th><th>Date</th><th>Status</th></tr></thead><tbody>`;
    
    filteredTransactions.forEach(tx => {
        const date = new Date(tx.createdAt);
        let details = tx.note || 'Transaction';
        
        // Format details based on transaction type
        if (tx.type === 'withdrawal') {
            if (tx.bankDetails) {
                details = `Withdrawal to ${tx.bankDetails.bankName || 'bank'}`;
            } else {
                details = tx.note || 'Bank withdrawal';
            }
        } else if (tx.type === 'transfer') {
            if (tx.recipient) {
                details = `To: ${tx.recipient.substring(0, 8)}...`;
            }
        }
        
        let icon = 'exchange-alt';
        if (tx.type === 'transfer') icon = 'paper-plane';
        if (tx.type === 'withdrawal') icon = 'university';
        
        // Ensure status is properly formatted
        let status = tx.status || 'pending';
        status = status.toLowerCase();
        
        let statusText = status.charAt(0).toUpperCase() + status.slice(1);
        
        // Set status color based on status
        let statusColor = '';
        let statusBg = '';
        if (status === 'pending') {
            statusColor = '#f59e0b';
            statusBg = '#f59e0b20';
        } else if (status === 'completed') {
            statusColor = '#10b981';
            statusBg = '#10b98120';
        } else if (status === 'rejected' || status === 'cancelled') {
            statusColor = '#ef4444';
            statusBg = '#ef444420';
        }
        
        tableHTML += `<tr>
            <td><span class="transaction-type ${tx.type}"><i class="fas fa-${icon}"></i> ${tx.type}</span></td>
            <td>${typeof tx.amount === 'number' ? tx.amount.toFixed(4) : tx.amount}</td>
            <td>${tx.currency}</td>
            <td title="${details}">${details.length > 25 ? details.substring(0, 25) + '...' : details}</td>
            <td><div>${date.toLocaleDateString()}</div><small>${date.toLocaleTimeString()}</small></td>
            <td><span class="status-badge ${status}" style="color: ${statusColor}; background: ${statusBg}; padding: 4px 8px; border-radius: 4px; font-weight: 500;">${statusText}</span></td>
        </tr>`;
    });
    
    tableHTML += `</tbody></table>`;
    historyContainer.innerHTML = '<div class="history-table-container">' + tableHTML + '</div>';
}

function filterHistory() { loadTransactionHistory(); }
function refreshHistory() { loadTransactionHistory(); }

function closeTransferModal() {
    const modal = document.getElementById('transferModal');
    if (modal) modal.style.display = 'none';
    const confirmBtn = document.getElementById('confirmTransferBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirm Transfer';
        confirmBtn.disabled = false;
    }
}

function closeWithdrawalModal() {
    const modal = document.getElementById('withdrawalModal');
    if (modal) modal.style.display = 'none';
    const confirmBtn = document.getElementById('confirmWithdrawalBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Withdrawal';
        confirmBtn.disabled = false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM fully loaded and parsed');
    initializeTransferPage(); 
});

// Expose globally
window.pasteAddress = pasteAddress;
window.setMaxTransfer = setMaxTransfer;
window.fillContact = fillContact;
window.reviewTransfer = reviewTransfer;
window.reviewWithdrawal = reviewWithdrawal;
window.filterHistory = filterHistory;
window.refreshHistory = refreshHistory;
window.closeTransferModal = closeTransferModal;
window.closeWithdrawalModal = closeWithdrawalModal;
window.saveBankDetails = saveBankDetails;
window.showCustomNotification = showCustomNotification;
