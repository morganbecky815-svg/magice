// login.js - Complete updated file with password reveal functionality

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

// ============================================
// PASSWORD REVEAL FUNCTIONALITY - FIXED POSITIONING
// ============================================

// Toggle password visibility
function togglePasswordVisibility(inputId, iconElement) {
    const passwordInput = document.getElementById(inputId);
    if (!passwordInput) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    }
    
    // Keep focus on input field
    passwordInput.focus();
}

// Initialize password toggle icons
function initPasswordToggles() {
    // Add eye icons to password fields
    const passwordFields = [
        { id: 'loginPassword', container: '.form-group' }
    ];
    
    passwordFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (!input) return;
        
        // Get the parent container
        const container = input.closest('.form-group');
        if (!container) return;
        
        // Check if toggle already exists
        if (container.querySelector('.password-toggle')) return;
        
        // Create wrapper div if needed
        let inputWrapper = container.querySelector('.password-input-wrapper');
        if (!inputWrapper) {
            // Wrap the input in a div for better positioning
            inputWrapper = document.createElement('div');
            inputWrapper.className = 'password-input-wrapper';
            inputWrapper.style.cssText = `
                position: relative;
                width: 100%;
            `;
            
            // Replace input with wrapper containing input
            input.parentNode.insertBefore(inputWrapper, input);
            inputWrapper.appendChild(input);
        }
        
        // Create toggle icon
        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'fas fa-eye password-toggle';
        toggleIcon.setAttribute('onclick', `togglePasswordVisibility('${field.id}', this)`);
        toggleIcon.style.cssText = `
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #888;
            z-index: 10;
            font-size: 18px;
            transition: color 0.3s ease;
            pointer-events: auto;
            background: transparent;
            padding: 5px;
        `;
        
        inputWrapper.appendChild(toggleIcon);
        
        // Add hover effect
        toggleIcon.addEventListener('mouseenter', () => {
            toggleIcon.style.color = '#8a2be2';
        });
        
        toggleIcon.addEventListener('mouseleave', () => {
            toggleIcon.style.color = '#888';
        });
        
        // Ensure input has right padding
        input.style.paddingRight = '45px';
    });
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

// Add CSS for password toggle
function addPasswordToggleStyles() {
    if (document.getElementById('password-toggle-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'password-toggle-styles';
    style.textContent = `
        .form-group {
            position: relative;
            margin-bottom: 20px;
        }
        
        .password-input-wrapper {
            position: relative;
            width: 100%;
        }
        
        .password-toggle {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #888;
            z-index: 10;
            font-size: 18px;
            transition: color 0.3s ease;
            background: transparent;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .password-toggle:hover {
            color: #8a2be2;
        }
        
        /* Adjust input padding to make room for icon */
        input[type="password"],
        input[type="text"] {
            padding-right: 45px !important;
            width: 100%;
            box-sizing: border-box;
        }
        
        /* Ensure the wrapper doesn't overflow */
        .password-input-wrapper input {
            width: 100%;
        }
    `;
    document.head.appendChild(style);
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
    
    // Initialize password toggle functionality
    addPasswordToggleStyles();
    
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
        initPasswordToggles();
    }, 100);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const forgotModal = document.getElementById('forgotPasswordModal');
        if (event.target === forgotModal) {
            closeModal('forgotPasswordModal');
        }
    });
});

// Make toggle function globally available
window.togglePasswordVisibility = togglePasswordVisibility;