export function generateRadarLeafletHtml(
  lat: number,
  lng: number,
  radius: number,
  providers: any[]
): string {
  const provsJson = JSON.stringify(providers);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif}html,body,#map{height:100%;width:100%;background:#f8fafc}.leaflet-div-icon{background:transparent!important;border:none!important}@keyframes spin{to{transform:rotate(360deg)}}@keyframes superGlow{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.85;transform:scale(1.08)}}@keyframes neonPulse{0%,100%{box-shadow:0 0 6px 1px rgba(56,189,248,.55),0 0 12px 3px rgba(56,189,248,.25)}50%{box-shadow:0 0 8px 2px rgba(56,189,248,.75),0 0 16px 4px rgba(56,189,248,.35)}}.custom-popup .leaflet-popup-content-wrapper{border-radius:18px;padding:0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,.15)}.custom-popup .leaflet-popup-content{margin:0;width:192px!important}.popup-card{padding:12px;display:flex;flex-direction:column;gap:8px}.leaflet-bottom.leaflet-right{bottom:64px!important}.leaflet-bottom.leaflet-left{bottom:64px!important}<\/style><\/head><body><div id="map"><\/div><script>
const userLat=${lat},userLng=${lng},radiusKm=${radius},providers=${provsJson};
const zoom=radiusKm>=100?10:radiusKm>=25?11:radiusKm>=10?12:radiusKm>=5?13:radiusKm>=3?14:15;
const map=L.map('map',{zoomControl:false,attributionControl:false}).setView([userLat,userLng],zoom);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19}).addTo(map);

function openProfile(id){
  var data={type:'OPEN_PROFILE',id:id};
  var str=JSON.stringify(data);
  if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage){
    window.ReactNativeWebView.postMessage(str);
  }
  if(window.parent && window.parent.postMessage){
    window.parent.postMessage(data,'*');
    window.parent.postMessage(str,'*');
  }
}

