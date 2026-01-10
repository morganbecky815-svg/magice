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

      // ✅✅✅ SAVE DATA ONCE
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      // ALSO save for compatibility with dashboard.js
      localStorage.setItem('magicEdenCurrentUser', result.user.email);

      showLoginSuccess('Login successful! Redirecting...');
      document.querySelectorAll('#loginForm input, #loginForm button').forEach(el => el.disabled = true);

      // ✅✅✅ SIMPLE REDIRECT - NO DELAY
      if (result.user && result.user._id) {
          // Redirect to dashboard.html with user ID
          window.location.href = `/dashboard.html?userId=${result.user._id}`;
      } else {
          // Fallback
          window.location.href = '/dashboard';
      }

  } catch (error) {
      console.error('Login error:', error);
      showLoginError('An error occurred. Please try again.');
      loginButton.disabled = false;
      loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
}