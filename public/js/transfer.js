// transfer.js - Complete Transfer & Withdrawal with Live Database Integration
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
    recentContacts: [], // Array for dynamic contacts
    ethPrice: 2500
};

// Main initialization
async function initializeTransferPage() {
    console.log('🔄 Initializing transfer page...');
    
    // Check authentication
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    if (!token) {
        console.warn('⚠️ No authentication found, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    // Set up tabs FIRST
    setupTabs();
    
    // Set up event listeners
    setupEventListeners();
    
    // Fetch real data from the database
    await fetchUserFromBackend();
    
    // Load saved data from local storage
    loadSavedBanks();
    loadTransactionHistory();
    loadRecentContacts(); 
    
    console.log('✅ Transfer page initialized successfully');
}

// ✅ Fetch fresh user data from backend (BULLETPROOF VERSION)
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

        // Update our global state with REAL data
        transferData.balances.eth = parseFloat(result.user.internalBalance || 0);
        transferData.balances.weth = parseFloat(result.user.wethBalance || 0);
        
        // Force-update localStorage to keep app synced
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Update the UI
        const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
        updateBalanceDisplay(ethPrice);
        
        return result.user;
        
    } catch (error) {
        console.error('❌ Failed to fetch user data:', error);
        return null;
    }
}