const userIcon=L.divIcon({html:'<div style="background:#2563eb;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"><\/div>',className:'',iconSize:[18,18],iconAnchor:[9,9]});
L.marker([userLat,userLng],{icon:userIcon,zIndexOffset:9999}).addTo(map).bindPopup('<div style="font-weight:bold;font-size:12px;text-align:center;padding:4px">Lokasi Anda<\/div>');
if(radiusKm<100) L.circle([userLat,userLng],{radius:radiusKm*1000,color:'#3b82f6',fillColor:'#3b82f6',fillOpacity:.08,weight:1,dashArray:'4 4'}).addTo(map);
function isBoostActive(lvl,until){if(!lvl||lvl==='standar')return false;if(!until)return true;return new Date(until)>new Date();}
const sorted=[...providers].sort((a,b)=>{const av=isBoostActive(a.radar_boost_level,a.radar_boost_until)?(a.radar_boost_level==='super'?2:1):0;const bv=isBoostActive(b.radar_boost_level,b.radar_boost_until)?(b.radar_boost_level==='super'?2:1):0;return av-bv;});
sorted.forEach(p=>{
 if(!p.latitude||!p.longitude) return;
 const lvl=p.radar_boost_level, until=p.radar_boost_until, boosted=isBoostActive(lvl,until), isInactive=p.is_active===false;
 const fallbackAvatar="https://ui-avatars.com/api/?name="+encodeURIComponent(p.name||'Mitra')+"&background=ea580c&color=ffffff&bold=true";
 const bg=(p.face_url && p.face_url.startsWith('http')) ? p.face_url : fallbackAvatar;
 const trusted=p.is_active!==false&&p.is_trusted?'<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.25);z-index:3;font-size:8px;color:#ea580c">★<\/div>':'';
 let html='',iconSize=[36,44],anchor=[18,44];
 if(isInactive){
   html='<div style="width:36px;height:36px;border-radius:50%;border:3px solid #9ca3af;background:white;background-image:url(\\''+bg+'\\');background-size:cover;background-position:center;box-shadow:0 4px 6px rgba(0,0,0,.2);filter:grayscale(1);opacity:.7;position:relative">'+trusted+'<\/div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #9ca3af;position:absolute;bottom:-11px;left:50%;transform:translateX(-50%);filter:grayscale(1)"><\/div>';
 } else if(boosted && lvl==='super'){
   iconSize=[52,60];anchor=[26,60];
   html='<div style="width:52px;height:52px;position:relative;display:flex;align-items:center;justify-content:center"><div style="position:absolute;inset:-7px;border-radius:50%;background:conic-gradient(from 0deg,#FF9EC6,#FFB5D8,#FFC8A2,#FFE69A,#A8E6CF,#8ED8FF,#B8A6FF,#FF9EC6);opacity:.6;filter:blur(10px);animation:superGlow 1.6s ease-in-out infinite"><\/div><div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,#FF9EC6,#FFB5D8,#FFC8A2,#FFE69A,#A8E6CF,#8ED8FF,#B8A6FF,#FF9EC6);animation:spin 1.8s linear infinite;padding:4.5px;box-shadow:0 0 14px rgba(255,158,198,.55),0 0 26px rgba(142,216,255,.45)"><div style="width:100%;height:100%;border-radius:50%;background:white"><\/div><\/div><div style="position:absolute;inset:4.5px;border-radius:50%;background:white;background-image:url(\\''+bg+'\\');background-size:cover;background-position:center;border:2px solid white;z-index:2;box-shadow:0 2px 10px rgba(0,0,0,.18)">'+trusted+'<\/div><\/div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #E8A6FF;position:absolute;bottom:-9px;left:50%;transform:translateX(-50%)"><\/div>';
 } else {
   const border=lvl==='menyala'?'#38bdf8':'#ea580c', bw=lvl==='menyala'?'2.5px':'3px', glow=lvl==='menyala'?'animation:neonPulse 1.8s infinite;':'';
   html='<div style="width:36px;height:36px;border-radius:50%;border:'+bw+' solid '+border+';background:white;background-image:url(\\''+bg+'\\');background-size:cover;background-position:center;box-shadow:0 4px 6px rgba(0,0,0,.3);position:relative;'+glow+'">'+trusted+'<\/div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid '+border+';position:absolute;bottom:-10px;left:50%;transform:translateX(-50%)"><\/div>';
 }
 const icon=L.divIcon({html:html,className:'',iconSize:iconSize,iconAnchor:anchor,popupAnchor:[0,-anchor[1]+4]});
 const sub=p.subscription_plan?'<span style="flex-shrink:0;font-size:9px;padding:1px 6px;background:linear-gradient(to right,#f59e0b,#f97316);color:white;font-weight:800;border-radius:999px">★ '+p.subscription_plan+'<\/span>':'';
 const popup='<div class="popup-card" style="cursor:pointer" onclick="openProfile(\\''+p.id+'\\')"><div style="display:flex;align-items:center;gap:8px;margin-bottom:2px"><img src="'+bg+'" onerror="this.onerror=null;this.src=\\''+fallbackAvatar+'\\';" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid #f3f4f6"/><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:13px;color:#111827;line-height:1.1;display:flex;align-items:center;gap:4px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(p.name||'')+'<\/span>'+sub+'<\/div><div style="font-size:10px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+((p.keahlian||'Penyedia Jasa').replace(/^Lainnya:\\s*/i,''))+'<\/div><\/div><\/div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;font-size:12px"><span style="display:flex;align-items:center;gap:2px;font-weight:700;color:#374151">★ '+(p.rating?Number(p.rating).toFixed(1):'New')+'<\/span><span style="color:#ea580c;font-weight:800">Rp '+(p.base_price?Number(p.base_price).toLocaleString('id-ID'):'-')+'<\/span><\/div>'+(p.is_active===false?'<div style="text-align:center;font-weight:700;font-size:11px;margin-top:8px;background:#f3f4f6;color:#6b7280;padding:6px;border-radius:8px">Sedang Tidak Aktif<\/div>':'<div style="text-align:center;font-weight:800;font-size:11px;margin-top:8px;background:#ea580c;color:white;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px">Lihat Profil →<\/div>')+'<\/div>';
 const zOff=boosted?(lvl==='super'?1000:500):0;
 L.marker([p.latitude,p.longitude],{icon:icon,zIndexOffset:zOff}).addTo(map).bindPopup(popup,{className:'custom-popup'});
});
window.recenterMap=function(){ try{ map.flyTo([userLat,userLng],15,{animate:true,duration:1.2}); }catch(e){} };
function handleRecenterMsg(e){ try{ var d=typeof e.data==='string'?JSON.parse(e.data):e.data; if(d&&d.type==='RECENTER'){ map.flyTo([userLat,userLng],15,{animate:true,duration:1.2}); } }catch(err){} }
window.addEventListener('message',handleRecenterMsg);
document.addEventListener('message',handleRecenterMsg);
<\/script><\/body><\/html>`;
}
