// login.js - Complete updated file

async function handleLogin(event) {
    event.preventDefault();
  
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const messageEl = document.getElementById('loginMessage');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
  
    if (!emailInput || !passwordInput || !messageEl || !loginButton) return;
  
    // Reset messages
    messageEl.className = 'login-message';
    messageEl.textContent = '';
    messageEl.style.display = 'none';
  
    const email = emailInput.value.trim();
    const password = passwordInput.value;
  
    if (!email || !password) {
        showLoginError('Please enter both email and password');
        return;
    }
  
    // Disable submit button
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
  
        const result = await response.json();
  
        if (!response.ok || !result.success) {
            const errorMsg = result.error || result.message || `Login failed (HTTP ${response.status})`;
            showLoginError(errorMsg);
            passwordInput.value = '';
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  
            // Shake form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.classList.add('shake');
                setTimeout(() => loginForm.classList.remove('shake'), 500);
            }
            return;
        }
  
        // ✅ SAVE ALL THREE KEYS
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('magicEdenCurrentUser', result.user.email);
        
        console.log('✅ Login successful - Data saved:');
        console.log('   Token:', result.token ? '✓' : '✗');
        console.log('   User object:', result.user);
        console.log('   Wallet address:', result.user.systemWalletAddress);
        console.log('   Email:', result.user.email);
  
        // Show appropriate success message
        if (result.user && result.user.isAdmin) {
            showLoginSuccess('Admin login successful! Redirecting to admin panel...');
        } else {
            showLoginSuccess('Login successful! Redirecting to dashboard...');
        }
        
        document.querySelectorAll('#loginForm input, #loginForm button').forEach(el => el.disabled = true);
  
        // ✅ REDIRECT BASED ON USER TYPE
        setTimeout(() => {
            if (result.user && result.user.isAdmin) {
                console.log('🛡️ Admin detected, redirecting to admin panel');
                window.location.href = '/admin.html';
            } else {
                console.log('👤 Regular user, redirecting to dashboard');
                window.location.href = '/dashboard';
            }
        }, 1500);
  
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('An error occurred. Please try again.');
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}
  
// Show login error message
function showLoginError(message) {
    const messageEl = document.getElementById('loginMessage');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = 'login-message error';
    messageEl.style.display = 'block';
    
    // Shake animation
    messageEl.classList.add('shake');
    setTimeout(() => messageEl.classList.remove('shake'), 500);
}
  
// Show login success message
function showLoginSuccess(message) {
    const messageEl = document.getElementById('loginMessage');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = 'login-message success';
    messageEl.style.display = 'block';
}
  
// Forgot password modal functions
function showForgotPassword() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'block';
    }
    return false;
}
  
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
  
function sendPasswordReset() {
    const emailInput = document.getElementById('resetEmail');
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    if (!email) {
        alert('Please enter your email address');
        return;
    }
    
    alert('Password reset link would be sent to: ' + email + '\n\n(Backend integration required)');
    closeModal('forgotPasswordModal');
}
  
// Initialize login form when page loads
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Remove any existing listeners and attach fresh one
        const newForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newForm, loginForm);
        newForm.addEventListener('submit', handleLogin);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const forgotModal = document.getElementById('forgotPasswordModal');
        if (event.target === forgotModal) {
            closeModal('forgotPasswordModal');
        }
    });
});