// load-components.js - Load common components

let componentsLoaded = false;

async function loadHeader() {
    try {
        console.log('📥 Loading header...');
        
        // Create header HTML with all functionality
        const headerHTML = `
            <header class="header">
                <div class="container">
                    <div class="navbar">
                        <div class="logo" onclick="window.location.href='/'" style="cursor: pointer;">
                            <i class="fas fa-gem"></i>
                            <span>Magic Eden</span>
                        </div>
                        
                        <div class="nav-center">
                            <a href="/" class="nav-link">Explore</a>
                            <a href="/dashboard" class="nav-link">Dashboard</a>
                            <a href="/profile" class="nav-link">Profile</a>
                            <a href="/create-nft" class="nav-link">Create</a>
                        </div>
                        
                        <div class="nav-right">
                            <div class="search-box">
                                <i class="fas fa-search"></i>
                                <input type="text" placeholder="Search NFTs..." id="globalSearch">
                            </div>
                            
                            <div id="authSection">
                                <div id="guestButtons" style="display: flex; gap: 10px; align-items: center;">
                                    <button class="btn" onclick="window.location.href='/register'">
                                        <i class="fas fa-user-plus"></i>
                                        Register
                                    </button>
                                    <button class="btn btn-primary" onclick="window.location.href='/login'">
                                        <i class="fas fa-sign-in-alt"></i>
                                        Login
                                    </button>
                                </div>
                                
                                <div id="userInfo" style="display: none;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
        
        // Insert header at beginning of body
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        
        console.log('✅ Header loaded');
        return true;
    } catch (error) {
        console.error('Error loading header:', error);
        return false;
    }
}

async function loadFooter() {
    try {
        console.log('📥 Loading footer...');
        
        // Create footer HTML
        const footerHTML = `
            <footer class="footer">
                <div class="container">
                    <div class="footer-content">
                        <div class="footer-section">
                            <div class="logo">
                                <i class="fas fa-gem"></i>
                                <span>Magic Eden</span>
                            </div>
                            <p>© 2024 Magic Eden. All rights reserved.</p>
                        </div>
                        <div class="footer-section">
                            <a href="/"><i class="fas fa-store"></i> Marketplace</a>
                            <a href="/dashboard"><i class="fas fa-dashboard"></i> Dashboard</a>
                            <a href="/profile"><i class="fas fa-user"></i> Profile</a>
                            <a href="#" onclick="showSupportModal()"><i class="fas fa-headset"></i> Support</a>
                            <a href="/admin" id="adminLink" style="display:none"><i class="fas fa-cog"></i> Admin</a>
                        </div>
                    </div>
                </div>
            </footer>
        `;
        
        // Insert footer at end of body
        document.body.insertAdjacentHTML('beforeend', footerHTML);
        
        console.log('✅ Footer loaded');
        return true;
    } catch (error) {
        console.error('Error loading footer:', error);
        return false;
    }
}

// Update header based on login status
function updateHeaderAuth() {
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    const guestButtons = document.getElementById('guestButtons');
    const userInfo = document.getElementById('userInfo');
    const adminLink = document.getElementById('adminLink');
    
    if (!guestButtons || !userInfo) {
        console.log('⚠ Header elements not found yet');
        return;
    }
    
    if (userEmail) {
        // User is logged in
        console.log('👤 User is logged in:', userEmail);
        
        // Hide guest buttons
        guestButtons.style.display = 'none';
        
        // Get user data
        let balance = 0;
        let displayName = userEmail.split('@')[0];
        
        if (typeof db !== 'undefined') {
            const user = db.getUser(userEmail);
            if (user) {
                balance = user.balance || 0;
                displayName = user.fullName || displayName;
                
                // Show admin link if user is admin
                if (adminLink && user.isAdmin) {
                    adminLink.style.display = 'block';
                }
            }
        }
        
        // Show user info
        userInfo.innerHTML = `
            <div class="user-info" style="display: flex; align-items: center; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle" style="font-size: 24px; color: #8a2be2;"></i>
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: #8a2be2; font-weight: 600; font-size: 14px;">${displayName}</span>
                        <small style="color: #666; font-size: 12px;">${balance} WETH</small>
                    </div>
                </div>
                <button class="btn" onclick="logout()" style="padding: 8px 15px; font-size: 14px;">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
        userInfo.style.display = 'flex';
        userInfo.style.alignItems = 'center';
        
    } else {
        // User is not logged in
        console.log('👥 User is not logged in');
        
        // Show guest buttons
        guestButtons.style.display = 'flex';
        userInfo.style.display = 'none';
        
        // Hide admin link
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}

// Global logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🚪 Logging out...');
        localStorage.removeItem('magicEdenCurrentUser');
        
        // If on protected page, redirect to home
        const currentPage = window.location.pathname.split('/').pop();
        const protectedPages = ['/dashboard', '/profile', '/admin'];
        
        if (protectedPages.includes(currentPage)) {
            window.location.href = '/';
        } else {
            // Just reload to update header
            window.location.reload();
        }
    }
}

// Load all components
async function loadAllComponents() {
    if (componentsLoaded) return;
    
    console.log('🔄 Loading website components...');
    
    // Load header
    await loadHeader();
    
    // Load footer
    await loadFooter();
    
    // Update auth status
    updateHeaderAuth();
    
    // Also check every 2 seconds for auth changes
    setInterval(updateHeaderAuth, 2000);
    
    componentsLoaded = true;
    console.log('✅ All components loaded');
    
    // Dispatch event that components are loaded
    document.dispatchEvent(new Event('componentsLoaded'));
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllComponents);
} else {
    loadAllComponents();
}

// Make functions available globally
window.updateHeaderAuth = updateHeaderAuth;
window.logout = logout;
window.loadAllComponents = loadAllComponents;