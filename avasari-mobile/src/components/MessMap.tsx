import React from 'react';
import { StyleSheet, View, Linking, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MessMap({ messes = [] }) {
    // Default center coordinates (Avasari area)
    const defaultLat = messes.length > 0 && messes[0].location?.coordinates?.[1] ? messes[0].location.coordinates[1] : 18.9900;
    const defaultLng = messes.length > 0 && messes[0].location?.coordinates?.[0] ? messes[0].location.coordinates[0] : 73.9200;

    // Filter messes that have saved coordinates
    const validMesses = messes.filter(
        (m) => m.location?.coordinates && m.location.coordinates[0] !== 0
    );

    // Generate Leaflet HTML
    const leafletHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
          .custom-popup { font-family: sans-serif; font-size: 13px; text-align: center; }
          .custom-popup b { font-size: 15px; color: #0f172a; }
          /* Styling for our new native-looking button */
          .dir-btn { 
            background-color: #4f46e5; color: white; border: none; 
            padding: 10px 12px; border-radius: 8px; margin-top: 10px; 
            width: 100%; font-weight: bold; font-size: 13px; 
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${defaultLat}, ${defaultLng}], 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);

          var messes = ${JSON.stringify(validMesses)};

          // This function talks to our React Native code!
          function getDirections(lat, lng) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'directions', lat: lat, lng: lng }));
          }

          messes.forEach(function(mess) {
            var lng = mess.location.coordinates[0];
            var lat = mess.location.coordinates[1];
            var rating = mess.rating ? Number(mess.rating).toFixed(1) : 'New';
            var distBadge = (mess.distanceKm !== undefined && mess.distanceKm !== null)
              ? '<div style="background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 999px; display: inline-block; margin: 4px 0;">📍 ' + mess.distanceKm + ' km away</div><br/>'
            var topChefBadge = mess.isTopChef
              ? '<div style="background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; font-size: 11px; font-weight: 900; padding: 3px 8px; border-radius: 999px; display: inline-block; margin: 4px 0; border: 1px solid #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);">👑 Campus Top Chef</div><br/>'
              : '';
            var tagsHtml = (mess.topTags && mess.topTags.length > 0)
              ? '<div style="margin: 4px 0;">' + mess.topTags.map(function(t) { return '<span style="background: #e0e7ff; color: #3730a3; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin: 1px 2px; display: inline-block;">🏷️ ' + t + '</span>'; }).join('') + '</div>'
              : '';

            // We added the button to the popup content here
            var popupContent = '<div class="custom-popup">' +
              topChefBadge +
              '<b>' + mess.messName + '</b><br/>' +
              tagsHtml +
              distBadge +
              '⭐ ' + rating + ' (' + (mess.ratingCount || 0) + ' reviews)<br/>' +
              '<small>' + (mess.messAddress || 'Avasari') + '</small><br/>' +
              '<button class="dir-btn" onclick="getDirections(' + lat + ', ' + lng + ')">Get Directions 📍</button>' +
              '</div>';

            L.marker([lat, lng]).addTo(map).bindPopup(popupContent);
          });
        </script>
      </body>
    </html>
  `;

    // This catches the message from the HTML and opens Google Maps
    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'directions') {
                // Construct the Google Maps Directions URL
                const url = `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`;

                // Open the native Google Maps app on the phone
                Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Google Maps on your phone.'));
            }
        } catch (error) {
            console.error("Failed to parse message from WebView:", error);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html: leafletHTML }}
                style={styles.map}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={handleMessage} // We attach our listener here
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 450,
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f1f5f9',
    },
    map: {
        flex: 1,
    },
});