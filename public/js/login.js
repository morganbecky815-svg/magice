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
      // 1. Login with AuthManager
      AuthManager.login(email, result.token);
  
      // 2. ⭐ CRITICAL: CLEAR any saved redirects
      sessionStorage.removeItem('redirectAfterLogin');
      
      // 3. Show success
      showLoginSuccess('Login successful! Redirecting to dashboard...');
  
      // 4. Disable form
      document.querySelectorAll('#loginForm input, #loginForm button').forEach(el => {
          el.disabled = true;
      });
  
      // 5. ⭐ ALWAYS go to DASHBOARD after login
      setTimeout(() => {
          window.location.href = '/dashboard';
      }, 1000);
      }
         
    else {
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