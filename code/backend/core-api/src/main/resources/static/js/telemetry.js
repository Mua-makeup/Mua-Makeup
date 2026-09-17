// Real Telemetry & GPS Tracking Engine Integration
class TelemetryManager {
  constructor() {
    this.map = null;
    this.centerLat = 10.776530;
    this.centerLng = 106.700980;
    this.radiusKm = 5.0;
    this.nearbyLayer = null;
    this.tripHistoryLayer = null;
    this.liveTrackMarker = null;
    this.streamingInterval = null;
  }

  init() {
    this.initMap();
    this.bindEvents();
    this.findNearbyProviders();
  }

  // 1. Khởi tạo bản đồ Leaflet cho Telemetry
  initMap() {
    const mapEl = document.getElementById('telemetry-map');
    if (!mapEl || this.map) return;

    this.map = L.map('telemetry-map').setView([this.centerLat, this.centerLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.nearbyLayer = L.layerGroup().addTo(this.map);
    this.tripHistoryLayer = L.layerGroup().addTo(this.map);

    // Marker tâm quét
    const centerIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
    this.centerMarker = L.marker([this.centerLat, this.centerLng], { icon: centerIcon, draggable: true })
      .addTo(this.map)
      .bindPopup('Vị trí quét thợ lân cận (Kéo để đổi tâm quét)')
      .openPopup();

    this.radiusCircle = L.circle([this.centerLat, this.centerLng], {
      radius: this.radiusKm * 1000,
      color: '#38bdf8',
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      weight: 1.5
    }).addTo(this.map);

    this.centerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      this.centerLat = parseFloat(pos.lat.toFixed(6));
      this.centerLng = parseFloat(pos.lng.toFixed(6));
      this.radiusCircle.setLatLng(pos);
      this.updateInputsUI();
      this.findNearbyProviders();
    });

    this.map.on('click', (e) => {
      this.centerLat = parseFloat(e.latlng.lat.toFixed(6));
      this.centerLng = parseFloat(e.latlng.lng.toFixed(6));
      this.centerMarker.setLatLng(e.latlng);
      this.radiusCircle.setLatLng(e.latlng);
      this.updateInputsUI();
      this.findNearbyProviders();
    });
  }

  updateInputsUI() {
    const latIn = document.getElementById('telemetry-scan-lat');
    const lngIn = document.getElementById('telemetry-scan-lng');
    if (latIn) latIn.value = this.centerLat;
    if (lngIn) lngIn.value = this.centerLng;
  }

  bindEvents() {
    // Nút quét lại
    document.getElementById('btn-scan-nearby')?.addEventListener('click', () => {
      this.radiusKm = parseFloat(document.getElementById('telemetry-scan-radius')?.value || '5.0');
      this.radiusCircle.setRadius(this.radiusKm * 1000);
      this.findNearbyProviders();
    });

    // Công tắc Sẵn sàng nhận việc (Availability) của Thợ MUA
    const availSwitch = document.getElementById('switch-mua-availability');
    if (availSwitch) {
      availSwitch.addEventListener('change', async (e) => {
        const isAvailable = e.target.checked;
        await this.toggleAvailability(isAvailable);
      });
    }

    // Nút Stream 1 tọa độ GPS thủ công
    document.getElementById('btn-send-stream')?.addEventListener('click', () => {
      this.sendSingleGpsStream();
    });

    // Nút Bật/Tắt Auto Stream GPS
    const btnAutoStream = document.getElementById('btn-toggle-auto-stream');
    if (btnAutoStream) {
      btnAutoStream.addEventListener('click', () => {
        this.toggleAutoStreaming();
      });
    }

    // Tra cứu Live Tracking theo Booking ID
    document.getElementById('btn-track-booking')?.addEventListener('click', () => {
      const bookingId = document.getElementById('input-track-booking-id')?.value;
      if (bookingId) {
        this.trackBookingLive(bookingId);
      }
    });

    // Tra cứu Lịch sử Hành trình theo Booking ID
    document.getElementById('btn-history-booking')?.addEventListener('click', () => {
      const bookingId = document.getElementById('input-track-booking-id')?.value;
      if (bookingId) {
        this.loadTripHistory(bookingId);
      }
    });
  }

