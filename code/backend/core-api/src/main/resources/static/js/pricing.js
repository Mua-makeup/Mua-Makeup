// Real Dynamic Pricing & Surge Engine Integration
class PricingManager {
  constructor() {
    this.map = null;
    this.customerMarker = null;
    this.providerMarker = null;
    this.routeLine = null;
    this.selectedLat = 10.776530;
    this.selectedLng = 106.700980;
    this.packages = [];
    this.currentPackageItems = [];
    this.providers = [];
  }

  async init() {
    this.initMap();
    this.bindEvents();
    await this.loadRealProviders();
    await this.loadRealPackages();
    await this.loadSurgeRules();
    await this.loadH3MasterStatus();
  }

  // 1. Tải danh sách Đối Tác (Studios & MUAs) thật từ Backend (GET /api/v1/pricing/providers)
  async loadRealProviders() {
    const selectProv = document.getElementById('pricing-select-provider');
    if (!selectProv) return;

    try {
      selectProv.innerHTML = `<option value="">Đang tải danh sách đối tác từ CSDL...</option>`;
      const data = await window.api.get('/pricing/providers');
      this.providers = data || [];

      if (this.providers.length === 0) {
        selectProv.innerHTML = `<option value="">Không tìm thấy đối tác nào trong CSDL</option>`;
        return;
      }

      selectProv.innerHTML = this.providers.map(p => `
        <option value="${p.id}" data-type="${p.type}">
          [${p.type === 'AGENCY' ? 'Studio' : 'Freelance MUA'}] ${p.name} - ${p.address || ''} ${!p.isSurgeEnabled ? '🛡️ (Giá Ổn Định)' : '⚡'}
        </option>
      `).join('');
    } catch (err) {
      console.warn('Lỗi tải danh sách đối tác thật:', err);
      selectProv.innerHTML = `<option value="">Không thể tải đối tác từ backend</option>`;
    }
  }

  // 2. Tải danh sách Gói Dịch Vụ thật từ Backend (GET /api/v1/packages)
  async loadRealPackages() {
    const selectPkg = document.getElementById('pricing-select-package');
    if (!selectPkg) return;

    try {
      selectPkg.innerHTML = `<option value="">Đang tải danh sách gói từ CSDL...</option>`;
      const res = await window.api.get('/packages');
      this.packages = res.content || res || [];

      if (this.packages.length === 0) {
        selectPkg.innerHTML = `<option value="">Không tìm thấy gói dịch vụ nào trong CSDL</option>`;
        return;
      }

      selectPkg.innerHTML = this.packages.map(p => `
        <option value="${p.id}">${p.packageName || p.name} - ${(p.basePrice || p.price || 0).toLocaleString('vi-VN')} đ</option>
      `).join('');

      // Load add-on của gói đầu tiên
      const firstId = this.packages[0].id;
      await this.loadPackageItems(firstId);
      this.calculatePreviewInvoice();
    } catch (err) {
      console.warn('Lỗi tải danh sách gói thật:', err);
      selectPkg.innerHTML = `<option value="">Lỗi tải dữ liệu gói từ backend</option>`;
      showToast(`Không thể tải gói dịch vụ: ${err.message}`, 'error');
    }
  }

