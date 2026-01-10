// navigation.js - Fixed version that allows user routes
function updateNavbarWithUserLinks(userId) {
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (userId && href && ['/dashboard', '/profile'].includes(href)) {
            link.href = `/user/${userId}${href}`;
        }
    });
}

// Check authentication on ALL pages - FIXED VERSION
function checkAuthOnAllPages() {
    console.log('🔍 Checking authentication on page:', window.location.pathname);
    
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    const currentPath = window.location.pathname;
    
    // ✅ DON'T check auth on these pages - INCLUDES USER ROUTES
    const exemptPaths = [
      '/login', 
      '/register', 
      '/',
      '/api/', // All API routes
      '/css/', // CSS files
      '/js/',  // JS files
      '/images/' // Images
    ];
    
    // Check if current path starts with any exempt path
    const isExempt = exemptPaths.some(path => currentPath.startsWith(path));
    
    // ✅ ALSO allow ALL user routes (e.g., /user/123/dashboard)
    const isUserRoute = currentPath.startsWith('/user/');
    
    if (isExempt || isUserRoute) {
        console.log('✅ Page exempt from auth check');
        
        // If already logged in and trying to access login/register, redirect to dashboard
        if (userEmail && (currentPath === '/login' || currentPath === '/register')) {
            console.log('✅ Already logged in, redirecting to dashboard');
            const userId = localStorage.getItem('userId');
            window.location.href = userId ? `/user/${userId}/dashboard` : '/dashboard';
            return false;
        }
        
        return true;
    }
    
    // All other pages require authentication
    if (!userEmail) {
        console.log('❌ Not authenticated, redirecting to login');
        window.location.href = '/login';
        return false;
    }
    
    console.log('✅ Authenticated as:', userEmail);
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
        console.log('👤 Displaying user info for:', userEmail);
        
        if (guestButtons) guestButtons.style.display = 'none';
        
        const userHTML = `
            <div class="user-info" style="display: flex; align-items: center; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle" style="font-size: 24px; color: #8a2be2;"></i>
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: #8a2be2; font-weight: 600; font-size: 14px;">${userEmail.split('@')[0]}</span>
                        <small style="color: #666; font-size: 12px;">User</small>
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
        
        if (adminLink) {
            adminLink.style.display = 'none';
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
        localStorage.removeItem('userId');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
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