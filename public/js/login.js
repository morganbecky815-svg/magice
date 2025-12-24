// login.js - Login Page Specific JavaScript

// Utility functions
function showLoginError(message) {
  const messageEl = document.getElementById('loginMessage');
  if (messageEl) {
    messageEl.textContent = `❌ ${message}`;
    messageEl.className = 'login-message error';
    messageEl.style.display = 'block';
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function showLoginSuccess(message) {
  const messageEl = document.getElementById('loginMessage');
  if (messageEl) {
    messageEl.textContent = `✅ ${message}`;
    messageEl.className = 'login-message success';
    messageEl.style.display = 'block';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Show forgot password modal
function showForgotPassword() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) {
    modal.style.display = 'flex';
  }
  return false;
}

// Handle password reset
async function sendPasswordReset() {
  const email = document.getElementById('resetEmail').value.trim();
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address');
    return;
  }
  // Call backend API for password reset
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    if (response.ok && result.success) {
      alert(`Password reset instructions sent to ${email}`);
      closeModal('forgotPasswordModal');
    } else {
      alert(result.message || 'Failed to send reset link');
    }
  } catch (err) {
    alert('Error sending reset email, please try again.');
  }
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('Login page loaded');

  // Setup tab buttons
  const loginTabBtn = document.getElementById('loginTabBtn');
  const registerTabBtn = document.getElementById('registerTabBtn');

  if (registerTabBtn) {
    registerTabBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '/register';
    });
  }

  if (loginTabBtn) {
    loginTabBtn.classList.add('active');
  }

  // Check URL params for registration success
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

  // Focus email field
  setTimeout(() => {
    const emailField = document.getElementById('loginEmail');
    if (emailField && !emailField.value) {
      emailField.focus();
    }
  }, 100);

  // Attach login form submit handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const messageEl = document.getElementById('loginMessage');
  const loginButton = document.querySelector('#loginForm button[type="submit"]');

  if (!emailInput || !passwordInput || !messageEl) {
    console.error('One or more form elements not found');
    return false;
  }

  // Reset messages
  messageEl.className = 'login-message';
  messageEl.textContent = '';
  messageEl.style.display = 'none';

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginError('Please enter both email and password');
    return false;
  }

  // Disable submit button
  if (loginButton) {
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  }

  console.log('Attempting login for:', email);

  try {
    // Call your backend login API
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();

    if (response.ok && result.success) {
      // Save session info (adjust based on your backend response)
      localStorage.setItem('magicEdenCurrentUser', email);
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }

      // Show success message
      showLoginSuccess('Login successful! Redirecting...');

      // Disable form inputs and button
      document.querySelectorAll('#loginForm input, #loginForm button').forEach(el => {
        el.disabled = true;
      });

      // Redirect after delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } else {
      // Show error message from backend
      showLoginError(result.message || 'Incorrect email or password');
      // Clear password
      passwordInput.value = '';

      // Shake animation (if desired)
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
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  }

  return false;
}

// Make functions globally available if needed
window.handleLogin = handleLogin;
window.showForgotPassword = showForgotPassword;
window.closeModal = closeModal;
window.sendPasswordReset = sendPasswordReset;