  // Tải danh sách Add-on thật (GET /api/v1/packages/{id}/items)
  async loadPackageItems(packageId) {
    const container = document.getElementById('pricing-addons-container');
    if (!container) return;

    if (!packageId) {
      container.innerHTML = `<span class="text-xs text-slate-500 italic">Chọn gói dịch vụ để xem add-on</span>`;
      return;
    }

    try {
      container.innerHTML = `<span class="text-xs text-slate-400">Đang tải add-on...</span>`;
      const items = await window.api.get(`/packages/${packageId}/items`);
      this.currentPackageItems = items || [];

      if (this.currentPackageItems.length === 0) {
        container.innerHTML = `<span class="text-xs text-slate-500 italic">Gói dịch vụ này không có add-on mua thêm</span>`;
        return;
      }

      container.innerHTML = this.currentPackageItems.map(item => `
        <label class="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700/60 hover:border-amber-500/50 cursor-pointer text-xs transition-colors">
          <input type="checkbox" name="pricing-addon" value="${item.id}" class="w-4 h-4 rounded border-slate-700 text-amber-500 bg-slate-800">
          <span class="flex-1">${item.itemName || item.name}</span>
          <span class="font-semibold text-amber-400">+${(item.itemPrice || item.price || 0).toLocaleString('vi-VN')}đ</span>
        </label>
      `).join('');

      // Bind sự kiện tích chọn addon
      container.querySelectorAll('input[name="pricing-addon"]').forEach(chk => {
        chk.addEventListener('change', () => this.calculatePreviewInvoice());
      });
    } catch (err) {
      container.innerHTML = `<span class="text-xs text-slate-500 italic">Không có add-on khả dụng cho gói này</span>`;
    }
  }

  // 2. Khởi tạo bản đồ Leaflet
  initMap() {
    const mapEl = document.getElementById('pricing-map');
    if (!mapEl || this.map) return;

    this.map = L.map('pricing-map').setView([10.776530, 106.700980], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    const customerIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    this.customerMarker = L.marker([this.selectedLat, this.selectedLng], {
      icon: customerIcon,
      draggable: true
    }).addTo(this.map).bindPopup('Điểm đón/trang điểm của khách').openPopup();

    this.customerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      this.selectedLat = parseFloat(pos.lat.toFixed(6));
      this.selectedLng = parseFloat(pos.lng.toFixed(6));
      this.updateCoordinatesUI();
      this.calculatePreviewInvoice();
    });

