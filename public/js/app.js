// ============================================
// MAGIC EDEN NFT MARKETPLACE - CORE APP
// COMPLETELY REWRITTEN WITH WORKING AUTHENTICATION
// ============================================

console.log('🚀 Magic Eden Marketplace Initializing...');

// =====================
// DATABASE CLASS
// =====================
class Database {
    constructor() {
        console.log('🔧 Database initializing...');
        this.init();
    }
    
    init() {
        // Initialize default data if empty
        console.log('📦 Initializing storage...');
        
        // Initialize users (with default admin)
        this.initStorage('magicEdenUsers', []);
        
        // Initialize NFTs with default data
        this.initStorage('magicEdenNFTs', this.getDefaultNFTs());
        
        // Initialize support tickets
        this.initStorage('magicEdenSupportTickets', []);
        
        // Create default admin user if no users exist
        const users = this.getUsers();
        if (users.length === 0) {
            console.log('👑 Creating default admin user...');
            this.createDefaultAdmin();
        }
        
        console.log('✅ Database initialized successfully');
        console.log('Total users:', this.getUsers().length);
        console.log('Total NFTs:', this.getNFTs().length);
    }
    
    initStorage(key, defaultValue) {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(defaultValue));
            console.log(`📝 Created ${key} with default data`);
        }
    }
    
    getDefaultNFTs()
     {
        return [
            {
                id: 1,
                name: "Cosmic Explorer #1",
                collection: "Space Voyagers",
                price: 0.45,
                category: "art",
                image: "🌌",
                owner: "admin@magiceden.com",
                createdAt: new Date().toISOString(),
                tokenId: "ME001"
            },
            {
                id: 2,
                name: "Pixel Punk #123",
                collection: "Crypto Punks",
                price: 1.25,
                category: "pfp",
                image: "👨‍🎤",
                owner: "admin@magiceden.com",
                createdAt: new Date().toISOString(),
                tokenId: "ME002"
            },
            {
                id: 3,
                name: "Dragon Warrior",
                collection: "Game Legends",
                price: 0.89,
                category: "gaming",
                image: "🐉",
                owner: "admin@magiceden.com",
                createdAt: new Date().toISOString(),
                tokenId: "ME003"
            },
            {
                id: 4,
                name: "Digital Dreamscape",
                collection: "Abstract Art",
                price: 0.75,
                category: "art",
                image: "🎨",
                owner: "admin@magiceden.com",
                createdAt: new Date().toISOString(),
                tokenId: "ME004"
            },
            {
                id: 5,
                name: "Crypto Cat #42",
                collection: "Crypto Cats",
                price: 0.55,
                category: "pfp",
                image: "🐱",
                owner: "admin@magiceden.com",
                createdAt: new Date().toISOString(),
                tokenId: "ME005"
            }
        ];
    }
    
    createDefaultAdmin()
     {
        const adminUser = {
            id: 1,
            email: "admin@magiceden.com",
            password: "admin123",
            balance: 1000,
            ethBalance: 5.0,
            wethBalance: 100,
            fullName: "Admin User",
            isAdmin: true,
            isVerified: true,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            lastActivity: []
        };
        
        const users = this.getUsers();
        users.push(adminUser);
        localStorage.setItem('magicEdenUsers', JSON.stringify(users));
        console.log('✅ Default admin created:', adminUser.email);
    }
    
    // ========== VALIDATION METHODS ==========
    validateEmail(email) 
    {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }
    
    validatePassword(password) 
    {
        // At least 6 characters
        return password && typeof password === 'string' && password.length >= 6;
    }
    
    // ========== USER REGISTRATION ==========
    registerUser(email, password)
     {
        console.log('📝 Attempting to register user:', email);
        
        // Validate email
        if (!this.validateEmail(email)) {
            console.log('❌ Invalid email format');
            return { 
                success: false, 
                message: "Please enter a valid email address" 
            };
        }
        
        // Validate password
        if (!this.validatePassword(password)) {
            console.log('❌ Password too short');
            return { 
                success: false, 
                message: "Password must be at least 6 characters" 
            };
        }
        
        const users = this.getUsers();
        const normalizedEmail = email.toLowerCase().trim();
        
        // Check if user already exists
        const existingUser = users.find(u => u.email === normalizedEmail);
        if (existingUser) {
            console.log('❌ User already exists:', normalizedEmail);
            return { 
                success: false, 
                message: "Email already registered. Please login instead." 
            };
        }
        
        // Create new user with ZERO balance
        const newUser = {
            id: Date.now(),
            email: normalizedEmail,
            password: password, // In production, hash this!
            balance: 0,
            ethBalance: 0,
            wethBalance: 0,
            fullName: "",
            isAdmin: false,
            isVerified: true,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            lastActivity: []
        };
        
        console.log('👤 Creating new user:', { ...newUser, password: '*' });
        
        users.push(newUser);
        localStorage.setItem('magicEdenUsers', JSON.stringify(users));
        
        console.log('✅ User registered successfully');
        console.log('Total users now:', users.length);
        
        // Create user session without password
        const userSession = {
            id: newUser.id,
            email: newUser.email,
            balance: newUser.balance,
            ethBalance: newUser.ethBalance,
            wethBalance: newUser.wethBalance,
            fullName: newUser.fullName,
            isAdmin: newUser.isAdmin,
            isVerified: newUser.isVerified,
            createdAt: newUser.createdAt
        };
        
        return { 
            success: true, 
            user: userSession,
            message: "Registration successful! You can now login."
        };
    }
    
    // ========== USER LOGIN ==========
    loginUser(email, password)
     {
        console.log('🔐 Attempting login for:', email);
        
        if (!email || !password) {
            return { 
                success: false, 
                message: "Please enter both email and password" 
            };
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        const users = this.getUsers();
        
        // Find user by email
        const user = users.find(u => u.email === normalizedEmail);
        
        if (!user) {
            console.log('❌ User not found:', normalizedEmail);
            return { 
                success: false, 
                message: "Incorrect email or password" 
            };
        }
        
        // Check password
        if (user.password !== password) {
            console.log('❌ Incorrect password for:', normalizedEmail);
            return { 
                success: false, 
                message: "Incorrect email or password" 
            };
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        localStorage.setItem('magicEdenUsers', JSON.stringify(users));
        
        // Create user session object (without password)
        const userSession = {
            id: user.id,
            email: user.email,
            balance: user.balance || 0,
            ethBalance: user.ethBalance || 0,
            wethBalance: user.wethBalance || 0,
            fullName: user.fullName || "",
            isAdmin: user.isAdmin || false,
            isVerified: user.isVerified || false,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        };
        
        console.log('✅ Login successful for:', normalizedEmail);
        
        return { 
            success: true, 
            user: userSession,
            message: "Login successful!"
        };
    }
    
    // ========== GET USER ==========
    getUser(email) 
    {
        if (!email) return null;
        
        const users = this.getUsers();
        const user = users.find(u => u.email === email.toLowerCase());
        
        if (user) {
            // Return user without password
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        return null;
    }
    
    getUsers() 
    {
        try {
            const users = JSON.parse(localStorage.getItem('magicEdenUsers')) || [];
            // Ensure all users have required fields
            return users.map(user => ({
                balance: 0,
                ethBalance: 0,
                wethBalance: 0,
                fullName: "",
                isAdmin: false,
                isVerified: true,
                lastActivity: [],
                ...user
            }));
        } catch (error) {
            console.error('❌ Error getting users:', error);
            return [];
        }
    }
    
    updateUser(email, updates) 
    {
        const users = this.getUsers();
        const index = users.findIndex(u => u.email === email.toLowerCase());
        
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            localStorage.setItem('magicEdenUsers', JSON.stringify(users));
            
            // Return updated user without password
            const { password, ...userWithoutPassword } = users[index];
            return userWithoutPassword;
        }
        return null;
    }
    
    // ========== PASSWORD RESET ==========
    requestPasswordReset(email) 
    {
        const users = this.getUsers();
        const user = users.find(u => u.email === email.toLowerCase());
        
        if (!user) {
            return { success: false, message: "Email not found" };
        }
        
        // In a real app, you'd send an email here
        return { 
            success: true, 
            message: `Password reset email sent to ${email} (demo mode)`
        };
    }
    
    // ========== NFT MANAGEMENT ==========
    getNFTs()
     {
        try {
            return JSON.parse(localStorage.getItem('magicEdenNFTs')) || [];
        } catch (error) {
            console.error('❌ Error getting NFTs:', error);
            return [];
        }
    }
    
    addNFT(nftData)
     {
        const nfts = this.getNFTs();
        const newNFT = {
            id: Date.now(),
            ...nftData,
            createdAt: new Date().toISOString(),
            tokenId: "ME" + Date.now().toString(36).toUpperCase()
        };
        
        nfts.push(newNFT);
        localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
        
        console.log('✅ NFT added:', newNFT.name);
        return newNFT;
    }
    
    updateNFT(id, updates)
     {
        let nfts = this.getNFTs();
        const index = nfts.findIndex(nft => nft.id === id);
        
        if (index !== -1) {
            nfts[index] = { ...nfts[index], ...updates };
            localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
            return nfts[index];
        }
        return null;
    }
    
    removeNFT(id) 
    {
        let nfts = this.getNFTs();
        const initialLength = nfts.length;
        nfts = nfts.filter(nft => nft.id !== id);
        
        if (nfts.length < initialLength) {
            localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
            console.log('✅ NFT removed:', id);
            return true;
        }
        return false;
    }
    
    purchaseNFT(nftId, buyerEmail)
     {
        const nfts = this.getNFTs();
        const users = this.getUsers();
        
        const nftIndex = nfts.findIndex(nft => nft.id === nftId);
        const buyerIndex = users.findIndex(user => user.email === buyerEmail.toLowerCase());
        
        if (nftIndex === -1) {
            return { success: false, message: "NFT not found" };
        }
        
        if (buyerIndex === -1) {
            return { success: false, message: "User not found" };
        }
        
        const nft = nfts[nftIndex];
        const buyer = users[buyerIndex];
        
        // Check balance
        if (buyer.balance < nft.price) {
            return { 
                success: false, 
                message: `Insufficient balance. You have ${buyer.balance} WETH, need ${nft.price} WETH` 
            };
        }
        
        // Transfer ownership
        buyer.balance -= nft.price;
        nfts[nftIndex].owner = buyer.email;
        
        // Update data
        localStorage.setItem('magicEdenUsers', JSON.stringify(users));
        localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
        
        console.log(`✅ NFT purchased: ${nft.name} by ${buyer.email}`);
        
        return { 
            success: true, 
            nft: nfts[nftIndex], 
            buyer: buyer,
            message: `Successfully purchased "${nft.name}"!`
        };
    }
    
    // ========== SUPPORT TICKETS ==========
    addSupportTicket(ticket) 
    {
        const tickets = JSON.parse(localStorage.getItem('magicEdenSupportTickets')) || [];
        const newTicket = {
            id: Date.now(),
            ...ticket,
            status: 'open',
            createdAt: new Date().toISOString()
        };
        
        tickets.push(newTicket);
        localStorage.setItem('magicEdenSupportTickets', JSON.stringify(tickets));
        
        console.log('✅ Support ticket added:', newTicket.id);
        return newTicket;
    }
    
    getSupportTickets() 
    {
        try {
            return JSON.parse(localStorage.getItem('magicEdenSupportTickets')) || [];
        } catch (error) {
            console.error('❌ Error getting support tickets:', error);
            return [];
        }
    }
    
    updateTicketStatus(id, status)
     {
        let tickets = this.getSupportTickets();
        const index = tickets.findIndex(ticket => ticket.id === id);
        
        if (index !== -1) {
            tickets[index].status = status;
            localStorage.setItem('magicEdenSupportTickets', JSON.stringify(tickets));
            return tickets[index];
        }
        return null;
    }
    
    // ========== USER FIX FUNCTION ==========
    fixUserData(email) 
    {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.email === email.toLowerCase());
        
        if (userIndex !== -1) {
            // Ensure all required fields exist
            const user = users[userIndex];
            
            if (user.balance === undefined) user.balance = 0;
            if (user.ethBalance === undefined) user.ethBalance = 0;
            if (user.wethBalance === undefined) user.wethBalance = 0;
            if (user.fullName === undefined) user.fullName = "";
            if (user.isAdmin === undefined) user.isAdmin = false;
            if (user.isVerified === undefined) user.isVerified = true;
            if (user.lastActivity === undefined) user.lastActivity = [];
            
            localStorage.setItem('magicEdenUsers', JSON.stringify(users));
            console.log('✅ Fixed user data for:', email);
            return true;
        }
        console.log('❌ User not found for fix:', email);
        return false;
    }
}

