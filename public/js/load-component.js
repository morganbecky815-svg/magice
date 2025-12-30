// load-components.js - Updated with built-in auth
let componentsLoaded = false;

// Simple auth functions built-in
const Auth = {
    isLoggedIn() {
        return !!localStorage.getItem('magicEdenCurrentUser');
    },
    
    getCurrentUser() {
        return localStorage.getItem('magicEdenCurrentUser') || '';
    },
    
    login(email, token) {
        localStorage.setItem('magicEdenCurrentUser', email);
        if (token) localStorage.setItem('authToken', token);
    },
    
    logout() {
        localStorage.removeItem('magicEdenCurrentUser');
        localStorage.removeItem('authToken');
    },
    
    updateHeader() {
        const userEmail = this.getCurrentUser();
        const guestButtons = document.getElementById('guestButtons');
        const userInfo = document.getElementById('userInfo');
        
        if (!guestButtons || !userInfo) return;
        
        if (userEmail) {
            guestButtons.style.display = 'none';
            const displayName = userEmail.split('@')[0];
            userInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle" style="font-size: 20px; color: #8a2be2;"></i>
                    <span>${displayName}</span>
                    <button onclick="Auth.logoutAndRedirect()" style="margin-left: 10px; padding: 5px 10px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Logout
                    </button>
                </div>
            `;
            userInfo.style.display = 'flex';
        } else {
            guestButtons.style.display = 'flex';
            userInfo.style.display = 'none';
        }
    },
    
    logoutAndRedirect() {
        if (confirm('Logout?')) {
            this.logout();
            this.updateHeader();
            window.location.href = '/';
        }
    }
};

// Make auth globally available
window.Auth = Auth;

// Load header and footer
async function loadAllComponents() {
    if (componentsLoaded) return;
    
    // ... your existing header HTML ...
    const headerHTML = `...`;
    
    // ... your existing footer HTML ...
    const footerHTML = `...`;
    
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);
    
    // Update auth display
    Auth.updateHeader();
    
    componentsLoaded = true;
    console.log('✅ Components loaded');
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllComponents);
} else {
    loadAllComponents();
}