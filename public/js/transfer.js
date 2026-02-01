// transfer.js - Complete Transfer & Withdrawal with Universal Bank Method
// Magic Eden - Transfer Page

console.log('🚀 Transfer.js loaded successfully');

// Global data store
let transferData = {
    balances: {
        eth: 1.5824,
        weth: 0.8342,
        usd: 0
    },
    transactions: [],
    savedBanks: [],
    ethPrice: 2500
};

// Main initialization
function initializeTransferPage() {
    console.log('🔄 Initializing transfer page...');
    
    // Check authentication
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        console.warn('⚠️ No authentication found, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    // Set up tabs FIRST - This is critical
    setupTabs();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load user data
    loadUserData();
    
    // Load saved banks
    loadSavedBanks();
    
    // Load transaction history
    loadTransactionHistory();
    
    console.log('✅ Transfer page initialized successfully');
}

// Set up tab switching
function setupTabs() {
    console.log('🔄 Setting up tabs...');
    
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log(`📊 Found ${tabButtons.length} tab buttons and ${tabContents.length} tab contents`);
    
    // Make sure CSS is applied
    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    
    // Show first tab by default
    if (tabContents.length > 0) {
        tabContents[0].style.display = 'block';
    }
    
    // Add click events to all tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabId = this.getAttribute('data-tab');
            console.log(`🔘 Tab clicked: ${tabId}`);
            
            // Remove active class from all buttons
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });
            
            // Show the selected tab content
            const targetContent = document.getElementById(tabId + '-tab');
            if (targetContent) {
                targetContent.style.display = 'block';
                targetContent.classList.add('active');
                console.log(`✅ Showing tab: ${tabId}-tab`);
                
                // Load data for specific tabs
                if (tabId === 'history') {
                    loadTransactionHistory();
                }
            } else {
                console.error(`❌ Tab content not found: ${tabId}-tab`);
            }
        });
    });
    
    console.log('✅ Tabs setup complete');
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
    if (transferAmount) {
        transferAmount.addEventListener('input', updateTransferSummary);
    }
    
    const recipientAddress = document.getElementById('recipientAddress');
    if (recipientAddress) {
        recipientAddress.addEventListener('input', validateAddress);
    }
    
    // Withdrawal form events
    const withdrawAmount = document.getElementById('withdrawAmount');
    if (withdrawAmount) {
        withdrawAmount.addEventListener('input', updateWithdrawalSummary);
    }
    
    const withdrawMethods = document.querySelectorAll('input[name="withdrawMethod"]');
    withdrawMethods.forEach(method => {
        method.addEventListener('change', updateWithdrawalSummary);
    });
    
    // Bank account type toggle
    const accountTypeSelect = document.getElementById('accountType');
    if (accountTypeSelect) {
        accountTypeSelect.addEventListener('change', toggleAccountFields);
    }
    
    // Save bank checkbox
    const saveBankCheckbox = document.getElementById('saveBankDetails');
    if (saveBankCheckbox) {
        saveBankCheckbox.addEventListener('change', toggleSaveBank);
    }
    
    // Saved bank selection
    const savedBankSelect = document.getElementById('savedBankSelect');
    if (savedBankSelect) {
        savedBankSelect.addEventListener('change', fillSavedBankDetails);
    }
    
    // History filter events
    const historyTypeFilter = document.getElementById('historyTypeFilter');
    if (historyTypeFilter) {
        historyTypeFilter.addEventListener('change', loadTransactionHistory);
    }
    
    const historyCurrencyFilter = document.getElementById('historyCurrencyFilter');
    if (historyCurrencyFilter) {
        historyCurrencyFilter.addEventListener('change', loadTransactionHistory);
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    console.log('✅ Event listeners setup complete');
}

