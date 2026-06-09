(function authModule() {
  const TOKEN_KEY = 'coffeeShopToken';
  const USER_KEY = 'coffeeShopUser';
  const configuredBase = window.COFFEE_API_BASE || localStorage.getItem('coffeeApiBase');
  const localHostNames = ['localhost', '127.0.0.1', ''];
  const defaultBase = localHostNames.includes(window.location.hostname)
    ? `http://${window.location.hostname || 'localhost'}:5000/api`
    : `${window.location.origin}/api`;
  const API_BASE = (configuredBase || defaultBase).replace(/\/$/, '');
  const API_ORIGIN = API_BASE.replace(/\/api$/, '');

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (error) {
      return null;
    }
  };

  const setSession = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    updateAuthUI();
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    updateAuthUI();
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: null } }));
  };

  const formToObject = (form) => Object.fromEntries(new FormData(form).entries());

  const setMessage = (element, message, isError = false) => {
    if (!element) return;
    element.textContent = message || '';
    element.classList.toggle('error', Boolean(isError));
  };

  const request = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response;

    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
      });
    } catch (error) {
      throw new Error(`Backend API is not running at ${API_BASE}. Start MongoDB, then run npm run dev in coffee-shop/backend.`);
    }

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : {};

    if (!response.ok) {
      const error = new Error(data.message || 'Request failed');
      error.data = data;
      throw error;
    }

    return data;
  };

  const setAuthPanel = (mode) => {
    qsa('[data-auth-tab]').forEach((tab) => tab.classList.toggle('active', tab.dataset.authTab === mode));
    qsa('[data-auth-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.authPanel === mode));
    setMessage(qs('#authMessage'), '');
  };

  const openAuth = (mode = 'login') => {
    const modal = qs('#authModal');
    if (!modal) return;
    setAuthPanel(mode);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };

  const closeAuth = () => {
    const modal = qs('#authModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  const logout = async () => {
    try {
      if (getToken()) {
        await request('/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      // Stateless JWT logout still succeeds locally even if the API is unavailable.
    } finally {
      clearSession();
    }
  };

  const updateAuthUI = () => {
    const user = getUser();

    qsa('.nav-actions .js-open-auth').forEach((button) => {
      button.textContent = user ? 'Logout' : 'Login';
      button.dataset.mode = user ? 'logout' : 'login';
    });

    qsa('[data-admin-link]').forEach((link) => {
      link.hidden = user?.role !== 'admin';
    });
  };

  const initAuth = () => {
    updateAuthUI();

    qsa('.js-open-auth').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode || 'login';
        if (mode === 'logout') {
          logout();
          return;
        }
        openAuth(mode);
      });
    });

    qsa('[data-close-auth]').forEach((button) => button.addEventListener('click', closeAuth));
    qs('#authModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'authModal') closeAuth();
    });

    qsa('[data-auth-tab]').forEach((tab) => {
      tab.addEventListener('click', () => setAuthPanel(tab.dataset.authTab));
    });

    qs('#loginForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = qs('#authMessage');
      setMessage(message, 'Signing you in...');

      try {
        const data = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify(formToObject(event.currentTarget))
        });
        setSession(data.token, data.user);
        setMessage(message, 'Welcome back.');
        closeAuth();
      } catch (error) {
        setMessage(message, error.message, true);
      }
    });

    qs('#registerForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = qs('#authMessage');
      setMessage(message, 'Creating your account...');

      try {
        const data = await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify(formToObject(event.currentTarget))
        });
        setSession(data.token, data.user);
        setMessage(message, 'Account created.');
        closeAuth();
      } catch (error) {
        setMessage(message, error.message, true);
      }
    });

    qs('#forgotForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = qs('#authMessage');
      setMessage(message, 'Generating reset token...');

      try {
        const data = await request('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify(formToObject(event.currentTarget))
        });
        const suffix = data.resetToken ? ` Reset token: ${data.resetToken}` : '';
        setMessage(message, `${data.message}.${suffix}`);
      } catch (error) {
        setMessage(message, error.message, true);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', initAuth);

  window.CoffeeAPI = {
    baseUrl: API_BASE,
    origin: API_ORIGIN,
    request,
    setMessage
  };

  window.CoffeeAuth = {
    getToken,
    getUser,
    openAuth,
    closeAuth,
    logout,
    updateAuthUI
  };
})();