// =====================
// GLOBAL VARIABLES
// =====================
const db = new Database();
let currentUser = null;

// =====================
// AUTHENTICATION MANAGEMENT
// =====================

// Check if user is logged in
function checkAuthStatus() {
    console.log('🔍 Checking auth status...');
    
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    
    if (userEmail) {
        const user = db.getUser(userEmail);
        if (user) {
            currentUser = user;
            console.log('✅ User is logged in:', user.email);
            
            // Fix user data if needed
            db.fixUserData(userEmail);
            
            return {
                isLoggedIn: true,
                user: user
            };
        } else {
            // User not found in database
            console.log('❌ User not found in DB, clearing session');
            localStorage.removeItem('magicEdenCurrentUser');
            currentUser = null;
        }
    }
    
    console.log('🔓 No user logged in');
    return {
        isLoggedIn: false,
        user: null
    };
}

// Login function
function login(email, password) {
    console.log('🔐 Login requested for:', email);
    
    const result = db.loginUser(email, password);
    
    if (result.success) {
        // Store session
        localStorage.setItem('magicEdenCurrentUser', email);
        currentUser = result.user;
        
        console.log('✅ Login successful, user stored in session');
        
        // Fix user data
        db.fixUserData(email);
        
        return {
            success: true,
            user: result.user,
            redirectTo: '/dashboard'
        };
    }
    
    return result;
}

