// navigation.js - Common navigation functions

// Check authentication on ALL pages
function checkAuthOnAllPages() {
    console.log('🔍 Checking authentication on page:', window.location.pathname);
    
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages that require authentication
    const protectedPages = ['/dashboard', '/profile', '/create-nft', '/admin'];
    
    // Pages that should redirect to dashboard if already logged in
    const loginPages = ['/login', '/register'];
    
    if (protectedPages.includes(currentPage)) {
        // Protected page - need to be logged in
        if (!userEmail) {
            console.log('❌ Not authenticated, redirecting to login');
            window.location.href = '/login';
            return false;
        }
        
        // Check if user exists in database
        const users = db.getUsers();
        const user = users.find(u => u.email === userEmail.toLowerCase());
        
        if (!user) {
            console.log('❌ User not found in DB, clearing session');
            localStorage.removeItem('magicEdenCurrentUser');
            window.location.href = '/login';
            return false;
        }
        
        console.log('✅ Authenticated on protected page:', currentPage);
        return true;
        
    } else if (loginPages.includes(currentPage) && userEmail) {
        // Already logged in, redirect to dashboard
        console.log('✅ Already logged in, redirecting to dashboard');
        window.location.href = '/dashboard';
        return false;
    }
    
    return true;
}

// Update navigation UI based on auth status
function updateNavigationUI() {
    console.log('🎨 Updating navigation UI...');
    
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    const authSection = document.getElementById('authSection');
    const guestButtons = document.getElementById('guestButtons');
    const userInfo = document.getElementById('userInfo');
    const adminLink = document.getElementById('adminLink');
    
    if (!authSection) {
        console.log('⚠ Navigation elements not found on this page');
        return;
    }
    
    if (userEmail) {
        // User is logged in
        const users = db.getUsers();
        const user = users.find(u => u.email === userEmail.toLowerCase());
        
        if (!user) {
            // User not found, clear session
            localStorage.removeItem('magicEdenCurrentUser');
            updateNavigationUI(); // Refresh
            return;
        }
        
        console.log('👤 Displaying user info for:', user.email);
        
        if (guestButtons) guestButtons.style.display = 'none';
        
        const userHTML = `
            <div class="user-info" style="display: flex; align-items: center; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle" style="font-size: 24px; color: #8a2be2;"></i>
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: #8a2be2; font-weight: 600; font-size: 14px;">${user.email.split('@')[0]}</span>
                        <small style="color: #666; font-size: 12px;">${user.balance || 0} WETH</small>
                    </div>
                </div>
                <button class="btn" onclick="logout()" style="padding: 8px 15px; font-size: 14px;">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
        
        if (userInfo) {
            userInfo.innerHTML = userHTML;
            userInfo.style.display = 'flex';
            userInfo.style.alignItems = 'center';
        } else {
            authSection.innerHTML = userHTML;
        }
        
        if (adminLink && user.isAdmin) {
            adminLink.style.display = 'block';
        }
        
    } else {
        // User is not logged in
        console.log('👥 Displaying guest buttons');
        
        if (guestButtons) {
            guestButtons.style.display = 'flex';
        }
        if (userInfo) {
            userInfo.style.display = 'none';
        }
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}

// Enhanced logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🚪 Logging out user');
        localStorage.removeItem('magicEdenCurrentUser');
        
        // Redirect to home page
        window.location.href = '/';
    }
}

// Initialize navigation on page load
function initNavigation() {
    console.log('🚀 Initializing navigation...');
    
    // Check authentication
    checkAuthOnAllPages();
    
    // Update UI
    updateNavigationUI();
    
    // Check every 30 seconds if user is still valid
    setInterval(() => {
        const userEmail = localStorage.getItem('magicEdenCurrentUser');
        if (userEmail) {
            const users = db.getUsers();
            const user = users.find(u => u.email === userEmail.toLowerCase());
            if (!user) {
                console.log('🔄 User session expired, logging out');
                localStorage.removeItem('magicEdenCurrentUser');
                updateNavigationUI();
            }
        }
    }, 30000);
}

// Make functions globally available
window.checkAuthOnAllPages = checkAuthOnAllPages;
window.updateNavigationUI = updateNavigationUI;
window.initNavigation = initNavigation;
window.logout = logout;

// Auto-initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}