    this.map.on('click', (e) => {
      this.customerMarker.setLatLng(e.latlng);
      this.selectedLat = parseFloat(e.latlng.lat.toFixed(6));
      this.selectedLng = parseFloat(e.latlng.lng.toFixed(6));
      this.updateCoordinatesUI();
      this.calculatePreviewInvoice();
    });
  }

  updateCoordinatesUI() {
    const latIn = document.getElementById('pricing-lat');
    const lngIn = document.getElementById('pricing-lng');
    if (latIn) latIn.value = this.selectedLat;
    if (lngIn) lngIn.value = this.selectedLng;
  }

  bindEvents() {
    // Thay đổi gói
    document.getElementById('pricing-select-package')?.addEventListener('change', async (e) => {
      await this.loadPackageItems(e.target.value);
      this.calculatePreviewInvoice();
    });

    // Thay đổi đối tác hoặc giờ
    ['pricing-select-provider', 'pricing-booking-time', 'pricing-voucher'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.calculatePreviewInvoice());
    });

    const formatLocalDatetime = (date) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    // Preset sáng sớm 05:30
    document.getElementById('btn-quick-early')?.addEventListener('click', () => {
      const timeIn = document.getElementById('pricing-booking-time');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(5, 30, 0, 0);
      timeIn.value = formatLocalDatetime(tomorrow);
      showToast('Đã chọn: Sáng mai 05:30 (Kích hoạt Giờ Sáng Rước Dâu & Phụ phí sớm)!', 'info');
      this.calculatePreviewInvoice();
    });

    // Preset bình thường 10:00
    document.getElementById('btn-quick-normal')?.addEventListener('click', () => {
      const timeIn = document.getElementById('pricing-booking-time');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      timeIn.value = formatLocalDatetime(tomorrow);
      showToast('Đã chọn: Ngày thường 10:00 sáng (Giá bình thường)!', 'info');
      this.calculatePreviewInvoice();
    });

    // Gán giờ mặc định sáng mai 05:30
    const timeIn = document.getElementById('pricing-booking-time');
    if (timeIn && !timeIn.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(5, 30, 0, 0);
      timeIn.value = formatLocalDatetime(tomorrow);
    }
  }

  // 3. Gọi Real API Tính Giá Tạm Tính: POST /api/v1/pricing/preview-invoice
  async calculatePreviewInvoice() {
    const packageId = parseInt(document.getElementById('pricing-select-package')?.value || '0');
    if (!packageId) return;

    const providerSelect = document.getElementById('pricing-select-provider');
    const selectedOption = providerSelect?.options[providerSelect.selectedIndex];
    const providerId = parseInt(providerSelect?.value || '0');
    if (!providerId) return;

    const providerType = selectedOption?.getAttribute('data-type') || 'AGENCY';
    const provider = this.providers.find(p => p.id === providerId && p.type === providerType) || this.providers[0];
    if (!provider) return;

    const bookingTime = document.getElementById('pricing-booking-time')?.value;
    const voucherCode = document.getElementById('pricing-voucher')?.value?.trim();

    const addOnItemIds = [];
    document.querySelectorAll('input[name="pricing-addon"]:checked').forEach(chk => {
      addOnItemIds.push(parseInt(chk.value));
    });

    const provLat = provider.latitude || provider.lat || 10.776530;
    const provLng = provider.longitude || provider.lng || 106.700980;

    // Cập nhật marker và vệt đường tới thợ
    if (this.map && provLat && provLng) {
      if (this.providerMarker) this.map.removeLayer(this.providerMarker);
      if (this.routeLine) this.map.removeLayer(this.routeLine);

      const providerIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      this.providerMarker = L.marker([provLat, provLng], { icon: providerIcon })
        .addTo(this.map)
        .bindPopup(`<strong>${provider.name}</strong><br/>Tọa độ: [${provLat}, ${provLng}]`);

      this.routeLine = L.polyline([
        [provLat, provLng],
        [this.selectedLat, this.selectedLng]
      ], {
        color: '#d4af37',
        weight: 3,
        dashArray: '5, 10',
        opacity: 0.8
      }).addTo(this.map);
    }

    let formattedBookingTime;
    if (bookingTime) {
      formattedBookingTime = bookingTime.length === 16 ? `${bookingTime}:00` : bookingTime;
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const pad = (n) => String(n).padStart(2, '0');
      formattedBookingTime = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}:00`;
    }

    const payload = {
      packageId: packageId,
      providerId: provider.id,
      providerType: provider.type,
      bookingTime: formattedBookingTime,
      customerLatitude: this.selectedLat,
      customerLongitude: this.selectedLng,
      addOnItemIds: addOnItemIds,
      voucherCode: voucherCode || null
    };

    try {
      const invoice = await window.api.post('/pricing/preview-invoice', payload);
      this.renderInvoiceResult(invoice);
    } catch (err) {
      console.warn('Lỗi gọi preview-invoice thật:', err);
      showToast(`Lỗi tính giá từ backend: ${err.message}`, 'error');
    }
  }

  renderInvoiceResult(data) {
    if (!data) return;

    // Gói & Addons
    document.getElementById('inv-pkg-name').textContent = data.packageInfo?.packageName || 'Gói Dịch Vụ';
    document.getElementById('inv-pkg-price').textContent = `${(data.packageInfo?.basePrice || 0).toLocaleString('vi-VN')} đ`;
    
    const addonsEl = document.getElementById('inv-addons-list');
    if (addonsEl) {
      if (data.packageInfo?.appliedAddons?.length > 0) {
        addonsEl.innerHTML = data.packageInfo.appliedAddons.map(a => `
          <div class="flex justify-between text-xs text-slate-400 pl-3 border-l-2 border-slate-700 py-0.5">
            <span>+ ${a.itemName}</span>
            <span>${(a.itemPrice || 0).toLocaleString('vi-VN')} đ</span>
          </div>
        `).join('');
      } else {
        addonsEl.innerHTML = `<span class="text-xs text-slate-500 italic pl-3">Không có add-on nào được chọn</span>`;
      }
    }
    document.getElementById('inv-subtotal').textContent = `${(data.serviceSubtotal || 0).toLocaleString('vi-VN')} đ`;

    // Phí di chuyển
    const df = data.distanceFee || {};
    document.getElementById('inv-distance-fee').textContent = `${(df.distanceFeeAmount || 0).toLocaleString('vi-VN')} đ`;
    document.getElementById('inv-distance-desc').textContent = 
      (df.billableDistanceKm > 0)
        ? `Vượt bán kính miễn phí (${df.freeRadiusKm}km), tính phí ${df.billableDistanceKm}km x ${(df.pricePerKm || 0).toLocaleString('vi-VN')}đ/km`
        : `Trong bán kính miễn phí (${df.freeRadiusKm || 3}km)`;
    document.getElementById('inv-distance-km').textContent = `${df.actualDistanceKm || 0} km (~${df.estimatedDurationMinutes || 0} phút) [${df.routingProvider || 'MAPS'}]`;

    // Phụ trội cao điểm (Surge)
    const surge = data.surgePricing || {};
    document.getElementById('inv-surge-amount').textContent = `+${(surge.surgeAmount || 0).toLocaleString('vi-VN')} đ`;
    document.getElementById('inv-surge-multiplier').textContent = `(${parseFloat(surge.multiplier || 1).toFixed(2)}x)`;
    document.getElementById('inv-surge-reason').textContent = surge.surgeReason || 'Khung giờ bình thường';

    const badge = document.getElementById('inv-surge-badge');
    if (surge.surgeType === 'DISABLED_BY_PROVIDER') {
      badge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700';
      badge.textContent = 'OPT-OUT (GIÁ ỔN ĐỊNH)';
    } else if (surge.isSurgeApplied) {
      badge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 pulse-badge';
      badge.textContent = surge.surgeType === 'REALTIME_DEMAND_SURGE' ? '⚡ UBER H3 REALTIME' : '🕒 GIỜ CAO ĐIỂM';
    } else {
      badge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      badge.textContent = 'GIỜ BÌNH THƯỜNG';
    }

    // Phụ phí thời điểm (Surcharges)
    const surchargesEl = document.getElementById('inv-surcharges-list');
    if (surchargesEl) {
      if (data.surcharges && data.surcharges.length > 0) {
        surchargesEl.innerHTML = data.surcharges.map(s => `
          <div class="flex justify-between text-xs text-amber-300 py-1">
            <span><i class="fa-solid fa-clock-rotate-left mr-1"></i> ${s.description || s.name || s.type}</span>
            <span>+${(s.amount || 0).toLocaleString('vi-VN')} đ</span>
          </div>
        `).join('');
      } else {
        surchargesEl.innerHTML = `<span class="text-xs text-slate-500 italic">Không áp dụng phụ phí sáng sớm/ngày lễ</span>`;
      }
    }

    // Voucher
    const voucherRow = document.getElementById('inv-voucher-row');
    if (data.discountInfo && data.discountInfo.discountAmount > 0) {
      voucherRow.classList.remove('hidden');
      document.getElementById('inv-voucher-desc').textContent = data.discountInfo.description || 'Voucher';
      document.getElementById('inv-voucher-amount').textContent = `-${(data.discountInfo.discountAmount || 0).toLocaleString('vi-VN')} đ`;
    } else {
      voucherRow.classList.add('hidden');
    }

    // Tổng kết tài chính
    const fin = data.financialSummary || {};
    document.getElementById('inv-total-amount').textContent = `${(fin.totalAmount || 0).toLocaleString('vi-VN')} đ`;
    document.getElementById('inv-deposit-amount').textContent = `${(fin.depositRequiredAmount || 0).toLocaleString('vi-VN')} đ`;
    document.getElementById('inv-remaining-amount').textContent = `${(fin.remainingPayableAmount || 0).toLocaleString('vi-VN')} đ`;
  }

  // 4. Quản trị Super Admin: GET /api/v1/admin/pricing/surge-rules
  async loadSurgeRules() {
    const tbody = document.getElementById('admin-surge-rules-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">Đang tải quy tắc cao điểm từ CSDL...</td></tr>`;
      const rules = await window.api.get('/admin/pricing/surge-rules');
      if (!rules || rules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500 italic">Chưa có quy tắc cao điểm nào trong CSDL</td></tr>`;
        return;
      }

      tbody.innerHTML = rules.map(r => `
        <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
          <td class="py-3 px-4 text-xs font-semibold text-slate-400">#${r.id}</td>
          <td class="py-3 px-4 font-bold text-amber-300 text-sm">${r.ruleName}</td>
          <td class="py-3 px-4 text-xs text-slate-300 font-mono">${r.startTime} - ${r.endTime}</td>
          <td class="py-3 px-4 text-xs text-slate-400">${r.applicableDaysOfWeek}</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-0.5 rounded text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
              ${parseFloat(r.surgeMultiplier).toFixed(2)}x
            </span>
          </td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${r.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}">
              ${r.isActive ? 'ĐANG BẬT' : 'TẠM TẮT'}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <button class="text-rose-400 hover:text-rose-300 p-1.5 transition-colors text-xs" onclick="window.pricingManager.deleteSurgeRule(${r.id})">
              <i class="fa-solid fa-trash-can"></i> Xóa
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-rose-400 italic">Cần quyền Super Admin để xem bảng quy tắc: ${err.message}</td></tr>`;
    }
  }

  async createSurgeRule(req) {
    try {
      await window.api.post('/admin/pricing/surge-rules', req);
      showToast('Đã tạo mới quy tắc giá cao điểm thành công!', 'success');
      await this.loadSurgeRules();
    } catch (err) {
      showToast(`Không thể tạo quy tắc: ${err.message}`, 'error');
    }
  }

  async deleteSurgeRule(id) {
    if (confirm('Bạn có chắc chắn muốn xóa quy tắc này khỏi CSDL?')) {
      try {
        await window.api.delete(`/admin/pricing/surge-rules/${id}`);
        showToast('Đã xóa quy tắc cao điểm thành công!', 'success');
        await this.loadSurgeRules();
      } catch (err) {
        showToast(`Không thể xóa quy tắc: ${err.message}`, 'error');
      }
    }
  }

  // 5. Quản trị Master Switch H3: GET /h3-status & POST /toggle-h3
  async loadH3MasterStatus() {
    const toggleBtn = document.getElementById('pricing-h3-switch');
    const badge = document.getElementById('pricing-h3-badge');
    const textDesc = document.getElementById('pricing-h3-desc');
    if (!toggleBtn) return;

    try {
      const res = await window.api.get('/admin/pricing/surge-rules/h3-status');
      const isEnabled = res.isH3SurgeEnabled !== undefined ? res.isH3SurgeEnabled : true;
      toggleBtn.checked = isEnabled;
      this.updateH3Badge(isEnabled);
    } catch (err) {
      console.warn('Cần quyền Super Admin để lấy trạng thái H3:', err);
    }

    toggleBtn.addEventListener('change', async (e) => {
      const checked = e.target.checked;
      try {
        const res = await window.api.post(`/admin/pricing/surge-rules/toggle-h3?enabled=${checked}`);
        const result = res.isH3SurgeEnabled;
        showToast(`Đã ${result ? 'BẬT' : 'TẮT'} cơ chế Uber H3 Surge toàn sàn thành công!`, result ? 'success' : 'warning');
        this.updateH3Badge(result);
        this.calculatePreviewInvoice();
      } catch (err) {
        showToast(`Không thể cập nhật H3: ${err.message}`, 'error');
        toggleBtn.checked = !checked;
      }
    });
  }

  updateH3Badge(isEnabled) {
    const badge = document.getElementById('pricing-h3-badge');
    const textDesc = document.getElementById('pricing-h3-desc');
    if (badge) {
      badge.className = isEnabled 
        ? 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
        : 'px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40';
      badge.textContent = isEnabled ? 'UBER H3 ĐANG BẬT' : 'UBER H3 ĐÃ TẮT';
    }
    if (textDesc) {
      textDesc.textContent = isEnabled 
        ? 'Hệ thống tự động đo Cung/Cầu theo ô lục giác H3 Resolution 7 và áp dụng hệ số phụ trội thời gian thực.'
        : 'ĐÃ TẮT - Bỏ qua thuật toán H3, chỉ áp dụng bảng quy tắc lịch cố định.';
    }
  }
}

window.pricingManager = new PricingManager();
