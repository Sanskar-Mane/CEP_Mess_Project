import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Navigation, Star, MapPin, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons (Leaflet + bundler issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const messIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to recenter map when user location changes
const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15);
  }, [center, map]);
  return null;
};

const MessMap = ({ messes }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  // GCOEARA, Avasari Khurd default center
  const defaultCenter = [18.7795, 73.8150];

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => setLocationError('Location access denied. Showing campus center.'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const getDirectionsUrl = (lat, lng, name) => {
    const dest = `${lat},${lng}`;
    const origin = userLocation ? `${userLocation[0]},${userLocation[1]}` : '';
    return `https://www.google.com/maps/dir/${origin}/${dest}`;
  };

  const mapCenter = userLocation || defaultCenter;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      {locationError && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-3 rounded-2xl mb-4 text-sm font-bold border border-amber-200 dark:border-amber-700/50 flex items-center gap-2">
          <MapPin size={16} /> {locationError}
        </div>
      )}

      <div className="rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl" style={{ height: '500px' }}>
        <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={mapCenter} />

          {/* User location marker */}
          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div className="text-center font-sans">
                  <p className="font-bold text-indigo-600 text-sm">📍 You are here</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Mess markers */}
          {messes.map((mess) => {
            const [lng, lat] = mess.location?.coordinates || [0, 0];
            if (lat === 0 && lng === 0) return null;
            return (
              <Marker key={mess._id} position={[lat, lng]} icon={messIcon}>
                <Popup>
                  <div className="font-sans min-w-[200px]">
                    <h3 className="font-extrabold text-slate-900 text-base mb-1">{mess.messName}</h3>
                    <p className="text-slate-500 text-xs mb-2 flex items-center gap-1">
                      <span>📍</span> {mess.messAddress || 'No address'}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        ⭐ {mess.ratingCount > 0 ? Number(mess.rating).toFixed(1) : 'New'}
                      </span>
                      <span className="text-slate-400 text-xs">{mess.ratingCount} reviews</span>
                    </div>
                    <a
                      href={getDirectionsUrl(lat, lng, mess.messName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-indigo-600 text-white text-center text-xs font-bold py-2 px-3 rounded-lg hover:bg-indigo-700 transition-colors no-underline"
                    >
                      🧭 Get Directions
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Mess list below map */}
      {messes.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Navigation size={18} className="text-indigo-500" /> All Messes on Map</h3>
          {messes.map((mess) => {
            const [lng, lat] = mess.location?.coordinates || [0, 0];
            if (lat === 0 && lng === 0) return null;
            return (
              <div key={mess._id} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{mess.messName}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{mess.messAddress || 'No address provided'}</p>
                </div>
                <a
                  href={getDirectionsUrl(lat, lng, mess.messName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm no-underline"
                >
                  <ExternalLink size={14} /> Directions
                </a>
              </div>
            );
          })}
        </div>
      )}

      {messes.length === 0 && (
        <div className="mt-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-12 rounded-[2rem] text-center border border-slate-200 dark:border-slate-700">
          <MapPin size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="font-black text-slate-900 dark:text-white text-xl mb-2">No Messes on Map</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Mess owners haven't set their locations yet.</p>
        </div>
      )}
    </div>
  );
};

export default MessMap;
