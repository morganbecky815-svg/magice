// auth-manager.js - Simple authentication manager
// Add this ONE file and it handles ALL auth logic

const AuthManager = {
    // Check if user is logged in
    isLoggedIn() {
        return !!localStorage.getItem('magicEdenCurrentUser');
    },

    // Get current user email
    getCurrentUser() {
        return localStorage.getItem('magicEdenCurrentUser') || '';
    },

    // Login function
    login(email, token = null) {
        localStorage.setItem('magicEdenCurrentUser', email);
        if (token) {
            localStorage.setItem('authToken', token);
        }
        localStorage.setItem('lastLogin', Date.now().toString());
        
        // Dispatch event so other scripts know user logged in
        document.dispatchEvent(new CustomEvent('authChange', { 
            detail: { loggedIn: true, email } 
        }));
        
        console.log('✅ User logged in:', email);
    },

    // Logout function
    logout() {
        const wasLoggedIn = this.isLoggedIn();
        const oldEmail = this.getCurrentUser();
        
        localStorage.removeItem('magicEdenCurrentUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('lastLogin');
        
        if (wasLoggedIn) {
            document.dispatchEvent(new CustomEvent('authChange', { 
                detail: { loggedIn: false, email: oldEmail } 
            }));
            console.log('✅ User logged out:', oldEmail);
        }
        
        return wasLoggedIn;
    },

    // Protect a page - call this at top of protected pages
    protectPage(redirectTo = '/login') {
        if (!this.isLoggedIn()) {
            console.log('🔒 Page protected - user not logged in');
            // Save where they wanted to go
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            // Redirect to login
            window.location.href = redirectTo;
            return false;
        }
        return true;
    },

    // Update header/auth UI
    updateAuthUI() {
        const userEmail = this.getCurrentUser();
        const guestButtons = document.getElementById('guestButtons');
        const userInfo = document.getElementById('userInfo');
        
        if (!guestButtons || !userInfo) return;
        
        if (userEmail) {
            // User is logged in
            guestButtons.style.display = 'none';
            
            const displayName = userEmail.split('@')[0];
            
            userInfo.innerHTML = `
                <div class="user-info" style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle" style="font-size: 20px; color: #8a2be2;"></i>
                    <span style="font-weight: 600;">${displayName}</span>
                    <button onclick="AuthManager.logoutAndRedirect()" class="btn-small" 
                            style="margin-left: 10px; padding: 4px 8px; font-size: 12px;">
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
        
        // Auto-update UI every few seconds (optional)
        setInterval(() => this.updateAuthUI(), 5000);
    }
};

// Make it globally available
window.AuthManager = AuthManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthManager.init());
} else {
    AuthManager.init();
}