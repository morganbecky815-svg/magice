// auth-manager.js - Simple authentication manager
// Add this ONE file and it handles ALL auth logic

const AuthManager = {
    // Check if user is logged in (user + token required)
    isLoggedIn() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        console.log("🔐 AuthManager.isLoggedIn()", {
            user: user ? "exists" : "not found",
            hasToken: !!token,
            tokenKey: 'token' // changed from 'authToken'
        });

        return !!(user && token);
    },

    // Get current user object (not just email)
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error("Error parsing user data:", error);
            return null;
        }
    },

    // Get user email
    getUserEmail() {
        const user = this.getCurrentUser();
        return user ? user.email : '';
    },

    // Login function - matches your app.js login
    login(email, token = null, userData = null) {
        console.log("🔐 AuthManager.login() called with:", email);
        
        // Save to localStorage - match your app.js format
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        }
        
        localStorage.setItem('magicEdenCurrentUser', email);
        
        if (token) {
            localStorage.setItem('token', token); // Changed from 'authToken'
        }
        
        localStorage.setItem('lastLogin', Date.now().toString());
        
        console.log("✅ User logged in:", email);
        console.log("Current localStorage:", Object.keys(localStorage));
        
        // Dispatch event so other scripts know user logged in
        document.dispatchEvent(new CustomEvent('authChange', { 
            detail: { loggedIn: true, email, user: userData } 
        }));
        
        return true;
    },

    // Logout function - matches your app.js logout
    logout() {
        const wasLoggedIn = this.isLoggedIn();
        const oldEmail = this.getUserEmail();
        
        // Remove ALL auth-related items
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Changed from 'authToken'
        localStorage.removeItem('magicEdenCurrentUser');
        localStorage.removeItem('lastLogin');
        
        if (wasLoggedIn) {
            document.dispatchEvent(new CustomEvent('authChange', { 
                detail: { loggedIn: false, email: oldEmail } 
            }));
            console.log('✅ User logged out:', oldEmail);
        }
        
        return wasLoggedIn;
    },

    // Protect a page - FIXED VERSION
    protectPage(redirectTo = '/login') {
        console.log("🛡️ protectPage() called for:", window.location.pathname);
        
        // Check if we're already on the login page to avoid redirect loops
        if (window.location.pathname.includes('/login')) {
            console.log("Already on login page, skipping protection check");
            return true;
        }
        
        if (!this.isLoggedIn()) {
            console.log('🔒 Page protected - user not logged in');
            
            // Save where user wanted to go
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            console.log("Saved redirect to:", window.location.pathname);
            
            // Redirect to login
            window.location.href = redirectTo;
            return false;
        }
        
        console.log("✅ Access granted to:", this.getUserEmail());
        return true;
    },

    // Update header/auth UI
    updateAuthUI() {
        const user = this.getCurrentUser();
        const guestButtons = document.getElementById('guestButtons');
        const userInfo = document.getElementById('userInfo');
        
        if (!guestButtons || !userInfo) return;
        
        if (user) {
            // User is logged in
            guestButtons.style.display = 'none';
            
            const displayName = user.fullName || user.email.split('@')[0];
            const userInitial = displayName.charAt(0).toUpperCase();
            
            userInfo.innerHTML = `
                <div class="user-info" style="display: flex; align-items: center; gap: 10px;">
                    <div style="
                        width: 32px; 
                        height: 32px; 
                        border-radius: 50%; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 14px;
                    ">
                        ${userInitial}
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; font-size: 14px;">${displayName}</span>
                        <span style="font-size: 12px; color: #666; margin-top: -2px;">
                            ${user.balance || 0} ETH
                        </span>
                    </div>
                    <button onclick="AuthManager.logoutAndRedirect()" class="btn-small" 
                            style="margin-left: 10px; padding: 4px 12px; font-size: 12px;">
                        Logout
                    </button>
                </div>
            `;
            userInfo.style.display = 'flex';
        } else {
            // User is not logged in
            guestButtons.style.display = 'flex';
            userInfo.style.display = 'none';
        }
    },

    // Logout and redirect
    logoutAndRedirect() {
        if (confirm('Are you sure you want to logout?')) {
            this.logout();
            window.location.href = '/';
        }
    },

    // Initialize - call this on every page
    init() {
        console.log('🔐 Auth Manager initialized');
        
        // Update UI
        this.updateAuthUI();
        
        // Listen for auth changes
        document.addEventListener('authChange', (event) => {
            console.log('Auth changed:', event.detail);
            this.updateAuthUI();
        });
        
        // Auto-redirect if coming from login
        this.handleLoginRedirect();
    },

    // Handle redirect after login
    handleLoginRedirect() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl && this.isLoggedIn()) {
            console.log('🔄 Redirecting to saved URL:', redirectUrl);
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Small delay to ensure page is ready
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 100);
        }
    },

    // Save user data (for when user updates profile)
    saveUser(userData) {
        try {
            const currentUser = this.getCurrentUser();
            const updatedUser = { ...currentUser, ...userData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('💾 User data saved:', updatedUser.email);
            
            // Notify of update
            document.dispatchEvent(new CustomEvent('userUpdated', { 
                detail: { user: updatedUser } 
            }));
            
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    }
};

// Make it globally available
window.AuthManager = AuthManager;

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    AuthManager.init();
});