// Register function
function register(email, password, fullName = "") {
    console.log('📝 Registration requested for:', email);
    
    const result = db.registerUser(email, password);
    
    if (result.success && fullName) {
        // Update user with full name
        db.updateUser(email, { fullName: fullName });
        result.user.fullName = fullName;
    }
    
    if (result.success) {
        // Auto-login after registration
        localStorage.setItem('magicEdenCurrentUser', email);
        currentUser = result.user;
        
        console.log('✅ Registration successful, auto-login complete');
        
        return {
            success: true,
            user: result.user,
            redirectTo: '/dashboard'
        };
    }
    
    return result;
}

// Logout function
function logout() {
    console.log('🚪 Logout requested');
    
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    if (userEmail) {
        console.log('👋 Logging out user:', userEmail);
    }
    
    localStorage.removeItem('magicEdenCurrentUser');
    currentUser = null;
    
    // Redirect to home page if on protected page
    const currentPage = window.location.pathname.split('/').pop();
    const protectedPages = ['/dashboard', '/profile', '/admin'];
    
    if (protectedPages.includes(currentPage)) {
        window.location.href = '/';
    } else {
        window.location.reload();
    }
}

// Check if page requires authentication
function requireAuth(redirectTo = '/login') {
    const authStatus = checkAuthStatus();
    
    if (!authStatus.isLoggedIn) {
        console.log('🔒 Authentication required, redirecting to:', redirectTo);
        
        // Add current page as redirect parameter
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage && currentPage !== '') {
            // redirectTo += ?redirect=${currentPage};
            redirectTo += '?redirect=' + currentPage;
        }
        
        window.location.href = redirectTo;
        return null;
    }
    
    return authStatus.user;
}

