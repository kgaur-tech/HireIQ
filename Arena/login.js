const DEFAULT_API_CONFIG = {
  baseUrl: localStorage.getItem('apiBaseUrl') || 'http://127.0.0.1:5000',
  loginPath: '/api/auth/login',
  googleSignInPath: '/api/auth/google',
};

const API_CONFIG = {
  ...DEFAULT_API_CONFIG,
  ...(window.HireIQLoginConfig || {}),
};

const state = {
  isSubmitting: false,
};

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const statusBox = document.getElementById('formStatus');
const loginButton = document.getElementById('loginButton');
const googleButton = document.getElementById('googleSignInButton');
const togglePasswordButton = document.getElementById('togglePassword');
const roleInputs = Array.from(document.querySelectorAll('input[name="accountType"]'));
const roleThemeTargets = [document.body, document.documentElement];

const DEMO_CREDENTIALS = {
  email: 'myth@gmail.com',
  password: 'student@myth',
};

function setStatus(message, type = '') {
  statusBox.textContent = message;
  statusBox.hidden = !message;
  statusBox.classList.remove('login-page__status--success', 'login-page__status--error');

  if (type) {
    statusBox.classList.add(`login-page__status--${type}`);
  }
}

function setFieldError(input, errorEl, message) {
  input.classList.toggle('login-form__input--invalid', Boolean(message));
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function clearErrors() {
  setFieldError(emailInput, emailError, '');
  setFieldError(passwordInput, passwordError, '');
}

function validateForm(email, password) {
  let valid = true;

  if (!email.trim()) {
    setFieldError(emailInput, emailError, 'Email is required.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    setFieldError(emailInput, emailError, 'Enter a valid email address.');
    valid = false;
  } else {
    setFieldError(emailInput, emailError, '');
  }

  if (!password) {
    setFieldError(passwordInput, passwordError, 'Password is required.');
    valid = false;
  } else if (password.length < 8) {
    setFieldError(passwordInput, passwordError, 'Password must be at least 8 characters.');
    valid = false;
  } else {
    setFieldError(passwordInput, passwordError, '');
  }

  return valid;
}

function setLoading(isLoading) {
  state.isSubmitting = isLoading;
  loginButton.disabled = isLoading;
  googleButton.disabled = isLoading;
  loginButton.classList.toggle('login-form__button--loading', isLoading);
  loginButton.querySelector('.login-form__button-text').textContent = isLoading ? 'Logging in...' : 'Log in';
}

function setSuccessState(isSuccess) {
  loginButton.classList.toggle('login-form__button--success', isSuccess);
}

function getSelectedRole() {
  const selected = roleInputs.find((input) => input.checked);
  return selected?.value || 'student';
}

function syncRoleTheme(role) {
  roleThemeTargets.forEach((target) => {
    target.dataset.role = role;
  });
}

function getDashboardPath(role) {
  return role === 'recruiter' ? 'recruiter-dashboard.html' : 'student-dashboard.html';
}

function getSuccessMessage(role) {
  return role === 'recruiter' ? 'Recruiter login successful.' : 'Student login successful.';
}

function buildUrl(path) {
  return new URL(path, API_CONFIG.baseUrl || window.location.origin).toString();
}

async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (normalizedEmail === DEMO_CREDENTIALS.email && normalizedPassword === DEMO_CREDENTIALS.password) {
    return {
      success: true,
      message: 'Success',
      data: {
        email: normalizedEmail,
      },
    };
  }

  const response = await fetch(buildUrl(API_CONFIG.loginPath), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || 'Login failed. Please try again.';
    throw new Error(message);
  }

  return payload;
}

async function handleLogin(event) {
  event.preventDefault();
  if (state.isSubmitting) {
    return;
  }

  clearErrors();
  setStatus('');

  const email = emailInput.value;
  const password = passwordInput.value;
  const role = getSelectedRole();

  if (!validateForm(email, password)) {
    setStatus('Please fix the highlighted fields and try again.', 'error');
    return;
  }

  setLoading(true);

  try {
    const result = await loginUser(email.trim(), password);
    setStatus(getSuccessMessage(role), 'success');
    setSuccessState(true);
    
    // Store JWT token if provided by backend
    if (result.data && result.data.token) {
      localStorage.setItem('authToken', result.data.token);
      if (result.data.user) {
        localStorage.setItem('userData', JSON.stringify(result.data.user));
      }
    }
    
    const targetPath = getDashboardPath(role);
    window.setTimeout(() => {
      window.location.href = targetPath;
    }, 900);
  } catch (error) {
    setStatus(error.message || 'Unable to log in right now.', 'error');
  } finally {
    setLoading(false);
  }
}

function togglePasswordVisibility() {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  togglePasswordButton.textContent = isHidden ? 'Hide' : 'Show';
  togglePasswordButton.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  togglePasswordButton.setAttribute('aria-pressed', String(isHidden));
}

async function handleGoogleSignIn() {
  if (state.isSubmitting) {
    return;
  }

  const handler = window.onHireIQGoogleSignIn;

  if (typeof handler === 'function') {
    try {
      await handler();
      setStatus('Google sign in flow started.', 'success');
      return;
    } catch (error) {
      setStatus(error.message || 'Google sign in is unavailable.', 'error');
      return;
    }
  }

  setStatus('Google sign in is not connected yet.', 'error');
}

emailInput.addEventListener('input', () => setFieldError(emailInput, emailError, ''));
passwordInput.addEventListener('input', () => setFieldError(passwordInput, passwordError, ''));
form.addEventListener('submit', handleLogin);
togglePasswordButton.addEventListener('click', togglePasswordVisibility);
googleButton.addEventListener('click', handleGoogleSignIn);
roleInputs.forEach((input) => {
  input.addEventListener('change', () => syncRoleTheme(getSelectedRole()));
});

syncRoleTheme(getSelectedRole());

window.loginUser = loginUser;