// Update balance display
function updateBalanceDisplay(ethPrice) {
    console.log('💰 Updating balance display...');
    
    // Update ETH balance
    const ethBalanceEl = document.getElementById('transferEthBalance');
    const ethValueEl = document.getElementById('transferEthValue');
    
    if (ethBalanceEl && ethValueEl) {
        ethBalanceEl.textContent = transferData.balances.eth.toFixed(4) + ' ETH';
        ethValueEl.textContent = '$' + (transferData.balances.eth * ethPrice).toFixed(2);
    }
    
    // Update WETH balance
    const wethBalanceEl = document.getElementById('transferWethBalance');
    const wethValueEl = document.getElementById('transferWethValue');
    
    if (wethBalanceEl && wethValueEl) {
        wethBalanceEl.textContent = transferData.balances.weth.toFixed(4) + ' WETH';
        wethValueEl.textContent = '$' + (transferData.balances.weth * ethPrice).toFixed(2);
    }
    
    // Update available balance for transfer input
    updateAvailableBalance();
    
    // Update withdrawal available balance
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
            // Start completely empty if they have never made a transfer
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
        
        // Keep only the 5 most recent
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

function reviewWithdrawal() {
    const withdrawAmount = document.getElementById('withdrawAmount');
    if (!withdrawAmount) return;
    const amount = parseFloat(withdrawAmount.value) || 0;
    
    if (amount < 10) { alert('Minimum withdrawal amount is $10'); return; }
    
    let method = 'standard';
    document.querySelectorAll('input[name="withdrawMethod"]').forEach(r => { if (r.checked) method = r.value; });
    
    const savedBankSelect = document.getElementById('savedBankSelect');
    let bankDetails = null;
    
    if (savedBankSelect && savedBankSelect.value && savedBankSelect.value !== 'new') {
        bankDetails = transferData.savedBanks[savedBankSelect.value];
    } else {
        if (!validateBankForm()) { alert('Please enter valid bank details'); return; }
        bankDetails = saveBankDetails();
        if (!bankDetails) return;
    }
    
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    const cryptoAmount = amount / ethPrice;
    const fee = method === 'instant' ? amount * 0.015 : 0;
    const receiveAmount = amount - fee;
    
    const modal = document.getElementById('withdrawalModal');
    const modalBody = document.getElementById('withdrawalModalBody');
    const confirmBtn = document.getElementById('confirmWithdrawalBtn');
    
    if (!modal || !modalBody || !confirmBtn) return;
    
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
        </div>
    `;
    
    confirmBtn.onclick = function() { executeWithdrawal(amount, method, cryptoAmount, bankDetails); };
    modal.style.display = 'flex';
}

function executeWithdrawal(amount, method, cryptoAmount, bankDetails) {
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
    
    // Process live via backend
    setTimeout(async function() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user'));
            
            // Deduct locally first
            transferData.balances.eth -= cryptoAmount;
            
            // Send update to database
            await fetch(`/api/admin/users/${user._id}/balance`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    internalBalance: transferData.balances.eth,
                    wethBalance: transferData.balances.weth
                })
            });

            // Refresh globally
            await fetchUserFromBackend();
            
            // Add to transaction history
            const newTransaction = {
                id: Date.now(),
                type: 'withdrawal',
                amount: amount,
                currency: 'USD',
                status: method === 'instant' ? 'completed' : 'pending',
                note: (method === 'instant' ? 'Instant' : 'Standard') + ' bank withdrawal to ' + bankDetails.bankName,
                createdAt: new Date().toISOString()
            };
            transferData.transactions.unshift(newTransaction);
            updateTransactionHistoryDisplay();
            
            closeWithdrawalModal();
            alert('✅ Withdrawal request submitted! ' + (method === 'instant' ? 'Funds will arrive shortly.' : 'Funds will arrive in 3-5 business days.'));
            document.getElementById('withdrawAmount').value = '';
            
        } catch(e) {
            alert('Error processing withdrawal. Please try again.');
            closeWithdrawalModal();
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

function validateTransferForm() {
    const amount = parseFloat(document.getElementById('transferAmount')?.value) || 0;
    const currency = document.getElementById('transferCurrency')?.value || 'eth';
    
    if (!amount || amount <= 0) { alert('Please enter a valid amount'); return false; }
    if (!validateAddress()) { alert('Please enter a valid recipient address'); return false; }
    
    let availableBalance = currency === 'eth' ? transferData.balances.eth : transferData.balances.weth;
    if (amount > availableBalance) {
        alert('Insufficient ' + currency.toUpperCase() + ' balance. Available: ' + availableBalance.toFixed(4));
        return false;
    }
    return true;
}

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
    
    modalBody.innerHTML = `
        <div class="transfer-review">
            <div class="review-icon"><i class="fas fa-paper-plane"></i></div>
            <h4>Transfer Details</h4>
            <div class="review-details">
                <div class="detail-row"><span>Amount</span><strong>${amount.toFixed(4)} ${currency.toUpperCase()}</strong></div>
                <div class="detail-row"><span>Value</span><strong>$${usdValue.toFixed(2)} USD</strong></div>
                <div class="detail-row"><span>Recipient</span><code class="recipient-address">${recipient.substring(0, 10)}...${recipient.substring(recipient.length - 8)}</code></div>
                <div class="detail-row"><span>Network</span><strong>${network.charAt(0).toUpperCase() + network.slice(1)}</strong></div>
                <div class="detail-row"><span>Gas Fee</span><strong>${gasFeeEth.toFixed(4)} ETH</strong></div>
            </div>
            <div class="warning"><i class="fas fa-exclamation-triangle"></i><span>Transactions cannot be reversed. Please verify all details.</span></div>
        </div>
    `;
    
    confirmBtn.onclick = function() { executeTransfer({ currency, amount, recipient, network, note }); };
    modal.style.display = 'flex';
}

function executeTransfer(details) {
    const confirmBtn = document.getElementById('confirmTransferBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
    }
    
    // Live backend connection
    setTimeout(async function() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user'));
            
            // Deduct locally for immediate UI update
            if (details.currency === 'eth') {
                transferData.balances.eth -= details.amount;
                transferData.balances.eth -= 0.0012; // gas
            } else {
                transferData.balances.weth -= details.amount;
                transferData.balances.eth -= 0.0012; // gas
            }
            
            // Update the live database
            await fetch(`/api/admin/users/${user._id}/balance`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    internalBalance: transferData.balances.eth,
                    wethBalance: transferData.balances.weth
                })
            });

            // Resync the app
            await fetchUserFromBackend(); 
            
            // Log history
            transferData.transactions.unshift({
                id: Date.now(),
                type: 'transfer',
                amount: details.amount,
                currency: details.currency.toUpperCase(),
                recipient: details.recipient,
                status: 'completed',
                note: details.note,
                createdAt: new Date().toISOString()
            });
            updateTransactionHistoryDisplay();
            
            closeTransferModal();
            alert('✅ Successfully transferred ' + details.amount.toFixed(4) + ' ' + details.currency.toUpperCase() + '!');
            
            // 🔥 NEW: Save the address to Recent Contacts automatically!
            saveToRecentContacts(details.recipient);
            
            // Clear inputs
            document.getElementById('transferAmount').value = '';
            document.getElementById('recipientAddress').value = '';
            
        } catch(e) {
            alert('Error processing transfer. Please try again.');
            closeTransferModal();
        }
    }, 1500);
}

// ============================================
// TRANSACTION HISTORY
// ============================================

function loadTransactionHistory() {
    const historyContainer = document.getElementById('transactionHistory');
    if (!historyContainer) return;
    historyContainer.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading transactions...</div>`;
    
    setTimeout(function() {
        updateTransactionHistoryDisplay();
    }, 800);
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
        if (tx.bankDetails) details = tx.bankDetails.bankName + ' (****' + tx.bankDetails.lastFour + ')';
        else if (tx.recipient) details = 'To: ' + tx.recipient.substring(0, 8) + '...';
        
        let icon = 'exchange-alt';
        if (tx.type === 'transfer') icon = 'paper-plane';
        if (tx.type === 'withdrawal') icon = 'university';
        
        tableHTML += `<tr>
            <td><span class="transaction-type ${tx.type}"><i class="fas fa-${icon}"></i> ${tx.type}</span></td>
            <td>${tx.amount.toFixed(tx.currency === 'USD' ? 2 : 4)}</td>
            <td>${tx.currency}</td>
            <td title="${details}">${details.length > 25 ? details.substring(0, 25) + '...' : details}</td>
            <td><div>${date.toLocaleDateString()}</div><small>${date.toLocaleTimeString()}</small></td>
            <td><span class="status-badge ${tx.status}">${tx.status}</span></td>
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
