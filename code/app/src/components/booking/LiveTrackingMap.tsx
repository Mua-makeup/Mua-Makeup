import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { formatEtaText, formatDistanceText, computeHybridEta, getStreamModeBadge } from '@/utils/date';

interface Props {
  customerCoords: { latitude: number; longitude: number; address?: string };
  muaCoords: { latitude: number; longitude: number; heading?: number; speed?: number };
  etaMinutes?: number;
  distanceRemainingMeters?: number;
  muaName?: string;
  streamMode?: 'APPROACHING' | 'MOVING' | 'STOPPED';
  onRecenter?: () => void;
  role?: 'CUSTOMER' | 'MUA';
}

const GOONG_KEY = 'NDdGHjR87yAkm1ana5TUw0bH2FtJ4dC61cueMuPc';

function buildLeafletHtml(
  initCustLat: number,
  initCustLng: number,
  initMuaLat: number,
  initMuaLng: number,
  initHeading: number,
  role: 'CUSTOMER' | 'MUA' = 'CUSTOMER'
): string {
  const isMuaRole = role === 'MUA';
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

          /* 1. MUA PERSPECTIVE STYLES */
          .driver-marker-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
          }
          .driver-pulse-ring {
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(225, 29, 72, 0.35);
            animation: driver-radar-pulse 2s infinite ease-out;
          }
          @keyframes driver-radar-pulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .driver-self-dot {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #E11D48;
            border: 3.5px solid #FFFFFF;
            box-shadow: 0 0 14px rgba(225, 29, 72, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 2;
          }
          .driver-self-dot-inner {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #FFFFFF;
          }

          /* Destination Pin on MUA map */
          .dest-pin-container {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .dest-pin-badge {
            background: #0F172A;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 10px;
            border: 1.5px solid #FFFFFF;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            white-space: nowrap;
            margin-bottom: 2px;
          }
          .dest-pin-icon {
            width: 30px;
            height: 30px;
            border-radius: 15px;
            background: #059669;
            border: 2.5px solid #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 12px rgba(5, 150, 105, 0.7);
            font-size: 15px;
          }

          /* 2. CUSTOMER PERSPECTIVE STYLES */
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
          var isMuaView = ${isMuaRole};

          var initialCenter = isMuaView ? [muaLat, muaLng] : [custLat, custLng];

          var map = L.map('map', { 
            zoomControl: false,
            attributionControl: false
          }).setView(initialCenter, 15);

          // Sử dụng Google Maps raster tiles
          L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
            minZoom: 3
          }).addTo(map);

          // Sửa lỗi map size khi WebView mount
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

          // Setup Markers theo Role
          var createDriverIcon;
          var muaMarker;
          var custMarker;

          if (isMuaView) {
            // MUA View: Thợ là CHẤM ĐỎ GPS CỦA THỢ (Vị trí hiện tại của thợ)
            createDriverIcon = function(heading) {
              return L.divIcon({
                className: 'driver-marker-wrap',
                iconSize: [48, 48],
                iconAnchor: [24, 24],
                html: '<div class="driver-pulse-ring"></div><div class="driver-self-dot"><div class="driver-self-dot-inner"></div></div>'
              });
            };
            muaMarker = L.marker([muaLat, muaLng], { icon: createDriverIcon(${initHeading}) }).addTo(map);

            // Khách hàng là ĐIỂM ĐẾN (Destination Pin)
            var custIcon = L.divIcon({
              className: 'dest-pin-container',
              iconSize: [80, 50],
              iconAnchor: [40, 50],
              html: '<div class="dest-pin-badge">Điểm hẹn khách</div><div class="dest-pin-icon">📍</div>'
            });
            custMarker = L.marker([custLat, custLng], { icon: custIcon }).addTo(map);
          } else {
            // Customer View: Khách hàng là chấm đỏ "Bạn ở đây"
            var custIcon = L.divIcon({ className: 'cust-marker', iconSize: [22, 22], iconAnchor: [11, 11] });
            custMarker = L.marker([custLat, custLng], { icon: custIcon }).addTo(map);

            // Thợ là xe máy đang di chuyển tới
            createDriverIcon = function(heading) {
              return L.divIcon({
                className: 'mua-marker',
                iconSize: [36, 36],
                iconAnchor: [18, 18],
                html: '<span style="display:inline-block; transform: rotate(' + (heading || 0) + 'deg);">🛵</span>'
              });
            };
            muaMarker = L.marker([muaLat, muaLng], { icon: createDriverIcon(${initHeading}) }).addTo(map);
          }

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

          map.on('dragstart zoomstart touchstart', function() {
            hasUserInteracted = true;
          });

          // Tái định tâm chuẩn xác theo role
          window.recenterOnLocation = function() {
            hasUserInteracted = false;
            var pos = isMuaView ? muaMarker.getLatLng() : custMarker.getLatLng();
            map.setView(pos, 17, { animate: true, duration: 0.6 });
          };
          window.recenterOnMua = window.recenterOnLocation;

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

          if (muaLat && muaLng && custLat && custLng) {
            updateGoongRoute(muaLat, muaLng, custLat, custLng);
            lastRouteFetchTime = Date.now();
          }

          // Cập nhật vị trí trực tiếp
          window.handleIncomingUpdate = function(data) {
            try {
              if (!data || !data.lat || !data.lng) return;
              var newMuaLatLng = L.latLng(data.lat, data.lng);
              
              muaMarker.setLatLng(newMuaLatLng);

              if (data.heading !== undefined && createDriverIcon) {
                muaMarker.setIcon(createDriverIcon(data.heading));
              }

              if (data.custLat && data.custLng) {
                custLat = data.custLat;
                custLng = data.custLng;
                custMarker.setLatLng(L.latLng(custLat, custLng));
              }

              var currentPts = routeLine.getLatLngs();
              if (currentPts && currentPts.length > 0) {
                currentPts[0] = newMuaLatLng;
                routeLine.setLatLngs(currentPts);
              }

              if (!isInitialFitDone) {
                map.fitBounds(L.latLngBounds([newMuaLatLng, L.latLng(custLat, custLng)]), { padding: [50, 50], maxZoom: 16 });
                isInitialFitDone = true;
              } else if (!hasUserInteracted) {
                map.panTo(newMuaLatLng, { animate: true, duration: 0.8 });
              }

              var now = Date.now();
              var distMoved = map.distance(lastRouteOrigin, newMuaLatLng);
              if (!hasValidGoongRoute || (distMoved > 60 && now - lastRouteFetchTime > 15000)) {
                lastRouteFetchTime = now;
                lastRouteOrigin = newMuaLatLng;
                updateGoongRoute(data.lat, data.lng, data.custLat || custLat, data.custLng || custLng);
              }
            } catch(err) {}
          };

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
  role = 'CUSTOMER',
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isFollowing, setIsFollowing] = useState(true);

  // Goong base route state để tính Hybrid ETA mượt mà (không nhảy số)
  const [goongBaseDuration, setGoongBaseDuration] = useState<number | null>(null);
  const [goongBaseDistance, setGoongBaseDistance] = useState<number | null>(null);

  // Lưu tọa độ ban đầu để khởi tạo HTML cố định duy nhất 1 lần (Không reload WebView)
  const initialHtml = useMemo(() => {
    return buildLeafletHtml(
      customerCoords.latitude || 21.0285,
      customerCoords.longitude || 105.8542,
      muaCoords.latitude || 21.0285,
      muaCoords.longitude || 105.8542,
      muaCoords.heading || 0,
      role
    );
  }, [role]);

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
      if (window.recenterOnLocation) {
        window.recenterOnLocation();
      } else if (window.recenterOnMua) {
        window.recenterOnMua();
      }
      true;
    `);
  };

  // Tính cự ly tức thời giữa MUA và Khách hàng (ưu tiên từ Backend, fallback tính Haversine)
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

  // Hybrid ETA: Goong route ratio → fallback Backend etaMinutes (không nhảy số)
  const hybridEta = useMemo(
    () => computeHybridEta(goongBaseDuration, goongBaseDistance, effectiveDistance, etaMinutes ?? null),
    [goongBaseDuration, goongBaseDistance, effectiveDistance, etaMinutes]
  );

  const etaDisplayText = formatEtaText(hybridEta, effectiveDistance);
  const formattedDistance = formatDistanceText(effectiveDistance);
  const statusBadge = getStreamModeBadge(streamMode, isAtLocation);
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
          <Ionicons name={role === 'MUA' ? 'navigate' : 'flash'} size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={styles.etaTitle} numberOfLines={2}>
              {role === 'MUA' ? 'Lộ trình tới khách:' : 'Thời gian dự kiến còn lại:'}{'\n'}
              <Text style={[styles.etaHighlight, isAtLocation && { color: '#4ADE80' }]}>{etaDisplayText}</Text>
            </Text>
            <View style={[styles.statusBadgePill, { backgroundColor: statusBadge.bg, borderColor: statusBadge.color, borderWidth: 0.8 }]}>
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
