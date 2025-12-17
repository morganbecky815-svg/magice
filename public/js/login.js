// login.js - Login Page Specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    
    // Setup tab buttons
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');
    
    // Make sure Register button redirects to register.html
    if (registerTabBtn) {
        console.log('Register button found, adding click handler');
        
        // Remove any existing onclick
        registerTabBtn.onclick = null;
        
        // Add new click handler to redirect
        registerTabBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Register button clicked, redirecting to register.html');
            window.location.href = 'register.html';
        });
        
        // Also set href attribute as backup
        registerTabBtn.setAttribute('onclick', "window.location.href='register.html'; return false;");
    }
    
    // Login tab functionality
    if (loginTabBtn) {
        loginTabBtn.classList.add('active');
        
        loginTabBtn.addEventListener('click', function() {
            // Already on login page, just update active state
            loginTabBtn.classList.add('active');
            if (registerTabBtn) registerTabBtn.classList.remove('active');
        });
    }
    
    // Check URL for registration success message
    const urlParams = new URLSearchParams(window.location.search);
    const registered = urlParams.get('registered');
    const email = urlParams.get('email');
    
    if (registered === 'true') {
        const messageEl = document.getElementById('loginMessage');
        if (messageEl) {
            messageEl.textContent = '✅ Registration successful! Please login.';
            messageEl.className = 'login-message success';
        }
    }
    
    // Auto-fill email if provided in URL
    if (email) {
        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) {
            loginEmail.value = decodeURIComponent(email);
            loginEmail.focus();
        }
    }
    
    // Auto-focus on email field
    setTimeout(() => {
        const emailField = document.getElementById('loginEmail');
        if (emailField && !emailField.value) {
            emailField.focus();
        }
    }, 100);
});

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');
    
    if (!messageEl) {
        console.error('Message element not found');
        return false;
    }
    
    // Basic validation
    if (!email || !password) {
        messageEl.textContent = 'Please enter both email and password';
        messageEl.className = 'login-message error';
        return false;
    }
    
    console.log('Attempting login for:', email);
    
    const result = db.loginUser(email, password);
    
    if (result.success) {
        // Store session
        localStorage.setItem('magicEdenCurrentUser', email);
        
        // Show success message
        messageEl.textContent = 'Login successful! Redirecting...';
        messageEl.className = 'login-message success';
        
        // Disable form during redirect
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.querySelector('button[type="submit"]').disabled = true;
        }
        
        console.log('Login successful, redirecting to index.html');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        messageEl.textContent = result.message;
        messageEl.className = 'login-message error';
        console.log('Login failed:', result.message);
    }
    
    return false;
}

// Forgot password functions
function showForgotPassword() {
    document.getElementById('forgotPasswordModal').style.display = 'flex';
    return false;
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function sendPasswordReset() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    const result = db.requestPasswordReset(email);
    
    if (result.success) {
        alert(Password reset link sent to ${email});
        closeModal('forgotPasswordModal');
    } else {
        alert(result.message);
    }
}

// Make functions globally available
window.handleLogin = handleLogin;
window.showForgotPassword = showForgotPassword;
window.closeModal = closeModal;
window.sendPasswordReset = sendPasswordReset;

// Debug helper
console.log('login.js loaded successfully');
// login.js - Login with Authentication

document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    
    // Setup tab buttons
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');
    
    // Register button redirects to register.html
    if (registerTabBtn) {
        registerTabBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'register.html';
        });
    }
    
    // Login tab is already active
    if (loginTabBtn) {
        loginTabBtn.classList.add('active');
    }
    
    // Check if user came from registration
    const urlParams = new URLSearchParams(window.location.search);
    const registered = urlParams.get('registered');
    const email = urlParams.get('email');
    
    if (registered === 'true') {
        const messageEl = document.getElementById('loginMessage');
        if (messageEl) {
            messageEl.textContent = '✅ Registration successful! Please login.';
            messageEl.className = 'login-message success';
        }
    }
    
    // Auto-fill email if provided
    if (email) {
        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) {
            loginEmail.value = decodeURIComponent(email);
        }
    }
    
    // Auto-focus on email field
    setTimeout(() => {
        const emailField = document.getElementById('loginEmail');
        if (emailField && !emailField.value) {
            emailField.focus();
        }
    }, 100);
});

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    console.log('Login form submitted');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    
    if (!messageEl) {
        console.error('Message element not found');
        return false;
    }
    
    // Reset message
    messageEl.className = 'login-message';
    messageEl.textContent = '';
    messageEl.style.display = 'none';
    
    // Basic validation
    if (!email || !password) {
        showLoginError('Please enter both email and password');
        return false;
    }
    
    // Disable button during login attempt
    if (loginButton) {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    }
    
    console.log('Attempting login for:', email);
    
    try {
        // Attempt login using Database class
        const result = db.loginUser(email, password);
        
        if (result.success) {
            // Store user session
            localStorage.setItem('magicEdenCurrentUser', email);
            
            // Show success message
            showLoginSuccess('Login successful! Redirecting to dashboard...');
            
            // Disable form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.querySelectorAll('input, button').forEach(element => {
                    element.disabled = true;
                });
            }
            
            console.log('Login successful, redirecting to dashboard...');
            
            // Redirect to dashboard after 1 second
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } else {
            // Login failed - show error message
            showLoginError(result.message || 'Incorrect email or password');
            console.log('Login failed:', result.message);
            
            // Clear password field
            document.getElementById('loginPassword').value = '';
            
            // Shake animation for error
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.classList.add('shake');
                setTimeout(() => {
                    loginForm.classList.remove('shake');
                }, 500);
            }
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('An error occurred. Please try again.');
    } finally {
        // Re-enable button
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }
    
    return false;
}

// Show login error
function showLoginError(message) {
    const messageEl = document.getElementById('loginMessage');
    if (!messageEl) return;
    
    messageEl.textContent = ❌ ${message};
    messageEl.className = 'login-message error';
    messageEl.style.display = 'block';
    
    // Scroll to message
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Show login success
function showLoginSuccess(message) {
    const messageEl = document.getElementById('loginMessage');
    if (!messageEl) return;
    
    messageEl.textContent = ✅ ${message};
    messageEl.className = 'login-message success';
    messageEl.style.display = 'block';
}

// Forgot password functions (keep existing)
function showForgotPassword() {
    document.getElementById('forgotPasswordModal').style.display = 'flex';
    return false;
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function sendPasswordReset() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    const result = db.requestPasswordReset(email);
    
    if (result.success) {
        alert(Password reset instructions sent to ${email});
        closeModal('forgotPasswordModal');
    } else {
        alert(result.message);
    }
}

// Make functions globally available
window.handleLogin = handleLogin;
window.showForgotPassword = showForgotPassword;
window.closeModal = closeModal;
window.sendPasswordReset = sendPasswordReset;