// Load user data
function loadUserData() {
    console.log('🔄 Loading user data...');
    
    try {
        // Get user from localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        
        if (userData) {
            // Update balances from user data
            if (userData.ethBalance !== undefined) {
                transferData.balances.eth = userData.ethBalance;
            }
            if (userData.wethBalance !== undefined) {
                transferData.balances.weth = userData.wethBalance;
            }
            
            // Get ETH price from service or use default
            const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
            
            // Update display
            updateBalanceDisplay(ethPrice);
        }
        
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        // Use default balances
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

// Load saved banks
function loadSavedBanks() {
    console.log('🏦 Loading saved banks...');
    
    // Try to load from localStorage
    try {
        const savedBanks = localStorage.getItem('savedBanks');
        if (savedBanks) {
            transferData.savedBanks = JSON.parse(savedBanks);
            updateSavedBanksDropdown();
        }
    } catch (error) {
        console.error('Error loading saved banks:', error);
        transferData.savedBanks = [];
    }
    
    // If no saved banks, show new bank form
    if (transferData.savedBanks.length === 0) {
        showNewBankForm();
    }
}

// Update saved banks dropdown
function updateSavedBanksDropdown() {
    const savedBankSelect = document.getElementById('savedBankSelect');
    
    if (!savedBankSelect) return;
    
    // Clear existing options
    savedBankSelect.innerHTML = '<option value="">Select a saved bank</option>';
    
    // Add saved banks
    transferData.savedBanks.forEach(function(bank, index) {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = bank.bankName + ' - ****' + bank.accountNumber.slice(-4);
        savedBankSelect.appendChild(option);
    });
    
    // Add "Add New Bank" option
    const newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.textContent = '+ Add New Bank Account';
    savedBankSelect.appendChild(newOption);
}

// Show new bank form
function showNewBankForm() {
    const bankDetailsSection = document.getElementById('bankDetailsSection');
    const newBankSection = document.getElementById('newBankSection');
    
    if (bankDetailsSection) bankDetailsSection.style.display = 'none';
    if (newBankSection) newBankSection.style.display = 'block';
    
    // Reset form
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
    
    // Trigger account type change to show correct fields
    toggleAccountFields();
}

// Show saved bank details
function showSavedBankDetails() {
    const bankDetailsSection = document.getElementById('bankDetailsSection');
    const newBankSection = document.getElementById('newBankSection');
    
    if (bankDetailsSection) bankDetailsSection.style.display = 'block';
    if (newBankSection) newBankSection.style.display = 'none';
}

// Fill saved bank details
function fillSavedBankDetails() {
    const savedBankSelect = document.getElementById('savedBankSelect');
    const selectedIndex = savedBankSelect ? savedBankSelect.value : null;
    
    if (!selectedIndex || selectedIndex === 'new') return;
    
    const bank = transferData.savedBanks[selectedIndex];
    if (!bank) return;
    
    // Update bank details section
    const selectedBankName = document.getElementById('selectedBankName');
    const selectedAccountHolder = document.getElementById('selectedAccountHolder');
    const selectedAccountNumber = document.getElementById('selectedAccountNumber');
    const selectedAccountType = document.getElementById('selectedAccountType');
    
    if (selectedBankName) selectedBankName.textContent = bank.bankName;
    if (selectedAccountHolder) selectedAccountHolder.textContent = bank.accountHolderName;
    if (selectedAccountNumber) selectedAccountNumber.textContent = '****' + bank.accountNumber.slice(-4);
    if (selectedAccountType) selectedAccountType.textContent = bank.accountType.charAt(0).toUpperCase() + bank.accountType.slice(1);
}

// Toggle account fields based on type
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

// Toggle save bank option
function toggleSaveBank() {
    const saveBankCheckbox = document.getElementById('saveBankDetails');
    const bankNicknameGroup = document.getElementById('bankNicknameGroup');
    
    if (bankNicknameGroup && saveBankCheckbox) {
        bankNicknameGroup.style.display = saveBankCheckbox.checked ? 'block' : 'none';
    }
}

// Update available balance for transfer
function updateAvailableBalance() {
    const currency = document.getElementById('transferCurrency');
    let availableBalance = 0;
    
    if (!currency) return;
    
    switch(currency.value) {
        case 'eth':
            availableBalance = transferData.balances.eth;
            break;
        case 'weth':
            availableBalance = transferData.balances.weth;
            break;
    }
    
    const availableBalanceEl = document.getElementById('transferAvailableBalance');
    if (availableBalanceEl) {
        availableBalanceEl.textContent = availableBalance.toFixed(4) + ' ' + currency.value.toUpperCase();
    }
}

// Update transfer form
function updateTransferForm() {
    const currency = document.getElementById('transferCurrency');
    const currencyDisplay = document.getElementById('transferCurrencyDisplay');
    
    if (currencyDisplay && currency) {
        currencyDisplay.textContent = currency.value.toUpperCase();
    }
    
    updateTransferSummary();
}

// Update transfer summary
function updateTransferSummary() {
    const amountInput = document.getElementById('transferAmount');
    const currency = document.getElementById('transferCurrency');
    
    if (!amountInput || !currency) return;
    
    const amount = parseFloat(amountInput.value) || 0;
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    
    // Update USD conversion
    const usdValue = amount * ethPrice;
    const usdValueEl = document.getElementById('transferUsdValue');
    if (usdValueEl) {
        usdValueEl.textContent = '$' + usdValue.toFixed(2);
    }
    
    // Update gas fee
    const gasFeeEth = currency.value === 'weth' ? 0.0015 : 0.0012;
    const gasFeeUsd = gasFeeEth * ethPrice;
    
    const gasFeeEl = document.getElementById('gasFee');
    if (gasFeeEl) {
        gasFeeEl.textContent = gasFeeEth.toFixed(4) + ' ETH ($' + gasFeeUsd.toFixed(2) + ')';
    }
    
    // Update summary
    const sendAmountEl = document.getElementById('sendAmount');
    const networkFeeEl = document.getElementById('networkFee');
    const totalAmountEl = document.getElementById('totalAmount');
    
    if (sendAmountEl) {
        sendAmountEl.textContent = amount.toFixed(4) + ' ' + currency.value.toUpperCase();
    }
    
    if (networkFeeEl) {
        networkFeeEl.textContent = gasFeeEth.toFixed(4) + ' ETH';
    }
    
    if (totalAmountEl) {
        const totalEth = currency.value === 'eth' ? amount + gasFeeEth : gasFeeEth;
        totalAmountEl.textContent = totalEth.toFixed(4) + ' ETH';
    }
}

// Validate Ethereum address
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

// Validate bank form
function validateBankForm() {
    const accountType = document.getElementById('accountType');
    const bankName = document.getElementById('bankName');
    const accountHolder = document.getElementById('accountHolderName');
    const accountNumber = document.getElementById('accountNumber');
    const routingNumber = document.getElementById('routingNumber');
    const swiftCode = document.getElementById('swiftCode');
    
    if (!accountType || !bankName || !accountHolder || !accountNumber) {
        return false;
    }
    
    if (!bankName.value.trim() || bankName.value.trim().length < 2) {
        alert('Please enter a valid bank name');
        return false;
    }
    
    if (!accountHolder.value.trim() || accountHolder.value.trim().length < 2) {
        alert('Please enter account holder name');
        return false;
    }
    
    if (!accountNumber.value.trim() || accountNumber.value.trim().length < 8) {
        alert('Please enter a valid account number (minimum 8 digits)');
        return false;
    }
    
    if (accountType.value === 'international') {
        if (!swiftCode || !swiftCode.value.trim() || swiftCode.value.trim().length < 8) {
            alert('Please enter a valid SWIFT/BIC code');
            return false;
        }
    } else {
        if (!routingNumber || !routingNumber.value.trim() || routingNumber.value.trim().length !== 9) {
            alert('Please enter a valid 9-digit routing number');
            return false;
        }
    }
    
    return true;
}

// Save bank details
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
    
    if (!bankName || !accountHolder || !accountNumber || !accountType) {
        return null;
    }
    
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
        // Add to saved banks
        transferData.savedBanks.unshift(newBank);
        
        // Save to localStorage
        localStorage.setItem('savedBanks', JSON.stringify(transferData.savedBanks));
        
        // Update dropdown
        updateSavedBanksDropdown();
        
        // Select the new bank
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

// Paste address from clipboard
function pasteAddress() {
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText()
            .then(function(text) {
                const addressInput = document.getElementById('recipientAddress');
                if (addressInput) {
                    addressInput.value = text;
                    validateAddress();
                }
            })
            .catch(function(err) {
                console.error('Failed to read clipboard:', err);
                alert('Unable to read clipboard. Please paste manually.');
            });
    } else {
        alert('Clipboard access not supported. Please paste manually.');
    }
}

// Set maximum transfer amount
function setMaxTransfer() {
    const currency = document.getElementById('transferCurrency');
    const transferAmount = document.getElementById('transferAmount');
    
    if (!currency || !transferAmount) return;
    
    let maxAmount = 0;
    
    switch(currency.value) {
        case 'eth':
            maxAmount = transferData.balances.eth;
            break;
        case 'weth':
            maxAmount = transferData.balances.weth;
            break;
    }
    
    // Leave room for gas fee if transferring ETH
    let maxTransfer = maxAmount;
    if (currency.value === 'eth') {
        maxTransfer = Math.max(0, maxAmount - 0.0012);
    }
    
    transferAmount.value = maxTransfer.toFixed(4);
    updateTransferSummary();
}

// Fill contact address
function fillContact(address) {
    const addressInput = document.getElementById('recipientAddress');
    if (addressInput) {
        addressInput.value = address;
        validateAddress();
    }
}

// Update withdrawal summary
function updateWithdrawalSummary() {
    const withdrawAmount = document.getElementById('withdrawAmount');
    const methodRadios = document.querySelectorAll('input[name="withdrawMethod"]');
    
    if (!withdrawAmount) return;
    
    const amount = parseFloat(withdrawAmount.value) || 0;
    let method = 'standard';
    
    // Find checked method
    methodRadios.forEach(function(radio) {
        if (radio.checked) {
            method = radio.value;
        }
    });
    
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    
    // Calculate crypto amount
    const cryptoAmount = amount / ethPrice;
    
    // Calculate fee
    let fee = 0;
    if (method === 'instant') {
        fee = amount * 0.015; // 1.5% fee
    }
    
    // Calculate receive amount
    const receiveAmount = amount - fee;
    
    // Update display
    const cryptoAmountEl = document.getElementById('withdrawCryptoAmount');
    const withdrawalAmountEl = document.getElementById('withdrawalAmount');
    const withdrawalFeeEl = document.getElementById('withdrawalFee');
    const withdrawalReceiveEl = document.getElementById('withdrawalReceive');
    
    if (cryptoAmountEl) cryptoAmountEl.textContent = cryptoAmount.toFixed(4) + ' ETH';
    if (withdrawalAmountEl) withdrawalAmountEl.textContent = '$' + amount.toFixed(2);
    if (withdrawalFeeEl) withdrawalFeeEl.textContent = '$' + fee.toFixed(2);
    if (withdrawalReceiveEl) withdrawalReceiveEl.textContent = '$' + receiveAmount.toFixed(2);
}

// Review withdrawal
function reviewWithdrawal() {
    const withdrawAmount = document.getElementById('withdrawAmount');
    const methodRadios = document.querySelectorAll('input[name="withdrawMethod"]');
    
    if (!withdrawAmount) return;
    
    const amount = parseFloat(withdrawAmount.value) || 0;
    
    if (amount < 10) {
        alert('Minimum withdrawal amount is $10');
        return;
    }
    
    let method = 'standard';
    methodRadios.forEach(function(radio) {
        if (radio.checked) {
            method = radio.value;
        }
    });
    
    // Check if bank details are provided
    const savedBankSelect = document.getElementById('savedBankSelect');
    
    let bankDetails = null;
    
    if (savedBankSelect && savedBankSelect.value && savedBankSelect.value !== 'new') {
        // Using saved bank
        bankDetails = transferData.savedBanks[savedBankSelect.value];
    } else {
        // Using new bank - validate and save
        if (!validateBankForm()) {
            alert('Please enter valid bank details');
            return;
        }
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
            <div class="review-icon">
                <i class="fas fa-university"></i>
            </div>
            <h4>Withdrawal Details</h4>
            
            <div class="review-details">
                <div class="detail-row">
                    <span>Amount</span>
                    <strong>$${amount.toFixed(2)}</strong>
                </div>
                <div class="detail-row">
                    <span>Equivalent</span>
                    <strong>${cryptoAmount.toFixed(4)} ETH</strong>
                </div>
                <div class="detail-row">
                    <span>Method</span>
                    <strong>${method === 'instant' ? 'Instant (1.5% fee)' : 'Standard (3-5 days)'}</strong>
                </div>
                <div class="detail-row">
                    <span>Fee</span>
                    <strong>$${fee.toFixed(2)}</strong>
                </div>
                <div class="detail-row total">
                    <span>You Receive</span>
                    <strong>$${receiveAmount.toFixed(2)}</strong>
                </div>
                <div class="detail-row">
                    <span>Bank</span>
                    <strong>${bankDetails.bankName}</strong>
                </div>
                <div class="detail-row">
                    <span>Account Holder</span>
                    <strong>${bankDetails.accountHolderName}</strong>
                </div>
                <div class="detail-row">
                    <span>Account Number</span>
                    <strong>****${bankDetails.accountNumber.slice(-4)}</strong>
                </div>
                <div class="detail-row">
                    <span>Account Type</span>
                    <strong>${bankDetails.accountType.charAt(0).toUpperCase() + bankDetails.accountType.slice(1)}</strong>
                </div>
            </div>
            
            <div class="warning">
                <i class="fas fa-clock"></i>
                <span>${method === 'instant' ? 'Funds will arrive within minutes' : 'Funds will arrive in 3-5 business days'}</span>
            </div>
        </div>
    `;
    
    confirmBtn.onclick = function() {
        executeWithdrawal(amount, method, cryptoAmount, bankDetails);
    };
    
    modal.style.display = 'flex';
}

// Execute withdrawal
function executeWithdrawal(amount, method, cryptoAmount, bankDetails) {
    const confirmBtn = document.getElementById('confirmWithdrawalBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
    }
    
    // Check balance
    if (cryptoAmount > transferData.balances.eth) {
        alert('Insufficient ETH balance for withdrawal');
        closeWithdrawalModal();
        return;
    }
    
    // Simulate API call
    setTimeout(function() {
        // Update balances
        transferData.balances.eth -= cryptoAmount;
        
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user')) || {};
        user.ethBalance = transferData.balances.eth;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Add to transaction history
        const newTransaction = {
            id: Date.now(),
            type: 'withdrawal',
            amount: amount,
            currency: 'USD',
            status: method === 'instant' ? 'completed' : 'pending',
            note: (method === 'instant' ? 'Instant' : 'Standard') + ' bank withdrawal to ' + bankDetails.bankName,
            bankDetails: {
                bankName: bankDetails.bankName,
                lastFour: bankDetails.accountNumber.slice(-4)
            },
            createdAt: new Date().toISOString()
        };
        
        transferData.transactions.unshift(newTransaction);
        updateTransactionHistoryDisplay();
        
        // Update display
        const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
        updateBalanceDisplay(ethPrice);
        
        // Close modal
        closeWithdrawalModal();
        
        // Show success
        alert('✅ Withdrawal request submitted! ' + (method === 'instant' ? 'Funds will arrive shortly.' : 'Funds will arrive in 3-5 business days.'));
        
        // Reset form
        const withdrawAmountInput = document.getElementById('withdrawAmount');
        if (withdrawAmountInput) withdrawAmountInput.value = '';
        
    }, 1500);
}

// Review transfer
function reviewTransfer() {
    if (!validateTransferForm()) {
        return;
    }
    
    const currency = document.getElementById('transferCurrency');
    const transferAmount = document.getElementById('transferAmount');
    const recipientAddress = document.getElementById('recipientAddress');
    const transferNetwork = document.getElementById('transferNetwork');
    const transferNote = document.getElementById('transferNote');
    
    if (!currency || !transferAmount || !recipientAddress || !transferNetwork) return;
    
    const currencyValue = currency.value;
    const amount = parseFloat(transferAmount.value) || 0;
    const recipient = recipientAddress.value;
    const network = transferNetwork.value;
    const note = transferNote ? transferNote.value : '';
    const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
    
    const modal = document.getElementById('transferModal');
    const modalBody = document.getElementById('transferModalBody');
    const confirmBtn = document.getElementById('confirmTransferBtn');
    
    if (!modal || !modalBody || !confirmBtn) return;
    
    const usdValue = amount * ethPrice;
    const gasFeeEth = 0.0012;
    
    modalBody.innerHTML = `
        <div class="transfer-review">
            <div class="review-icon">
                <i class="fas fa-paper-plane"></i>
            </div>
            <h4>Transfer Details</h4>
            
            <div class="review-details">
                <div class="detail-row">
                    <span>Amount</span>
                    <strong>${amount.toFixed(4)} ${currencyValue.toUpperCase()}</strong>
                </div>
                <div class="detail-row">
                    <span>Value</span>
                    <strong>$${usdValue.toFixed(2)} USD</strong>
                </div>
                <div class="detail-row">
                    <span>Recipient</span>
                    <code class="recipient-address">${recipient.substring(0, 10)}...${recipient.substring(recipient.length - 8)}</code>
                </div>
                <div class="detail-row">
                    <span>Network</span>
                    <strong>${network.charAt(0).toUpperCase() + network.slice(1)}</strong>
                </div>
                <div class="detail-row">
                    <span>Gas Fee</span>
                    <strong>${gasFeeEth.toFixed(4)} ETH ($${(gasFeeEth * ethPrice).toFixed(2)})</strong>
                </div>
                ${note ? `
                <div class="detail-row">
                    <span>Note</span>
                    <em>"${note}"</em>
                </div>
                ` : ''}
            </div>
            
            <div class="warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Transactions cannot be reversed. Please verify all details.</span>
            </div>
        </div>
    `;
    
    confirmBtn.onclick = function() {
        executeTransfer({
            currency: currencyValue,
            amount: amount,
            recipient: recipient,
            network: network,
            note: note
        });
    };
    
    modal.style.display = 'flex';
}

function validateTransferForm() {
    const amountInput = document.getElementById('transferAmount');
    const recipientInput = document.getElementById('recipientAddress');
    const currency = document.getElementById('transferCurrency');
    
    if (!amountInput || !recipientInput || !currency) return false;
    
    const amount = parseFloat(amountInput.value) || 0;
    const recipient = recipientInput.value;
    
    // Check amount
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return false;
    }
    
    // Check recipient
    if (!validateAddress()) {
        alert('Please enter a valid recipient address');
        return false;
    }
    
    // Check balance
    let availableBalance = 0;
    switch(currency.value) {
        case 'eth':
            availableBalance = transferData.balances.eth;
            break;
        case 'weth':
            availableBalance = transferData.balances.weth;
            break;
    }
    
    if (amount > availableBalance) {
        alert('Insufficient ' + currency.value.toUpperCase() + ' balance. Available: ' + availableBalance.toFixed(4));
        return false;
    }
    
    return true;
}

function executeTransfer(transferDetails) {
    console.log('Executing transfer:', transferDetails);
    
    const confirmBtn = document.getElementById('confirmTransferBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
    }
    
    // Simulate API call
    setTimeout(function() {
        // Update balances
        switch(transferDetails.currency) {
            case 'eth':
                transferData.balances.eth -= transferDetails.amount;
                break;
            case 'weth':
                transferData.balances.weth -= transferDetails.amount;
                // Deduct gas fee from ETH
                transferData.balances.eth -= 0.0012;
                break;
        }
        
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user')) || {};
        user.ethBalance = transferData.balances.eth;
        user.wethBalance = transferData.balances.weth;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update display
        const ethPrice = window.ethPriceService ? window.ethPriceService.currentPrice : transferData.ethPrice;
        updateBalanceDisplay(ethPrice);
        
        // Add to transaction history
        const newTransaction = {
            id: Date.now(),
            type: 'transfer',
            amount: transferDetails.amount,
            currency: transferDetails.currency.toUpperCase(),
            recipient: transferDetails.recipient,
            status: 'completed',
            note: transferDetails.note,
            createdAt: new Date().toISOString()
        };
        
        transferData.transactions.unshift(newTransaction);
        updateTransactionHistoryDisplay();
        
        // Close modal
        closeTransferModal();
        
        // Show success
        alert('✅ Successfully transferred ' + transferDetails.amount.toFixed(4) + ' ' + transferDetails.currency.toUpperCase() + '!');
        
        // Reset form
        document.getElementById('transferAmount').value = '';
        document.getElementById('recipientAddress').value = '';
        const transferNote = document.getElementById('transferNote');
        if (transferNote) transferNote.value = '';
        
    }, 1500);
}

// Load transaction history
function loadTransactionHistory() {
    console.log('🔄 Loading transaction history...');
    
    const historyContainer = document.getElementById('transactionHistory');
    if (!historyContainer) return;
    
    // Show loading
    historyContainer.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i> Loading transactions...
        </div>
    `;
    
    // Simulate API delay
    setTimeout(function() {
        // If we have transactions, use them, otherwise show empty state
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

// Update transaction history display
function updateTransactionHistoryDisplay() {
    const historyContainer = document.getElementById('transactionHistory');
    if (!historyContainer) return;
    
    if (transferData.transactions.length === 0) {
        historyContainer.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <p>No transactions yet</p>
                <small>Your transaction history will appear here</small>
            </div>
        `;
        return;
    }
    
    const typeFilter = document.getElementById('historyTypeFilter');
    const currencyFilter = document.getElementById('historyCurrencyFilter');
    
    const typeFilterValue = typeFilter ? typeFilter.value : 'all';
    const currencyFilterValue = currencyFilter ? currencyFilter.value : 'all';
    
    // Filter transactions
    let filteredTransactions = transferData.transactions;
    
    if (typeFilterValue !== 'all') {
        filteredTransactions = filteredTransactions.filter(function(t) {
            return t.type === typeFilterValue;
        });
    }
    
    if (currencyFilterValue !== 'all') {
        filteredTransactions = filteredTransactions.filter(function(t) {
            return t.currency.toLowerCase() === currencyFilterValue.toLowerCase();
        });
    }
    
    if (filteredTransactions.length === 0) {
        historyContainer.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-filter"></i>
                <p>No transactions match your filters</p>
                <small>Try changing your filter settings</small>
            </div>
        `;
        return;
    }
    
    // Generate table
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Details</th>
                    <th>Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;
    
    filteredTransactions.forEach(function(tx) {
        const date = new Date(tx.createdAt);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let details = tx.note || 'Transaction';
        if (tx.bankDetails) {
            details = tx.bankDetails.bankName + ' (****' + tx.bankDetails.lastFour + ')';
        } else if (tx.recipient) {
            details = 'To: ' + tx.recipient.substring(0, 10) + '...';
        }
        
        const shortDetails = details.length > 30 ? details.substring(0, 30) + '...' : details;
        
        tableHTML += `
            <tr>
                <td>
                    <span class="transaction-type ${tx.type}">
                        <i class="fas fa-${getTransactionIcon(tx.type)}"></i>
                        ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                    </span>
                </td>
                <td>${tx.amount.toFixed(tx.currency === 'USD' ? 2 : 4)}</td>
                <td>${tx.currency}</td>
                <td title="${details}">${shortDetails}</td>
                <td>
                    <div>${formattedDate}</div>
                    <small>${formattedTime}</small>
                </td>
                <td>
                    <span class="status-badge ${tx.status}">
                        ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                </td>
            </tr>`;
    });
    
    tableHTML += `
            </tbody>
        </table>`;
    
    historyContainer.innerHTML = '<div class="history-table-container">' + tableHTML + '</div>';
}

// Get transaction icon
function getTransactionIcon(type) {
    switch(type) {
        case 'transfer': return 'paper-plane';
        case 'withdrawal': return 'university';
        case 'purchase': return 'shopping-cart';
        case 'sale': return 'money-bill-wave';
        default: return 'exchange-alt';
    }
}

// Filter history
function filterHistory() {
    loadTransactionHistory();
}

// Refresh history
function refreshHistory() {
    loadTransactionHistory();
}

// Close modals
function closeTransferModal() {
    const modal = document.getElementById('transferModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    const confirmBtn = document.getElementById('confirmTransferBtn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirm Transfer';
        confirmBtn.disabled = false;
    }
}

function closeWithdrawalModal() {
    const modal = document.getElementById('withdrawalModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
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

// Make functions globally available for onclick attributes
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