// =====================
// NFT MARKETPLACE FUNCTIONS
// =====================

// Load all NFTs
function loadNFTs() {
    console.log('🎨 Loading NFTs...');
    
    const nfts = db.getNFTs();
    const grid = document.getElementById('nftGrid');
    
    if (!grid) {
        console.log('⚠ NFT grid not found on this page');
        return;
    }
    
    grid.innerHTML = '';
    
    if (nfts.length === 0) {
        grid.innerHTML = '<div class="empty-state">No NFTs available</div>';
        return;
    }
    
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.innerHTML = `
            <div class="nft-image">
                ${nft.image}
            </div>
            <div class="nft-info">
                <h3 class="nft-name">${nft.name}</h3>
                <p class="nft-collection">${nft.collection}</p>
                <div class="nft-price">
                    <span class="price-value">${nft.price} WETH</span>
                    <button class="buy-btn" onclick="buyNFT(${nft.id})">
                        Buy Now
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    console.log(`✅ Loaded ${nfts.length} NFTs`);
}

// Filter NFTs by category
function filterNFTs(category) {
    console.log(`🔍 Filtering NFTs by category: ${category}`);
    
    const buttons = document.querySelectorAll('.filter-btn');
    if (buttons.length > 0 && event && event.target) {
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
    
    const nfts = db.getNFTs();
    const grid = document.getElementById('nftGrid');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const filtered = category === 'all' 
        ? nfts 
        : nfts.filter(nft => nft.category === category);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state">No NFTs in this category</div>';
        return;
    }
    
    filtered.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.innerHTML = `
            <div class="nft-image">
                ${nft.image}
            </div>
            <div class="nft-info">
                <h3 class="nft-name">${nft.name}</h3>
                <p class="nft-collection">${nft.collection}</p>
                <div class="nft-price">
                    <span class="price-value">${nft.price} WETH</span>
                    <button class="buy-btn" onclick="buyNFT(${nft.id})">
                        Buy Now
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    console.log(`✅ Displaying ${filtered.length} NFTs`);
}

