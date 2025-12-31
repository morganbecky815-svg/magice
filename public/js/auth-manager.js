// auth-manager.js - Simple authentication manager
// Add this ONE file and it handles ALL auth logic

const AuthManager = {
    // Check if user is logged in
    isLoggedIn() {
        const user = localStorage.getItem('magicEdenCurrentUser');
        console.log("🔐 AuthManager.isLoggedIn() checking:", user);
        return !!user;
    },

    // Get current user email
    getCurrentUser() {
        return localStorage.getItem('magicEdenCurrentUser') || '';
    },

    // Login function
    login(email, token = null) {
        console.log("🔐 AuthManager.login() called with:", email);
        
        // Save to localStorage
        localStorage.setItem('magicEdenCurrentUser', email);
        if (token) {
            localStorage.setItem('authToken', token);
        }
        localStorage.setItem('lastLogin', Date.now().toString());
        
        console.log("✅ User logged in:", email);
        console.log("Current localStorage:", Object.keys(localStorage));
        
        // Dispatch event so other scripts know user logged in
        document.dispatchEvent(new CustomEvent('authChange', { 
            detail: { loggedIn: true, email } 
        }));
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
        console.log("🛡️ protectPage() called for:", window.location.pathname);
        
        if (!this.isLoggedIn()) {
            console.log('🔒 Page protected - user not logged in');
            
            // ⭐ ONLY save redirect if we're NOT already going to login
            // This prevents redirect loops
            if (!window.location.pathname.includes('/login')) {
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                console.log("Saved redirect:", window.location.pathname);
            }
            
            window.location.href = redirectTo;
            return false;
        }
        
        console.log("✅ Access granted");
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
    }
};

// Make it globally available
window.AuthManager = AuthManager;
// DO NOT auto-initialize - let each page call it if needed