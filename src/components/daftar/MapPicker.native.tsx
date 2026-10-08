import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { Navigation } from "lucide-react-native";

type Props = {
  position: { lat: number; lng: number } | null;
  setPosition: (p: { lat: number; lng: number }) => void;
};

export default function MapPickerNative({ position, setPosition }: Props) {
  const webViewRef = useRef<any>(null);
  const initialLat = position?.lat ?? -7.52; // Default Majenang
  const initialLng = position?.lng ?? 108.77;

  // Sync position from outside to WebView map when position prop changes
  useEffect(() => {
    if (position && webViewRef.current) {
      const script = `
        if (window.map && window.updateMapPin) {
          window.updateMapPin(${position.lat}, ${position.lng});
        }
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [position?.lat, position?.lng]);

  const handleGPSPress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        const newPos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setPosition(newPos);
      }
    } catch (e) {
      console.warn("Error getting location:", e);
    }
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          background: #f3f4f6;
        }
        .custom-pin {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pin-inner {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #ff6b00, #ff8800);
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 6px 16px rgba(255,107,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pin-dot {
          width: 12px;
          height: 12px;
          background: #ffffff;
          border-radius: 50%;
          transform: rotate(45deg);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pin-center {
          width: 6px;
          height: 6px;
          background: #ff6b00;
          border-radius: 50%;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${initialLat}, ${initialLng}], ${position ? 16 : 13});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        var pinIcon = L.divIcon({
          className: 'custom-pin',
          html: '<div class="pin-inner"><div class="pin-dot"><div class="pin-center"></div></div></div>',
          iconSize: [40, 50],
          iconAnchor: [20, 48]
        });

        var marker = null;
        ${position ? `
          marker = L.marker([${position.lat}, ${position.lng}], { draggable: true, icon: pinIcon }).addTo(map);
          marker.on('dragend', function() {
            var ll = marker.getLatLng();
            sendToRN(ll.lat, ll.lng);
          });
        ` : ''}

        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          if (!marker) {
            marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
            marker.on('dragend', function() {
              var ll = marker.getLatLng();
              sendToRN(ll.lat, ll.lng);
            });
          } else {
            marker.setLatLng([lat, lng]);
          }
          sendToRN(lat, lng);
        });

        function window_updateMapPin(lat, lng) {
          if (!marker) {
            marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
            marker.on('dragend', function() {
              var ll = marker.getLatLng();
              sendToRN(ll.lat, ll.lng);
            });
          } else {
            marker.setLatLng([lat, lng]);
          }
          map.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
        }
        window.updateMapPin = window_updateMapPin;

        function sendToRN(lat, lng) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'location_selected', lat: lat, lng: lng }));
          }
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View className="h-64 w-full rounded-2xl overflow-hidden border border-gray-200 relative bg-gray-100">
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: mapHtml }}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "location_selected") {
              setPosition({ lat: data.lat, lng: data.lng });
            }
          } catch (e) {
            console.warn("WebView message parse error:", e);
          }
        }}
        scrollEnabled={false}
        style={{ flex: 1 }}
      />

      {/* Button floating GPS auto-detect */}
      <TouchableOpacity
        onPress={handleGPSPress}
        activeOpacity={0.8}
        className="absolute bottom-3 right-3 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-md flex-row items-center gap-1.5"
      >
        <Navigation size={14} color="#ff6b00" />
        <Text className="text-[11px] font-bold text-gray-900">Deteksi GPS</Text>
      </TouchableOpacity>

      {/* Floating coordinates indicator */}
      {position ? (
        <View className="absolute top-3 left-3 bg-black/75 px-3 py-1.5 rounded-full">
          <Text className="text-[10px] font-semibold text-white">
            📍 {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </Text>
        </View>
      ) : (
        <View className="absolute top-3 left-3 bg-orange-500/90 px-3 py-1.5 rounded-full">
          <Text className="text-[10px] font-bold text-white">
            Klik/geser peta untuk tentukan lokasi
          </Text>
        </View>
      )}
    </View>
  );
}
