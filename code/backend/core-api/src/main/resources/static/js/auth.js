// Real Authentication Manager
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('access_token') || null;
    this.user = JSON.parse(localStorage.getItem('user_info') || 'null');
  }

  init() {
    this.renderUserBar();
    this.bindEvents();
  }

  isAuthenticated() {
    return !!this.token;
  }

  hasRole(role) {
    if (!this.user || !this.user.roles) return false;
    return this.user.roles.includes(role) || this.user.roleName === role;
  }

  renderUserBar() {
    const userBar = document.getElementById('user-auth-bar');
    if (!userBar) return;

    if (this.isAuthenticated() && this.user) {
      const roleName = this.user.roleName || (this.user.roles ? this.user.roles[0] : 'USER');
      userBar.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-bold text-slate-950 text-xs">
              ${this.user.fullName ? this.user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div class="text-left leading-tight hidden sm:block">
              <div class="text-xs font-bold text-slate-100">${this.user.fullName || 'Người Dùng'}</div>
              <span class="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ${roleName}
              </span>
            </div>
          </div>
          <button id="btn-logout" class="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
          </button>
        </div>
      `;
      document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
    } else {
      userBar.innerHTML = `
        <button id="btn-open-login" class="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all">
          <i class="fa-solid fa-key"></i> Đăng Nhập Tài Khoản Thật
        </button>
      `;
      document.getElementById('btn-open-login')?.addEventListener('click', () => this.openLoginModal());
    }
  }

  openLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.add('hidden');
  }

  async login(loginIdentifier, password) {
    try {
      const res = await window.api.post('/auth/login', {
        loginIdentifier: loginIdentifier.trim(),
        password: password
      });

      this.token = res.accessToken;
      this.user = res.userInfo;

      localStorage.setItem('access_token', this.token);
      localStorage.setItem('user_info', JSON.stringify(this.user));

      showToast(`Đăng nhập thành công! Xin chào ${this.user.fullName} (${this.user.roleName})`, 'success');
      this.closeLoginModal();
      this.renderUserBar();

      // Refresh các phân hệ có yêu cầu quyền
      if (window.adminSurgeManager) window.adminSurgeManager.loadSurgeRules();
      if (window.telemetryManager) window.telemetryManager.checkAvailabilityStatus();
    } catch (err) {
      showToast(`Đăng nhập thất bại: ${err.message}`, 'error');
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    showToast('Đã đăng xuất tài khoản.', 'info');
    this.renderUserBar();
  }

  bindEvents() {
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const ident = document.getElementById('login-identifier')?.value;
        const pass = document.getElementById('login-password')?.value;
        if (ident && pass) {
          this.login(ident, pass);
        }
      });
    }

    document.getElementById('btn-close-login')?.addEventListener('click', () => this.closeLoginModal());

    // Điền nhanh thông tin tài khoản mẫu
    document.querySelectorAll('[data-quick-login]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ident = btn.getAttribute('data-ident');
        const pass = btn.getAttribute('data-pass');
        document.getElementById('login-identifier').value = ident;
        document.getElementById('login-password').value = pass;
      });
    });
  }
}

window.authManager = new AuthManager();