// Buy NFT
function buyNFT(nftId) {
    console.log(`🛒 Attempting to buy NFT ID: ${nftId}`);
    
    const authStatus = checkAuthStatus();
    
    if (!authStatus.isLoggedIn) {
        alert('Please login to buy NFTs');
        window.location.href = 'login?redirect=' + window.location.pathname.split('/').pop();
        return;
    }
    
    const result = db.purchaseNFT(nftId, authStatus.user.email);
    
    if (result.success) {
        console.log(`✅ Purchased NFT: ${result.nft.name}`);
        alert(result.message);
        
        // Refresh displays
        if (typeof loadNFTs === 'function') loadNFTs();
        if (typeof updateStats === 'function') updateStats();
        if (typeof checkAuthStatus === 'function') checkAuthStatus();
        
    } else {
        console.log(`❌ Purchase failed: ${result.message}`);
        alert(result.message);
    }
}

// Update marketplace stats
function updateStats() {
    const nfts = db.getNFTs();
    const users = db.getUsers();
    
    // Calculate total volume
    let totalVolume = 0;
    nfts.forEach(nft => {
        totalVolume += parseFloat(nft.price) || 0;
    });
    
    // Update DOM if elements exist
    if (document.getElementById('totalNFTs')) {
        document.getElementById('totalNFTs').textContent = nfts.length;
    }
    
    if (document.getElementById('totalUsers')) {
        document.getElementById('totalUsers').textContent = users.length;
    }
    
    if (document.getElementById('totalVolume')) {
        document.getElementById('totalVolume').textContent = totalVolume.toFixed(2) + ' WETH';
    }
    
    console.log(`📊 Stats updated: ${nfts.length} NFTs, ${users.length} Users, ${totalVolume.toFixed(2)} Volume`);
}

// =====================
// SUPPORT FUNCTIONS
// =====================

// Show support modal
function showSupportModal() {
    const authStatus = checkAuthStatus();
    
    if (!authStatus.isLoggedIn) {
        alert('Please login to contact support');
        window.location.href = '/login';
        return;
    }
    
    const modal = document.getElementById('supportModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Submit support ticket
function submitSupportTicket() {
    const authStatus = checkAuthStatus();
    
    if (!authStatus.isLoggedIn) {
        alert('Please login to submit a ticket');
        return;
    }
    
    const messageInput = document.getElementById('supportMessage');
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    
    if (!message) {
        alert('Please enter a message');
        return;
    }
    
    const ticket = {
        userEmail: authStatus.user.email,
        message: message
    };
    
    db.addSupportTicket(ticket);
    alert('Support ticket submitted!');
    closeModal('supportModal');
    messageInput.value = '';
}

// =====================
// UTILITY FUNCTIONS
// =====================

// Scroll to NFTs section
function scrollToNFTs() {
    const nftSection = document.querySelector('.nft-grid');
    if (nftSection) {
        nftSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize page based on current location
function initPage() {
    console.log('🚀 Initializing page:', window.location.pathname);
    
    const currentPage = window.location.pathname.split('/').pop();
    
    // Check auth status first
    checkAuthStatus();
    
    // Initialize specific page functions
    switch (currentPage) {
        case '/':
        case '':
            console.log('🏪 Initializing marketplace...');
            if (typeof loadNFTs === 'function') loadNFTs();
            if (typeof updateStats === 'function') updateStats();
            break;
            
        case '/dashboard':
            console.log('📊 Dashboard requires authentication...');
            const user = requireAuth();
            if (user) {
                console.log('✅ User authenticated for dashboard:', user.email);
                // Dashboard.js will handle the rest
            }
            break;
            
        case '/profile':
            console.log('👤 Profile requires authentication...');
            requireAuth();
            break;
            
        case '/admin':
            console.log('👑 Admin requires authentication...');
            requireAuth();
            break;
    }
}

// =====================
// MAKE FUNCTIONS GLOBAL
// =====================
window.db = db;
window.currentUser = currentUser;
window.checkAuthStatus = checkAuthStatus;
window.login = login;
window.register = register;
window.logout = logout;
window.requireAuth = requireAuth;
window.loadNFTs = loadNFTs;
window.filterNFTs = filterNFTs;
window.buyNFT = buyNFT;
window.updateStats = updateStats;
window.showSupportModal = showSupportModal;
window.closeModal = closeModal;
window.submitSupportTicket = submitSupportTicket;
window.scrollToNFTs = scrollToNFTs;
window.initPage = initPage;

// =====================
// INITIALIZATION
// =====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM fully loaded');
        initPage();
    });
} else {
    console.log('⚡ DOM already loaded');
    initPage();
}

console.log('🎉 app.js loaded successfully');