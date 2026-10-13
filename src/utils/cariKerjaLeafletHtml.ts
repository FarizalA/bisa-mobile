export function generateCariKerjaLeafletHtml(lat: number, lng: number, radius: number, jobs: any[]): string {
  const jobsJson = JSON.stringify(jobs);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif}html,body,#map{height:100%;width:100%;background:#e5e7eb}.leaflet-div-icon{background:transparent!important;border:none!important}.custom-popup .leaflet-popup-content-wrapper{border-radius:12px;padding:0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,.15)}.custom-popup .leaflet-popup-content{margin:0;width:200px!important}.popup-card{padding:12px;display:flex;flex-direction:column;gap:4px}</style></head><body><div id="map"></div><script>
const userLat=${lat},userLng=${lng},radiusKm=${radius},jobs=${jobsJson};
const zoom=radiusKm>=100?10:radiusKm>=25?11:radiusKm>=10?12:radiusKm>=5?13:radiusKm>=3?14:15;
const map=L.map('map',{zoomControl:false,attributionControl:false}).setView([userLat,userLng],zoom);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19}).addTo(map);

const userIcon=L.divIcon({className:'',html:'<div style="background:#10b981;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',iconSize:[22,22],iconAnchor:[11,11]});
L.marker([userLat,userLng],{icon:userIcon,zIndexOffset:9999}).addTo(map).bindPopup('<div style="font-weight:bold;font-size:12px;text-align:center;color:#059669;padding:4px">Lokasi Anda</div>');

const r = radiusKm >= 100 ? 50000 : radiusKm * 1000;
L.circle([userLat,userLng],{radius:r,color:'#10b981',fillColor:'#10b981',fillOpacity:0.12,weight:1.5}).addTo(map);

const jobIcon = L.divIcon({
  className: "custom",
  html: '<div style="background:#2563eb;width:18px;height:18px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

jobs.forEach(j=>{
  if(!j.latitude||!j.longitude) return;
  const m=L.marker([Number(j.latitude),Number(j.longitude)],{icon:jobIcon}).addTo(map);
  const title = String(j.judul).replace(/</g, "&lt;");
  const popup='<div class="popup-card"><div style="font-weight:800;font-size:13px;color:#111">'+title+'</div><div style="font-size:11px;color:#6b7280">'+j.kategori+'</div><div style="font-size:12px;font-weight:800;color:#059669;margin-top:4px">'+j.budget+'</div><button onclick="window.ReactNativeWebView ? window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'SELECT_JOB\\',id:\\''+j.id+'\\'})) : window.parent.postMessage({type:\\'SELECT_JOB\\',id:\\''+j.id+'\\'},\\'*\\')" style="margin-top:8px;width:100%;padding:7px;background:#10b981;color:white;border:none;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer">Lihat Detail</button></div>';
  m.bindPopup(popup, {className:'custom-popup'});
});

window.addEventListener('message',e=>{if(e.data&&e.data.type==='RECENTER') map.flyTo([userLat,userLng],15,{animate:true,duration:1.2});});
</script></body></html>`;
}