  // 2. Real API Quét Thợ Lân Cận: GET /api/v1/telemetry/nearby
  async findNearbyProviders() {
    const listEl = document.getElementById('telemetry-providers-list');
    const countEl = document.getElementById('telemetry-providers-count');
    if (!listEl) return;

    this.nearbyLayer.clearLayers();
    listEl.innerHTML = `<div class="text-xs text-slate-400 italic py-4 text-center">Đang quét thợ từ Redis GEO & PostgreSQL...</div>`;

    try {
      const providers = await window.api.get('/telemetry/nearby', {
        latitude: this.centerLat,
        longitude: this.centerLng,
        radiusKm: this.radiusKm
      });

      const providerList = providers || [];
      if (countEl) countEl.textContent = `${providerList.length} thợ`;

      if (providerList.length === 0) {
        listEl.innerHTML = `
          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
            <i class="fa-solid fa-satellite-dish text-amber-500/50 text-xl mb-2 block"></i>
            Không có thợ nào đang trực tuyến trong bán kính ${this.radiusKm} km.
            <br/><span class="text-[11px] text-slate-500">Mẹo: Hãy đăng nhập tài khoản Thợ MUA và bật công tắc "Sẵn sàng nhận lịch" bên dưới để xuất hiện trên radar!</span>
          </div>
        `;
        return;
      }

      listEl.innerHTML = providerList.map(p => `
        <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-sky-500/50 transition-all flex items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <div>
              <div class="font-bold text-slate-100 flex items-center gap-1.5">
                <span>${p.fullName || 'Chuyên Viên MUA'}</span>
                <span class="text-[10px] px-1 rounded bg-slate-800 text-amber-300 font-mono">#${p.muaId || p.providerId}</span>
              </div>
              <div class="text-[11px] text-slate-400">
                <i class="fa-solid fa-location-arrow text-sky-400 mr-1"></i> Cách ${(p.distanceKm || 0).toFixed(2)} km
                <span class="text-amber-400 ml-2"><i class="fa-solid fa-star"></i> ${(p.ratingAvg || p.ratingAverage || 5.0).toFixed(1)}</span>
              </div>
            </div>
          </div>
          <button class="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors" onclick="window.telemetryManager.selectProviderForInvoice(${p.muaId || p.providerId}, ${p.latitude}, ${p.longitude})">
            Chọn
          </button>
        </div>
      `).join('');

      // Vẽ marker thợ trên bản đồ
      const muaIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
      });

