import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

interface Props {
  customerCoords: { latitude: number; longitude: number; address?: string };
  muaCoords: { latitude: number; longitude: number; heading?: number; speed?: number };
  etaMinutes?: number;
  distanceRemainingMeters?: number;
  muaName?: string;
  streamMode?: 'APPROACHING' | 'MOVING' | 'STOPPED';
  onRecenter?: () => void;
}

const GOONG_KEY = 'NDdGHjR87yAkm1ana5TUw0bH2FtJ4dC61cueMuPc';

function buildLeafletHtml(initCustLat: number, initCustLng: number, initMuaLat: number, initMuaLng: number, initHeading: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #E2E8F0; overflow: hidden; }
          #map { width: 100%; height: 100%; background: #E2E8F0; }
          .cust-marker {
            background: #E11D48;
            border: 3px solid #FFFFFF;
            width: 22px; height: 22px;
            border-radius: 50%;
            box-shadow: 0 0 14px rgba(225, 29, 72, 0.85);
          }
          .mua-marker {
            background: #F59E0B;
            border: 3px solid #FFFFFF;
            width: 36px; height: 36px;
            border-radius: 50%;
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.95);
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
            transition: transform 0.3s ease-out;
          }
          .leaflet-tile {
            filter: contrast(102%) brightness(98%);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function decodePolyline(encoded) {
            var points = [];
            var index = 0, len = encoded.length;
            var lat = 0, lng = 0;
            while (index < len) {
              var b, shift = 0, result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
              lat += dlat;
              shift = 0;
              result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
              lng += dlng;
              points.push([lat / 1e5, lng / 1e5]);
            }
            return points;
          }

          var custLat = ${initCustLat};
          var custLng = ${initCustLng};
          var muaLat = ${initMuaLat};
          var muaLng = ${initMuaLng};

          var map = L.map('map', { 
            zoomControl: false,
            attributionControl: false
          }).setView([custLat, custLng], 15);

          // Sử dụng Google Maps raster tiles: Load tức thì <50ms tại Việt Nam, không bao giờ bị xám hay nghẽn như OSM
          L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
            minZoom: 3
          }).addTo(map);

          // Sửa triệt để lỗi màn hình xám/đen khi WebView vừa mount trong ScrollView
          window.fixMapSize = function() {
            if (map) {
              map.invalidateSize();
            }
          };
          setTimeout(window.fixMapSize, 100);
          setTimeout(window.fixMapSize, 400);
          setTimeout(window.fixMapSize, 1000);
          setTimeout(window.fixMapSize, 2500);
          window.addEventListener('resize', window.fixMapSize);

          // Customer Pin
          var custIcon = L.divIcon({ className: 'cust-marker', iconSize: [22, 22], iconAnchor: [11, 11] });
          var custMarker = L.marker([custLat, custLng], { icon: custIcon }).addTo(map);

          // MUA Vehicle Pin
          var createMuaIcon = function(heading) {
            return L.divIcon({
              className: 'mua-marker',
              iconSize: [36, 36],
              iconAnchor: [18, 18],
              html: '<span style="display:inline-block; transform: rotate(' + (heading || 0) + 'deg);">🛵</span>'
            });
          };
          var muaMarker = L.marker([muaLat, muaLng], { icon: createMuaIcon(${initHeading}) }).addTo(map);

          // Polyline route
          var routeLine = L.polyline([[muaLat, muaLng], [custLat, custLng]], {
            color: '#E11D48',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          var lastRouteOrigin = L.latLng(muaLat, muaLng);
          var lastRouteFetchTime = 0;
          var isInitialFitDone = false;
          var hasUserInteracted = false;
          var hasValidGoongRoute = false;

          // Theo dõi cử chỉ người dùng: Khi khách tự tay vuốt hoặc phóng to, KHÔNG tự động zoom co nhỏ lại
          map.on('dragstart zoomstart touchstart', function() {
            hasUserInteracted = true;
          });

          // Tái định tâm về vị trí thợ (Chức năng giống Google Maps)
          window.recenterOnMua = function() {
            hasUserInteracted = false;
            var pos = muaMarker.getLatLng();
            map.setView(pos, 17, { animate: true, duration: 0.6 });
          };

          function updateGoongRoute(originLat, originLng, destLat, destLng) {
            var url = 'https://rsapi.goong.io/Direction?origin=' + originLat + ',' + originLng + '&destination=' + destLat + ',' + destLng + '&vehicle=bike&api_key=${GOONG_KEY}';
            fetch(url)
              .then(function(res) { return res.json(); })
              .then(function(data) {
                if (data && data.routes && data.routes.length > 0 && data.routes[0].overview_polyline && data.routes[0].overview_polyline.points) {
                  var pts = decodePolyline(data.routes[0].overview_polyline.points);
                  if (pts && pts.length > 0) {
                    routeLine.setLatLngs(pts);
                    hasValidGoongRoute = true;
                    if (!isInitialFitDone) {
                      isInitialFitDone = true;
                      map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 17 });
                    }
                    return;
                  }
                }
                routeLine.setLatLngs([[originLat, originLng], [destLat, destLng]]);
                if (!isInitialFitDone) {
                  isInitialFitDone = true;
                  map.fitBounds(L.latLngBounds([[originLat, originLng], [destLat, destLng]]), { padding: [50, 50] });
                }
              })
              .catch(function() {
                routeLine.setLatLngs([[originLat, originLng], [destLat, destLng]]);
                if (!isInitialFitDone) {
                  isInitialFitDone = true;
                  map.fitBounds(L.latLngBounds([[originLat, originLng], [destLat, destLng]]), { padding: [50, 50] });
                }
              });
          }

          // Initial route fetch nếu tọa độ hợp lệ
          if (muaLat && muaLng && custLat && custLng) {
            updateGoongRoute(muaLat, muaLng, custLat, custLng);
            lastRouteFetchTime = Date.now();
          }

          // Hàm cập nhật vị trí trực tiếp không qua reload trang (Google Maps Standard)
          window.handleIncomingUpdate = function(data) {
            try {
              if (!data || !data.lat || !data.lng) return;
              var newMuaLatLng = L.latLng(data.lat, data.lng);
              
              // Di chuyển marker mượt mà
              muaMarker.setLatLng(newMuaLatLng);

              if (data.heading !== undefined) {
                muaMarker.setIcon(createMuaIcon(data.heading));
              }

              if (data.custLat && data.custLng) {
                custLat = data.custLat;
                custLng = data.custLng;
                custMarker.setLatLng(L.latLng(custLat, custLng));
              }

              // Cập nhật đầu của đường polyline theo xe
              var currentPts = routeLine.getLatLngs();
              if (currentPts && currentPts.length > 0) {
                currentPts[0] = newMuaLatLng;
                routeLine.setLatLngs(currentPts);
              }

              // Nếu chưa từng fit bounds và chưa có tương tác
              if (!isInitialFitDone) {
                map.fitBounds(L.latLngBounds([newMuaLatLng, L.latLng(custLat, custLng)]), { padding: [50, 50], maxZoom: 16 });
                isInitialFitDone = true;
              } else if (!hasUserInteracted) {
                // Nếu khách KHÔNG tương tác vuốt, camera tự động di chuyển theo xe (giữ zoom hiện tại)
                map.panTo(newMuaLatLng, { animate: true, duration: 0.8 });
              }

              // Vẽ lại lộ trình Goong Direction khi thợ đi xa hơn 60m hoặc lần đầu chưa vẽ được
              var now = Date.now();
              var distMoved = map.distance(lastRouteOrigin, newMuaLatLng);
              if (!hasValidGoongRoute || (distMoved > 60 && now - lastRouteFetchTime > 15000)) {
                lastRouteFetchTime = now;
                lastRouteOrigin = newMuaLatLng;
                updateGoongRoute(data.lat, data.lng, data.custLat || custLat, data.custLng || custLng);
              }
            } catch(err) {}
          };

          // Dự phòng cho postMessage
          window.addEventListener('message', function(e) {
            try {
              var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
              if (d && d.type === 'UPDATE_MUA') window.handleIncomingUpdate(d);
            } catch(err) {}
          });
        </script>
      </body>
    </html>
  `;
}

export const LiveTrackingMap: React.FC<Props> = ({
  customerCoords,
  muaCoords,
  etaMinutes,
  distanceRemainingMeters = 0,
  muaName = 'Chuyên viên Make-up',
  streamMode,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isFollowing, setIsFollowing] = useState(true);

  // Lưu tọa độ ban đầu để khởi tạo HTML cố định duy nhất 1 lần (Không reload WebView)
  const initialHtml = useMemo(() => {
    return buildLeafletHtml(
      customerCoords.latitude || 21.0285,
      customerCoords.longitude || 105.8542,
      muaCoords.latitude || 21.0285,
      muaCoords.longitude || 105.8542,
      muaCoords.heading || 0
    );
  }, []); // Cố định mảng rỗng để không bao giờ reload lại HTML

  // Gửi trực tiếp qua injectJavaScript để đảm bảo 100% không reload và không mất gói tin
  useEffect(() => {
    if (webViewRef.current && muaCoords.latitude && muaCoords.longitude) {
      const payload = {
        type: 'UPDATE_MUA',
        lat: muaCoords.latitude,
        lng: muaCoords.longitude,
        heading: muaCoords.heading || 0,
        speed: muaCoords.speed || 0,
        custLat: customerCoords.latitude,
        custLng: customerCoords.longitude,
      };

      webViewRef.current.injectJavaScript(`
        if (window.handleIncomingUpdate) {
          window.handleIncomingUpdate(${JSON.stringify(payload)});
        }
        true;
      `);
    }
  }, [
    muaCoords.latitude,
    muaCoords.longitude,
    muaCoords.heading,
    muaCoords.speed,
    customerCoords.latitude,
    customerCoords.longitude,
  ]);

  const handleRecenter = () => {
    setIsFollowing(true);
    webViewRef.current?.injectJavaScript(`
      if (window.recenterOnMua) {
        window.recenterOnMua();
      }
      true;
    `);
  };

  // Tính cự ly thực tế tức thời giữa tọa độ MUA và Khách hàng
  const effectiveDistance = useMemo(() => {
    if (distanceRemainingMeters && distanceRemainingMeters > 0) {
      return distanceRemainingMeters;
    }
    if (
      customerCoords.latitude &&
      customerCoords.longitude &&
      muaCoords.latitude &&
      muaCoords.longitude
    ) {
      const R = 6371e3;
      const phi1 = (muaCoords.latitude * Math.PI) / 180;
      const phi2 = (customerCoords.latitude * Math.PI) / 180;
      const deltaPhi = ((customerCoords.latitude - muaCoords.latitude) * Math.PI) / 180;
      const deltaLambda = ((customerCoords.longitude - muaCoords.longitude) * Math.PI) / 180;
      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    }
    return 0;
  }, [
    distanceRemainingMeters,
    customerCoords.latitude,
    customerCoords.longitude,
    muaCoords.latitude,
    muaCoords.longitude,
  ]);

  const isAtLocation = effectiveDistance > 0 && effectiveDistance <= 25;

  const formattedDistance = isAtLocation
    ? 'Tại điểm hẹn (< 25 m)'
    : effectiveDistance < 1000
    ? `${Math.round(effectiveDistance)} m`
    : `${(effectiveDistance / 1000).toFixed(1)} km`;

  const getEtaText = () => {
    if (isAtLocation) {
      return 'Đã đến nơi';
    }
    if (etaMinutes !== undefined && etaMinutes !== null && etaMinutes > 0) {
      return `~${etaMinutes} phút`;
    }
    if (effectiveDistance < 300) {
      return '~1 - 2 phút';
    }
    const estimated = Math.max(1, Math.ceil((effectiveDistance / 1000.0) / 25 * 60));
    return `~${estimated} phút`;
  };

  const getStatusBadge = () => {
    if (isAtLocation) {
      return { text: 'ĐÃ ĐẾN NƠI', color: '#10B981', bg: 'rgba(16, 185, 129, 0.2)', icon: 'checkmark-circle' };
    }
    if (streamMode === 'APPROACHING' || effectiveDistance < 300) {
      return { text: 'SẮP TỚI NƠI', color: '#10B981', bg: 'rgba(16, 185, 129, 0.2)', icon: 'navigate-circle' };
    }
    if (streamMode === 'STOPPED' || (muaCoords.speed !== undefined && muaCoords.speed < 2.5)) {
      return { text: 'ĐANG DỪNG', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.2)', icon: 'pause-circle' };
    }
    return { text: 'ĐANG DI CHUYỂN', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.2)', icon: 'speedometer' };
  };

  const statusBadge = getStatusBadge();
  const displaySpeed = muaCoords.speed && muaCoords.speed >= 2.5 ? Math.round(muaCoords.speed) : 0;

  // Memoize WebView source object reference để react-native-webview tuyệt đối KHÔNG bao giờ reload lại HTML khi parent re-render
  const webViewSource = useMemo(() => ({ html: initialHtml }), [initialHtml]);

  return (
    <View style={styles.container}>
      {/* MAP VIEW CONTAINER */}
      <View style={styles.mapWrapper}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={initialHtml}
            style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#E2E8F0' }}
            title="Live GPS Tracking Map"
          />
        ) : (
          <WebView
            key="live-tracking-stable-webview"
            ref={webViewRef}
            originWhitelist={['*']}
            source={webViewSource}
            style={styles.webView}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
            onLoadEnd={() => {
              webViewRef.current?.injectJavaScript(`
                if (window.fixMapSize) {
                  window.fixMapSize();
                }
                true;
              `);
            }}
          />
        )}
      </View>

      {/* TOP FLOATING ETA PILL */}
      <View style={styles.floatingEtaCard}>
        <View style={styles.etaIconCircle}>
          <Ionicons name="flash" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.etaTitle}>
              Dự kiến đến sau: <Text style={styles.etaHighlight}>{getEtaText()}</Text>
            </Text>
            <View style={[styles.statusBadgePill, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>{statusBadge.text}</Text>
            </View>
          </View>
          <Text style={styles.etaSub}>
            Cự ly còn lại {formattedDistance} • Tốc độ {displaySpeed} km/h
          </Text>
        </View>
      </View>

      {/* FLOATING RE-CENTER BUTTON (GIỐNG GOOGLE MAPS) */}
      <TouchableOpacity
        style={styles.recenterBtn}
        onPress={handleRecenter}
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={20} color="#E11D48" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  floatingEtaCard: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  etaIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  etaHighlight: {
    color: '#FDE047',
    fontWeight: '800',
  },
  etaSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 25,
  },
});
