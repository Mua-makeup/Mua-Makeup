// Core Real API Client - Connected directly to Spring Boot Backend
class RealApiClient {
  constructor() {
    // Nếu mở file HTML trực tiếp qua file:/// hoặc khác port, tự động trỏ về backend Spring Boot 8080
    const isFile = window.location.protocol === 'file:';
    const isOtherPort = window.location.port !== '8080' && window.location.hostname !== '';
    this.baseUrl = (isFile || isOtherPort) ? 'http://localhost:8080/api/v1' : '/api/v1';
  }

  getHeaders(isJson = true) {
    const headers = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async handleResponse(res) {
    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      // Body rỗng hoặc không phải json
    }

    if (!res.ok) {
      const errMsg = json?.message || `HTTP ${res.status}: ${res.statusText}`;
      if (res.status === 401) {
        showToast('Phiên đăng nhập hết hạn hoặc chưa xác thực (401)!', 'warning');
      } else if (res.status === 403) {
        showToast('Truy cập bị từ chối (403): Bạn không có quyền truy cập chức năng này!', 'warning');
      }
      throw new Error(errMsg);
    }
    return json?.data !== undefined ? json.data : json;
  }

  async get(endpoint, params = {}) {
    let url = `${this.baseUrl}${endpoint}`;
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(false)
    });
    return this.handleResponse(res);
  }

  async post(endpoint, body = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async put(endpoint, body = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async delete(endpoint) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(false)
    });
    return this.handleResponse(res);
  }
}

window.api = new RealApiClient();

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'warning' ? 'bg-amber-600' : (type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'));
  toast.className = `${bg} text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 font-medium z-50 pointer-events-auto`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info text-sm"></i> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
