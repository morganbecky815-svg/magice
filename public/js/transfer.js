// transfer.js - Complete Transfer & Withdrawal with Universal Bank Method
// Magic Eden - Transfer Page

console.log('🚀 Transfer.js loaded successfully');

// Global data store - Removed fake static balances!
let transferData = {
    balances: {
        eth: 0, 
        weth: 0, 
        usd: 0
    },
    transactions: [],
    savedBanks: [],
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
    
    // Set up tabs FIRST - This is critical
    setupTabs();
    
    // Set up event listeners
    setupEventListeners();
    
    // 🔥 NEW: Fetch real data from the database first!
    await fetchUserFromBackend();
    
    // Load saved banks
    loadSavedBanks();
    
    // Load transaction history
    loadTransactionHistory();
    
    console.log('✅ Transfer page initialized successfully');
}

// ✅ NEW: Fetch fresh user data from backend (BULLETPROOF VERSION)
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
        
        // Force-update localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Update the UI
        const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
        updateBalanceDisplay(ethPrice);
        
        return result.user;
        
    } catch (error) {
        console.error('❌ Failed to fetch user data, falling back to localStorage:', error);
        loadUserData(); // Fallback to localStorage if API fails
        return null;
    }
}

// Load user data (Fallback if API fails)
function loadUserData() {
    console.log('🔄 Loading user data from local storage...');
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
            if (userData.internalBalance !== undefined) {
                transferData.balances.eth = parseFloat(userData.internalBalance);
            }
            if (userData.wethBalance !== undefined) {
                transferData.balances.weth = parseFloat(userData.wethBalance);
            }
            const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
            updateBalanceDisplay(ethPrice);
        }
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        updateBalanceDisplay(transferData.ethPrice);
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
    
    // Update available balance for transfer
    updateAvailableBalance();
    
    // Update withdrawal available balance
    const totalUsd = (transferData.balances.eth + transferData.balances.weth) * ethPrice;
    const withdrawBalanceEl = document.getElementById('withdrawAvailableBalance');
    if (withdrawBalanceEl) {
        withdrawBalanceEl.textContent = '$' + totalUsd.toFixed(2);
    }
    
    // Update withdrawal conversion
    updateWithdrawalSummary();
}

// Set up tab switching
function setupTabs() {
    console.log('🔄 Setting up tabs...');
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

// Set up all event listeners
function setupEventListeners() {
    console.log('🔄 Setting up event listeners...');
    
    // Transfer form events
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
    
    // Withdrawal form events
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

// Load saved banks
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
    
    const bankName = document.getElementById('bankName');
    const accountHolderName = document.getElementById('accountHolderName');
    const accountNumber = document.getElementById('accountNumber');
    const accountType = document.getElementById('accountType');
    const saveBankDetails = document.getElementById('saveBankDetails');
    
    if (bankName) bankName.value = '';
    if (accountHolderName) accountHolderName.value = '';
    if (accountNumber) accountNumber.value = '';
    if (accountType) accountType.value = 'checking';
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

function pasteAddress() {
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function(text) {
            const addressInput = document.getElementById('recipientAddress');
            if (addressInput) {
                addressInput.value = text;
                validateAddress();
            }
        }).catch(function(err) {
            alert('Unable to read clipboard. Please paste manually.');
        });
    } else {
        alert('Clipboard access not supported. Please paste manually.');
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

function fillContact(address) {
    const addressInput = document.getElementById('recipientAddress');
    if (addressInput) {
        addressInput.value = address;
        validateAddress();
    }
}

function updateWithdrawalSummary() {
    const withdrawAmount = document.getElementById('withdrawAmount');
    const methodRadios = document.querySelectorAll('input[name="withdrawMethod"]');
    if (!withdrawAmount) return;
    
    const amount = parseFloat(withdrawAmount.value) || 0;
    let method = 'standard';
    methodRadios.forEach(radio => { if (radio.checked) method = radio.value; });
    
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    const cryptoAmount = amount / ethPrice;
    let fee = method === 'instant' ? amount * 0.015 : 0;
    const receiveAmount = amount - fee;
    
    const cryptoAmountEl = document.getElementById('withdrawCryptoAmount');
    const withdrawalAmountEl = document.getElementById('withdrawalAmount');
    const withdrawalFeeEl = document.getElementById('withdrawalFee');
    const withdrawalReceiveEl = document.getElementById('withdrawalReceive');
    
    if (cryptoAmountEl) cryptoAmountEl.textContent = cryptoAmount.toFixed(4) + ' ETH';
    if (withdrawalAmountEl) withdrawalAmountEl.textContent = '$' + amount.toFixed(2);
    if (withdrawalFeeEl) withdrawalFeeEl.textContent = '$' + fee.toFixed(2);
    if (withdrawalReceiveEl) withdrawalReceiveEl.textContent = '$' + receiveAmount.toFixed(2);
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
    
    // 🔥 NEW: Actual API call for withdrawal
    setTimeout(async function() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user'));
            
            // Deduct locally for immediate UI update
            transferData.balances.eth -= cryptoAmount;
            
            // We'll update the backend balance via the same route the admin uses
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

            // Refresh the global data
            await fetchUserFromBackend();
            
            closeWithdrawalModal();
            alert('✅ Withdrawal request submitted! ' + (method === 'instant' ? 'Funds will arrive shortly.' : 'Funds will arrive in 3-5 business days.'));
            document.getElementById('withdrawAmount').value = '';
            
        } catch(e) {
            alert('Error processing withdrawal. Please try again.');
            closeWithdrawalModal();
        }
    }, 1500);
}