      providerList.forEach(p => {
        if (p.latitude && p.longitude) {
          const marker = L.marker([p.latitude, p.longitude], { icon: muaIcon });
          marker.bindTooltip(`
            <strong>${p.fullName || 'Thợ MUA'}</strong><br/>
            • Cách bạn: ${(p.distanceKm || 0).toFixed(2)} km<br/>
            • Đánh giá: ${(p.ratingAvg || 5.0).toFixed(1)} ★
          `);
          this.nearbyLayer.addLayer(marker);
        }
      });

    } catch (err) {
      listEl.innerHTML = `<div class="text-xs text-rose-400 py-3 text-center">Lỗi truy vấn thợ lân cận: ${err.message}</div>`;
    }
  }

  // 3. Real API Bật/Tắt Sẵn Sàng: POST /api/v1/telemetry/availability
  async toggleAvailability(isAvailable) {
    if (!window.authManager.isAuthenticated()) {
      showToast('Bạn cần đăng nhập tài khoản Thợ MUA để bật trạng thái nhận việc!', 'warning');
      window.authManager.openLoginModal();
      document.getElementById('switch-mua-availability').checked = !isAvailable;
      return;
    }

    try {
      await window.api.post('/telemetry/availability', {
        isAvailable: isAvailable,
        latitude: this.centerLat,
        longitude: this.centerLng
      });

      showToast(`Đã ${isAvailable ? 'BẬT sẵn sàng nhận lịch (Đã nạp vào Redis GEO)' : 'TẮT nhận lịch'} thành công!`, isAvailable ? 'success' : 'info');
      const statusBadge = document.getElementById('badge-mua-online-status');
      if (statusBadge) {
        statusBadge.className = isAvailable 
          ? 'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          : 'px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-400';
        statusBadge.textContent = isAvailable ? 'ONLINE (ĐANG NHẬN VIỆC)' : 'OFFLINE';
      }

      // Quét lại để thấy chính mình xuất hiện trên radar
      this.findNearbyProviders();
    } catch (err) {
      showToast(`Lỗi cập nhật trạng thái: ${err.message}`, 'error');
      document.getElementById('switch-mua-availability').checked = !isAvailable;
    }
  }

  // 4. Real API Phát Luồng GPS Stream: POST /api/v1/telemetry/stream
  async sendSingleGpsStream() {
    if (!window.authManager.isAuthenticated()) {
      showToast('Cần đăng nhập tài khoản Thợ MUA để phát tọa độ GPS!', 'warning');
      window.authManager.openLoginModal();
      return;
    }

    const lat = parseFloat(document.getElementById('stream-lat')?.value || this.centerLat);
    const lng = parseFloat(document.getElementById('stream-lng')?.value || this.centerLng);
    const speed = parseFloat(document.getElementById('stream-speed')?.value || '35.5');
    const heading = parseFloat(document.getElementById('stream-heading')?.value || '90.0');
    const accuracy = parseFloat(document.getElementById('stream-accuracy')?.value || '5.0');
    const bookingId = parseInt(document.getElementById('stream-booking-id')?.value || '0') || null;

    try {
      const res = await window.api.post('/telemetry/stream', {
        latitude: lat,
        longitude: lng,
        speed: speed,
        heading: heading,
        accuracy: accuracy,
        bookingId: bookingId
      });

      showToast(`Stream GPS thành công: [${lat}, ${lng}] @ ${speed} km/h`, 'success');
      this.renderStreamLog(res);
    } catch (err) {
      showToast(`Lỗi Stream GPS: ${err.message}`, 'error');
    }
  }

  renderStreamLog(data) {
    const logEl = document.getElementById('stream-result-log');
    if (!logEl) return;

    logEl.classList.remove('hidden');
    logEl.innerHTML = `
      <div class="text-[11px] text-emerald-300 font-mono">
        ✓ [${new Date().toLocaleTimeString()}] Live Tracking Response:<br/>
        • MUA ID: <strong>${data.muaId || 'N/A'}</strong> | Status: <strong>${data.status || 'ACTIVE'}</strong><br/>
        • Lat/Lng: <strong>${data.currentLatitude}, ${data.currentLongitude}</strong><br/>
        • Tốc độ: <strong>${data.currentSpeedKmh || 0} km/h</strong> | Cự ly tới khách: <strong>${data.distanceRemainingMeters || 0} m</strong>
      </div>
    `;
  }

  toggleAutoStreaming() {
    const btn = document.getElementById('btn-toggle-auto-stream');
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
      btn.innerHTML = `<i class="fa-solid fa-play mr-1"></i> Bắt Đầu Stream Tự Động (5s/lần)`;
      btn.className = 'w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors';
      showToast('Đã dừng Stream GPS tự động.', 'info');
    } else {
      btn.innerHTML = `<i class="fa-solid fa-stop mr-1"></i> Dừng Stream Tự Động`;
      btn.className = 'w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors';
      showToast('Bắt đầu phát luồng tọa độ GPS tự động mỗi 5 giây...', 'success');

      // Mô phỏng di chuyển nhẹ
      let lat = parseFloat(document.getElementById('stream-lat').value);
      let lng = parseFloat(document.getElementById('stream-lng').value);

      this.streamingInterval = setInterval(() => {
        lat += (Math.random() - 0.5) * 0.001;
        lng += (Math.random() - 0.5) * 0.001;
        document.getElementById('stream-lat').value = lat.toFixed(6);
        document.getElementById('stream-lng').value = lng.toFixed(6);
        this.sendSingleGpsStream();
      }, 5000);
    }
  }

  // 5. Real API Theo Dõi Chuyến Đi: GET /api/v1/telemetry/bookings/{id}/track
  async trackBookingLive(bookingId) {
    try {
      const data = await window.api.get(`/telemetry/bookings/${bookingId}/track`);
      showToast(`Đã lấy vị trí đơn #${bookingId} thành công!`, 'success');

      if (data.currentLatitude && data.currentLongitude) {
        if (this.liveTrackMarker) this.map.removeLayer(this.liveTrackMarker);

        const trackIcon = L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png',
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });

        this.liveTrackMarker = L.marker([data.currentLatitude, data.currentLongitude], { icon: trackIcon })
          .addTo(this.map)
          .bindPopup(`<strong>Đơn hàng #${bookingId}</strong><br/>Thợ đang ở: [${data.currentLatitude}, ${data.currentLongitude}]<br/>Tốc độ: ${data.currentSpeedKmh || 0} km/h`)
          .openPopup();

        this.map.panTo([data.currentLatitude, data.currentLongitude]);
      }
    } catch (err) {
      showToast(`Không tìm thấy hành trình đơn #${bookingId}: ${err.message}`, 'error');
    }
  }

  // 6. Real API Lịch Sử Vệt Đường: GET /api/v1/telemetry/bookings/{id}/history
  async loadTripHistory(bookingId) {
    this.tripHistoryLayer.clearLayers();
    try {
      const data = await window.api.get(`/telemetry/bookings/${bookingId}/history`);
      const logs = data.trackLogs || [];

      if (logs.length === 0) {
        showToast(`Đơn #${bookingId} chưa có lịch sử di chuyển trong CSDL.`, 'warning');
        return;
      }

      const points = logs.map(l => [l.latitude, l.longitude]);
      const polyline = L.polyline(points, {
        color: '#f43f5e',
        weight: 4,
        opacity: 0.85
      }).addTo(this.tripHistoryLayer);

      this.map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      showToast(`Đã vẽ ${points.length} tọa độ lịch sử hành trình đơn #${bookingId}!`, 'success');
    } catch (err) {
      showToast(`Không thể tải lịch sử hành trình: ${err.message}`, 'error');
    }
  }

  selectProviderForInvoice(providerId, lat, lng) {
    // Chuyển sang Tab 1 và điền đối tác
    document.querySelector('[data-tab="tab-pricing"]')?.click();
    showToast(`Đã chọn thợ #${providerId} cho hóa đơn!`, 'info');
  }
}

window.telemetryManager = new TelemetryManager();
