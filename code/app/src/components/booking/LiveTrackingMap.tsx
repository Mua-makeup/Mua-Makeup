import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

interface Props {
  customerCoords: { latitude: number; longitude: number; address?: string };
  muaCoords: { latitude: number; longitude: number; heading?: number; speed?: number };
  etaMinutes?: number;
  distanceRemainingMeters?: number;
  muaName?: string;
  onRecenter?: () => void;
}

const GOONG_KEY = 'NDdGHjR87yAkm1ana5TUw0bH2FtJ4dC61cueMuPc';

export const LiveTrackingMap: React.FC<Props> = ({
  customerCoords,
  muaCoords,
  etaMinutes = 12,
  distanceRemainingMeters = 2400,
  muaName = 'Chuyên viên Make-up',
}) => {
  const webViewRef = useRef<WebView>(null);

  // Send update to Leaflet map inside WebView on Android/iOS
  useEffect(() => {
    if (webViewRef.current && muaCoords.latitude && muaCoords.longitude) {
      const message = JSON.stringify({
        type: 'UPDATE_MUA',
        lat: muaCoords.latitude,
        lng: muaCoords.longitude,
        heading: muaCoords.heading || 0,
        speed: muaCoords.speed || 0,
      });
      webViewRef.current.postMessage(message);
    }
  }, [muaCoords]);

  const formattedDistance =
    distanceRemainingMeters < 1000
      ? `${Math.round(distanceRemainingMeters)} m`
      : `${(distanceRemainingMeters / 1000).toFixed(1)} km`;

  // HTML Map with Leaflet JS for seamless cross-platform realtime rendering
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0B0F19; }
          .cust-marker {
            background: #E11D48;
            border: 3px solid #FFFFFF;
            width: 20px; height: 20px;
            border-radius: 50%;
            box-shadow: 0 0 14px rgba(225, 29, 72, 0.8);
          }
          .mua-marker {
            background: #F59E0B;
            border: 3px solid #FFFFFF;
            width: 26px; height: 26px;
            border-radius: 50%;
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.9);
            display: flex; align-items: center; justify-content: center;
            font-size: 14px;
            transition: transform 0.5s ease;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${customerCoords.latitude}, ${customerCoords.longitude}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: ''
          }).addTo(map);

          // Customer Pin
          var custIcon = L.divIcon({ className: 'cust-marker', iconSize: [20, 20], iconAnchor: [10, 10] });
          var custMarker = L.marker([${customerCoords.latitude}, ${customerCoords.longitude}], { icon: custIcon }).addTo(map);

          // MUA Vehicle Pin
          var muaIcon = L.divIcon({
            className: 'mua-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            html: '<span style="transform: rotate(${muaCoords.heading || 0}deg);">🛵</span>'
          });
          var muaMarker = L.marker([${muaCoords.latitude}, ${muaCoords.longitude}], { icon: muaIcon }).addTo(map);

          // Polyline route
          var routeLine = L.polyline([
            [${muaCoords.latitude}, ${muaCoords.longitude}],
            [${customerCoords.latitude}, ${customerCoords.longitude}]
          ], { color: '#E11D48', weight: 4, dashArray: '6, 8', opacity: 0.85 }).addTo(map);

          // Fit bounds
          map.fitBounds(L.latLngBounds([
            [${muaCoords.latitude}, ${muaCoords.longitude}],
            [${customerCoords.latitude}, ${customerCoords.longitude}]
          ]), { padding: [50, 50] });

          // Listen for React Native updates
          window.addEventListener('message', function(e) {
            try {
              var data = JSON.parse(e.data);
              if (data.type === 'UPDATE_MUA') {
                var newLatLng = new L.LatLng(data.lat, data.lng);
                muaMarker.setLatLng(newLatLng);
                routeLine.setLatLngs([newLatLng, [${customerCoords.latitude}, ${customerCoords.longitude}]]);
              }
            } catch(err) {}
          });
        </script>
      </body>
    </html>
  `;

  // Fallback Static Map URL for Goong Maps
  const staticMapUrl = `https://rsapi.goong.io/staticmap/route?origin=${muaCoords.latitude},${muaCoords.longitude}&destination=${customerCoords.latitude},${customerCoords.longitude}&width=600&height=400&api_key=${GOONG_KEY}`;

  return (
    <View style={styles.container}>
      {/* MAP VIEW CONTAINER */}
      <View style={styles.mapWrapper}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={leafletHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Live GPS Tracking Map"
          />
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            style={styles.webView}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* TOP FLOATING ETA PILL */}
      <View style={styles.floatingEtaCard}>
        <View style={styles.etaIconCircle}>
          <Ionicons name="flash" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.etaTitle}>
            Dự kiến đến sau: <Text style={styles.etaHighlight}>~{etaMinutes} phút</Text>
          </Text>
          <Text style={styles.etaSub}>
            Cự ly còn lại {formattedDistance} • Tốc độ {(muaCoords.speed || 30).toFixed(0)} km/h
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0B0F19',
  },
  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0B0F19',
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
});