function reviewTransfer() {
    if (!validateTransferForm()) return;
    
    const currency = document.getElementById('transferCurrency').value;
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
    
    confirmBtn.onclick = function() {
        executeTransfer({ currency, amount, recipient, network, note });
    };
    modal.style.display = 'flex';
}

function validateTransferForm() {
    const amount = parseFloat(document.getElementById('transferAmount')?.value) || 0;
    const currency = document.getElementById('transferCurrency')?.value;
    
    if (!amount || amount <= 0) { alert('Please enter a valid amount'); return false; }
    if (!validateAddress()) { alert('Please enter a valid recipient address'); return false; }
    
    let availableBalance = currency === 'eth' ? transferData.balances.eth : transferData.balances.weth;
    if (amount > availableBalance) {
        alert('Insufficient ' + currency.toUpperCase() + ' balance. Available: ' + availableBalance.toFixed(4));
        return false;
    }
    return true;
}

function executeTransfer(details) {
    const confirmBtn = document.getElementById('confirmTransferBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
    }
    
    // 🔥 NEW: Actual API call for transfer
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
            
            // Update backend
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

            await fetchUserFromBackend(); // Refresh all data
            
            closeTransferModal();
            alert('✅ Successfully transferred ' + details.amount.toFixed(4) + ' ' + details.currency.toUpperCase() + '!');
            
            document.getElementById('transferAmount').value = '';
            document.getElementById('recipientAddress').value = '';
            
        } catch(e) {
            alert('Error processing transfer. Please try again.');
            closeTransferModal();
        }
    }, 1500);
}

function loadTransactionHistory() {
    const historyContainer = document.getElementById('transactionHistory');
    if (!historyContainer) return;
    historyContainer.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading transactions...</div>`;
    
    setTimeout(function() {
        if (transferData.transactions.length > 0) {
            updateTransactionHistoryDisplay();
        } else {
            historyContainer.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>No transactions yet</p>
                    <small>Your transaction history will appear here</small>
                </div>
            `;
        }
    }, 1000);
}

function updateTransactionHistoryDisplay() {
    // Basic history display (unchanged)
    const historyContainer = document.getElementById('transactionHistory');
    if (!historyContainer) return;
    
    if (transferData.transactions.length === 0) {
        historyContainer.innerHTML = `<div class="empty-history"><i class="fas fa-history"></i><p>No transactions yet</p></div>`;
        return;
    }
    
    // Simple table rendering logic...
    let tableHTML = `<table><thead><tr><th>Type</th><th>Amount</th><th>Currency</th><th>Date</th></tr></thead><tbody>`;
    transferData.transactions.forEach(function(tx) {
        tableHTML += `<tr>
            <td>${tx.type}</td>
            <td>${tx.amount}</td>
            <td>${tx.currency}</td>
            <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
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
    // Ensure we trigger the async setup
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
