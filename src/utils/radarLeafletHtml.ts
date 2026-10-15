export function generateRadarLeafletHtml(
  lat: number,
  lng: number,
  radius: number,
  providers: any[]
): string {
  const provsJson = JSON.stringify(providers);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif}html,body,#map{height:100%;width:100%;background:#f8fafc}.leaflet-div-icon{background:transparent!important;border:none!important}@keyframes spin{to{transform:rotate(360deg)}}@keyframes superGlow{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.85;transform:scale(1.08)}}@keyframes neonPulse{0%,100%{box-shadow:0 0 6px 1px rgba(56,189,248,.55),0 0 12px 3px rgba(56,189,248,.25)}50%{box-shadow:0 0 8px 2px rgba(56,189,248,.75),0 0 16px 4px rgba(56,189,248,.35)}}.custom-popup .leaflet-popup-content-wrapper{border-radius:18px;padding:0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,.15)}.custom-popup .leaflet-popup-content{margin:0;width:192px!important}.popup-card{padding:12px;display:flex;flex-direction:column;gap:8px}.leaflet-bottom.leaflet-right{bottom:64px!important}.leaflet-bottom.leaflet-left{bottom:64px!important}
/* Tahap A: layering tumpukan + badge counter (aman RAM 4GB) */
.pin-stack-layer{position:absolute;top:-3px;right:-3px;width:36px;height:36px;border-radius:50%;background:#c2410c;border:2px solid #fff;box-shadow:0 2px 5px rgba(15,23,42,.28);opacity:0;transform:scale(.92);pointer-events:none;z-index:0;transition:opacity 150ms ease-out,transform 150ms ease-out}
.pin-host{position:relative;display:inline-block}
.pin-host.is-stacked .pin-stack-layer{opacity:1;transform:scale(1)}
.pin-cluster-badge{position:absolute;top:-5px;right:-6px;z-index:5;min-width:19px;height:19px;padding:0 4px;border-radius:999px;background:#991b1b;border:1.5px solid #fff;color:#fff;font-size:10px;font-weight:800;line-height:16px;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,.35);display:none;pointer-events:none}
.pin-host.is-stacked .pin-cluster-badge{display:block}
.leaflet-marker-icon.is-clustered-hidden{display:none!important}
body.is-heavy .pin-stack-layer{transition:none!important}
<\/style><\/head><body><div id="map"><\/div><script>
var userLat=${lat},userLng=${lng},radiusKm=${radius},providers=${provsJson};
function zoomForKm(r){ return r>=100?10:r>=25?11:r>=10?12:r>=5?13:r>=3?14:15; }
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([userLat,userLng],zoomForKm(radiusKm));
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19}).addTo(map);

function sendToRN(payload){
  var str = (typeof payload==='string') ? payload : JSON.stringify(payload);
  if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage){ window.ReactNativeWebView.postMessage(str); }
  try { window.parent.postMessage(str,'*'); } catch(e){}
}
function openProfile(id){ sendToRN({type:'OPEN_PROFILE',id:id}); }

var userIcon=L.divIcon({html:'<div style="background:#2563eb;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"><\/div>',className:'',iconSize:[18,18],iconAnchor:[9,9]});
var userMarker=L.marker([userLat,userLng],{icon:userIcon,zIndexOffset:9999}).addTo(map).bindPopup('<div style="font-weight:bold;font-size:12px;text-align:center;padding:4px">Lokasi Anda<\/div>');
var radiusCircle=null;
function drawRadiusCircle(){
  if(radiusCircle){ radiusCircle.remove(); radiusCircle=null; }
  if(radiusKm<100){ radiusCircle=L.circle([userLat,userLng],{radius:radiusKm*1000,color:'#3b82f6',fillColor:'#3b82f6',fillOpacity:.08,weight:1,dashArray:'4 4'}).addTo(map); }
}
drawRadiusCircle();

function isBoostActive(lvl,until){if(!lvl||lvl==='standar')return false;if(!until)return true;return new Date(until)>new Date();}

// ===== Tahap A: deteksi tabrakan berbasis piksel (<=40px) + badge counter =====
// Batas kompleksitas: normal (N<=40) pairwise O(N^2) maks 780 operasi; HEAVY pakai grid 40px O(N).
// Hard cap N<=MAX_MARKERS agar RAM 4GB tidak tersendat.
var COLLISION_DIST_PX=40, COLLISION_DIST_SQ=COLLISION_DIST_PX*COLLISION_DIST_PX, DEBOUNCE_MS=120;
var pinEntries=[]; // { provider, marker, latlng, clusteredInto, followers, point }
var clusterLeaders={}; // leaderId -> jumlah follower

function pinDistanceKm(p){
  var d = (typeof p.distance_km==='number') ? p.distance_km : p.distance;
  return (typeof d==='number') ? d : 999999;
}
// Prioritas leader: aktif -> terdekat -> rating tertinggi -> order terbanyak
function comparePinPriority(a,b){
  var aa=a.is_active?1:0, ab=b.is_active?1:0; if(aa!==ab) return ab-aa;
  var da=pinDistanceKm(a), db=pinDistanceKm(b); if(da!==db) return da-db;
  var ra=Number(a.rating)||0, rb=Number(b.rating)||0; if(ra!==rb) return rb-ra;
  return (Number(b.total_orders)||0)-(Number(a.total_orders)||0);
}
function debounce(fn,delay){var t=null;return function(){var c=this,a=arguments;if(t)clearTimeout(t);t=setTimeout(function(){fn.apply(c,a);},delay);};}

function registerMarker(provider,marker){
  pinEntries.push({provider:provider,marker:marker,latlng:marker.getLatLng(),clusteredInto:null,followers:[],point:null});
}

function recomputeCollisions(){
  var count=pinEntries.length;
  clusterLeaders={};
  if(count===0) return;
  for(var i=0;i<count;i++){
    var e=pinEntries[i];
    e.point=map.latLngToContainerPoint(e.latlng);
    e.clusteredInto=null; e.followers=[];
  }
  pinEntries.sort(function(a,b){return comparePinPriority(a.provider,b.provider);});

  if(!HEAVY){
    for(var a=0;a<count;a++){
      var leader=pinEntries[a]; if(leader.clusteredInto) continue;
      for(var b=a+1;b<count;b++){
        var cand=pinEntries[b]; if(cand.clusteredInto) continue;
        var dx=leader.point.x-cand.point.x, dy=leader.point.y-cand.point.y;
        if(dx*dx+dy*dy<=COLLISION_DIST_SQ){ cand.clusteredInto=leader.provider.id; leader.followers.push(cand); }
      }
    }
  } else {
    var grid={}, cell=COLLISION_DIST_PX;
    for(var k=0;k<count;k++){
      var item=pinEntries[k];
      var gx=Math.floor(item.point.x/cell), gy=Math.floor(item.point.y/cell), found=null;
      for(var ox=-1;ox<=1&&!found;ox++){for(var oy=-1;oy<=1&&!found;oy++){
        var bucket=grid[(gx+ox)+':'+(gy+oy)]; if(!bucket) continue;
        for(var c=0;c<bucket.length;c++){
          var ld=bucket[c], dX=ld.point.x-item.point.x, dY=ld.point.y-item.point.y;
          if(dX*dX+dY*dY<=COLLISION_DIST_SQ){ found=ld; break; }
        }
      }}
      if(found){ item.clusteredInto=found.provider.id; found.followers.push(item); }
      else { var key=gx+':'+gy; if(!grid[key]) grid[key]=[]; grid[key].push(item); }
    }
  }

  // Terapkan visual Collapsed: sembunyikan follower, badge +N di leader
  for(var m=0;m<count;m++){
    var cur=pinEntries[m];
    var el=cur.marker.getElement(); if(!el) continue;
    var host=el.querySelector('.pin-host'); var badge=el.querySelector('.pin-cluster-badge');
    if(cur.clusteredInto){
      el.classList.add('is-clustered-hidden');
      if(host) host.classList.remove('is-stacked');
    } else {
      el.classList.remove('is-clustered-hidden');
      var extra=cur.followers.length;
      cur.marker.setZIndexOffset((count-m)*10+(extra>0?500:0)+(cur.provider.radar_boost_level==='super'?1000:(cur.provider.radar_boost_level==='menyala'?500:0)));
      if(extra>0){
        clusterLeaders[cur.provider.id]=extra;
        if(host) host.classList.add('is-stacked');
        if(badge) badge.textContent='+'+extra;
      } else {
        if(host) host.classList.remove('is-stacked');
        if(badge) badge.textContent='';
      }
    }
  }
}
var debouncedRecompute=debounce(recomputeCollisions,DEBOUNCE_MS);
map.on('moveend',debouncedRecompute);
map.on('zoomend',debouncedRecompute);

// ===== Tahap B: spiderfy (mekar orbit) + garis penghubung =====
// Pin asli tetap di koordinat geo; saat mekar, pin dipindah visual lewat
// transform:translate() pada .pin-host, dan garis digambar di <canvas> overlay.
var ORBIT_RADIUS=72, ORBIT_2PIN_GAP=64;
var expandedLeaderId=null;       // provider.id leader yang sedang mekar
var expandedFollowers=[];        // entry follower yang sedang ditarik keluar

// Canvas overlay untuk garis penghubung (murni visual layar, ikut ukuran peta).
var connectorCanvas=document.createElement('canvas');
connectorCanvas.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:500';
var mapContainer=map.getContainer();
mapContainer.style.position='relative';
mapContainer.appendChild(connectorCanvas);
function sizeCanvas(){
  var r=mapContainer.getBoundingClientRect();
  connectorCanvas.width=r.width; connectorCanvas.height=r.height;
}
function clearConnectors(){
  var ctx=connectorCanvas.getContext('2d');
  if(ctx) ctx.clearRect(0,0,connectorCanvas.width,connectorCanvas.height);
}
function drawConnectors(centerPt,orbits){
  sizeCanvas();
  var ctx=connectorCanvas.getContext('2d'); if(!ctx) return;
  ctx.clearRect(0,0,connectorCanvas.width,connectorCanvas.height);
  ctx.strokeStyle='#94A3B8'; ctx.lineWidth=1.2; ctx.setLineDash([5,4]);
  ctx.globalAlpha=0; // fade-in disinkronkan via requestAnimationFrame
  var start=Date.now(), DUR=260;
  function frame(){
    var t=Math.min(1,(Date.now()-start)/DUR);
    ctx.clearRect(0,0,connectorCanvas.width,connectorCanvas.height);
    ctx.globalAlpha=t;
    ctx.beginPath();
    for(var i=0;i<orbits.length;i++){
      ctx.moveTo(centerPt.x,centerPt.y);
      ctx.lineTo(orbits[i].x,orbits[i].y);
    }
    ctx.stroke();
    if(t<1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function orbitPositions(centerPt,count){
  var pts=[];
  if(count===1){ pts.push({x:centerPt.x,y:centerPt.y-ORBIT_2PIN_GAP}); return pts; }
  if(count===2){
    pts.push({x:centerPt.x-ORBIT_2PIN_GAP/2,y:centerPt.y-ORBIT_2PIN_GAP/2});
    pts.push({x:centerPt.x+ORBIT_2PIN_GAP/2,y:centerPt.y+ORBIT_2PIN_GAP/2});
    return pts;
  }
  for(var i=0;i<count;i++){
    var theta=(2*Math.PI*i)/count - Math.PI/2;
    pts.push({x:centerPt.x+ORBIT_RADIUS*Math.cos(theta), y:centerPt.y+ORBIT_RADIUS*Math.sin(theta)});
  }
  return pts;
}

function resetHostTransform(entry){
  var el=entry.marker.getElement(); if(!el) return;
  var host=el.querySelector('.pin-host'); if(!host) return;
  if(HEAVY){ host.style.transition='none'; }
  else { host.style.transition='transform 170ms ease-in'; }
  host.style.transform='translate(0,0)';
}

function collapseSpiderfy(){
  if(!expandedLeaderId && expandedFollowers.length===0){ clearConnectors(); return; }
  var leaderEntry=null;
  for(var i=0;i<pinEntries.length;i++){ if(pinEntries[i].provider.id===expandedLeaderId){ leaderEntry=pinEntries[i]; break; } }
  if(leaderEntry) resetHostTransform(leaderEntry);
  for(var f=0;f<expandedFollowers.length;f++){ resetHostTransform(expandedFollowers[f]); }
  expandedLeaderId=null; expandedFollowers=[];
  clearConnectors();
  // Kembalikan badge leader + semprot ulang state collapsed.
  recomputeCollisions();
}

function expandSpiderfy(leaderEntry){
  var group=[leaderEntry].concat(leaderEntry.followers);
  if(group.length<2) return;
  expandedLeaderId=leaderEntry.provider.id;
  expandedFollowers=leaderEntry.followers.slice();

  var centerPt=map.latLngToContainerPoint(leaderEntry.latlng);
  var pts=orbitPositions(centerPt,group.length);

  // Sembunyikan badge leader, tampilkan semua pin (leader + follower).
  var leaderEl=leaderEntry.marker.getElement();
  if(leaderEl){
    leaderEl.classList.remove('is-clustered-hidden');
    var lh=leaderEl.querySelector('.pin-host'); if(lh) lh.classList.remove('is-stacked');
  }
  for(var i=0;i<group.length;i++){
    var entry=group[i];
    var el=entry.marker.getElement(); if(!el) continue;
    el.classList.remove('is-clustered-hidden');
    var host=el.querySelector('.pin-host'); if(!host) continue;
    // Leader tetap di titik asli; follower ditarik ke orbit.
    var fromPt=map.latLngToContainerPoint(entry.latlng);
    var toPt=pts[i];
    var dx=toPt.x-fromPt.x, dy=toPt.y-fromPt.y;
    if(HEAVY){ host.style.transition='none'; }
    else { host.style.transition='transform 270ms cubic-bezier(0.34,1.56,0.64,1)'; }
    host.style.transform='translate('+dx+'px,'+dy+'px)';
    entry.marker.setZIndexOffset(2000+i);
  }
  drawConnectors(centerPt,pts);
}

map.on('click',function(){ collapseSpiderfy(); });
map.on('movestart',function(){ collapseSpiderfy(); sendToRN({type:'MAP_MOVED'}); });
map.on('zoomstart',function(){ collapseSpiderfy(); });

// Batas marker supaya HP RAM 4GB tak crash di radius besar.
var MAX_MARKERS=60;
// Kalau marker banyak, matikan animasi CSS (ratusan animasi = repaint terus-menerus).
var HEAVY=providers.length>40;

function buildIcon(p,boosted,isInactive){
  var lvl=p.radar_boost_level;
  var fallbackAvatar='https://ui-avatars.com/api/?name='+encodeURIComponent(p.name||'Mitra')+'&background=ea580c&color=ffffff&bold=true';
  var bg=(p.face_url && String(p.face_url).startsWith('http')) ? p.face_url : fallbackAvatar;
  var trusted=(p.is_active!==false && p.is_trusted)?'<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.25);z-index:3;font-size:8px;color:#ea580c">★<\/div>':'';
  var html='',iconSize=[36,44],anchor=[18,44];
  if(isInactive){
    html='<div style="width:36px;height:36px;border-radius:50%;border:3px solid #9ca3af;background:white;background-image:url(\\''+bg+'\\');background-size:cover;background-position:center;box-shadow:0 4px 6px rgba(0,0,0,.2);filter:grayscale(1);opacity:.7;position:relative">'+trusted+'<\/div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #9ca3af;position:absolute;bottom:-11px;left:50%;transform:translateX(-50%);filter:grayscale(1)"><\/div>';
  } else if(boosted && lvl==='super'){
    iconSize=[52,60];anchor=[26,60];
    var spinA=HEAVY?'':'animation:spin 1.8s linear infinite;';
    var glowA=HEAVY?'':'animation:superGlow 1.6s ease-in-out infinite;';
    html='<div style="width:52px;height:52px;position:relative;display:flex;align-items:center;justify-content:center"><div style="position:absolute;inset:-7px;border-radius:50%;background:conic-gradient(from 0deg,#FF9EC6,#FFB5D8,#FFC8A2,#FFE69A,#A8E6CF,#8ED8FF,#B8A6FF,#FF9EC6);opacity:.6;filter:blur(10px);'+glowA+'"><\/div><div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,#FF9EC6,#FFB5D8,#FFC8A2,#FFE69A,#A8E6CF,#8ED8FF,#B8A6FF,#FF9EC6);'+spinA+'padding:4.5px;box-shadow:0 0 14px rgba(255,158,198,.55),0 0 26px rgba(142,216,255,.45)"><div style="width:100%;height:100%;border-radius:50%;background:white"><\/div><\/div><div style="position:absolute;inset:4.5px;border-radius:50%;background:white;background-image:url(\\''+bg+'\\');background-size:cover;background-position:center;border:2px solid white;z-index:2;box-shadow:0 2px 10px rgba(0,0,0,.18)">'+trusted+'<\/div><\/div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #E8A6FF;position:absolute;bottom:-9px;left:50%;transform:translateX(-50%)"><\/div>';
  } else {
    var border=lvl==='menyala'?'#38bdf8':'#ea580c', bw=lvl==='menyala'?'2.5px':'3px';
    var glow=(lvl==='menyala' && !HEAVY)?'animation:neonPulse 1.8s infinite;':'';
    html='<div style="width:36px;height:36px;border-radius:50%;border:'+bw+' solid '+border+';background:white;background-image:url(\\''+bg+'\\');background-size:cover;background-position:center;box-shadow:0 4px 6px rgba(0,0,0,.3);position:relative;'+glow+'">'+trusted+'<\/div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid '+border+';position:absolute;bottom:-10px;left:50%;transform:translateX(-50%)"><\/div>';
  }
  return { html:html, iconSize:iconSize, anchor:anchor, bg:bg, fallbackAvatar:fallbackAvatar };
}

function buildPopup(p,bg,fallbackAvatar){
  var sub=p.subscription_plan?'<span style="flex-shrink:0;font-size:9px;padding:1px 6px;background:linear-gradient(to right,#f59e0b,#f97316);color:white;font-weight:800;border-radius:999px">★ '+p.subscription_plan+'<\/span>':'';
  var nm=String(p.name||'').replace(/</g,'&lt;');
  var kh=String((p.keahlian||'Penyedia Jasa')).replace(/^Lainnya:\\s*/i,'').replace(/</g,'&lt;');
  return '<div class="popup-card" style="cursor:pointer" data-prof="'+p.id+'"><div style="display:flex;align-items:center;gap:8px;margin-bottom:2px"><img src="'+bg+'" onerror="this.onerror=null;this.src=\\''+fallbackAvatar+'\\';" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid #f3f4f6"/><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:13px;color:#111827;line-height:1.1;display:flex;align-items:center;gap:4px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+nm+'<\/span>'+sub+'<\/div><div style="font-size:10px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+kh+'<\/div><\/div><\/div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;font-size:12px"><span style="display:flex;align-items:center;gap:2px;font-weight:700;color:#374151">★ '+(p.rating?Number(p.rating).toFixed(1):'New')+'<\/span><span style="color:#ea580c;font-weight:800">Rp '+(p.base_price?Number(p.base_price).toLocaleString('id-ID'):'-')+'<\/span><\/div>'+(p.is_active===false?'<div style="text-align:center;font-weight:700;font-size:11px;margin-top:8px;background:#f3f4f6;color:#6b7280;padding:6px;border-radius:8px">Sedang Tidak Aktif<\/div>':'<div style="text-align:center;font-weight:800;font-size:11px;margin-top:8px;background:#ea580c;color:white;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px">Lihat Profil →<\/div>')+'<\/div>';
}

function addMarker(p,layer){
  if(!p.latitude||!p.longitude) return null;
  var boosted=isBoostActive(p.radar_boost_level,p.radar_boost_until), isInactive=p.is_active===false;
  var b=buildIcon(p,boosted,isInactive);
  // Tahap A: bungkus pin dengan .pin-host agar bisa diberi layering + badge counter.
  var html='<div class="pin-host">'+b.html+'<div class="pin-stack-layer"><\/div><div class="pin-cluster-badge">+0<\/div><\/div>';
  var icon=L.divIcon({html:html,className:'',iconSize:b.iconSize,iconAnchor:b.anchor,popupAnchor:[0,-b.anchor[1]+4]});
  var mk=L.marker([p.latitude,p.longitude],{icon:icon,zIndexOffset:boosted?(p.radar_boost_level==='super'?1000:500):0}).addTo(layer||map);
  mk.bindPopup(buildPopup(p,b.bg,b.fallbackAvatar),{className:'custom-popup'});
  registerMarker(p,mk);
  return mk;
}

// ===== BRIDGE: update peta TANPA reload WebView =====
// Marker放在 layer terpisah supaya bisa dibersihkan tanpa rebuild peta.
var markerLayer=L.layerGroup().addTo(map);

function renderProviders(list){
  markerLayer.clearLayers();
  pinEntries=[]; clusterLeaders={};
  var arr=(list||[]).slice(0,MAX_MARKERS);
  HEAVY=arr.length>40;
  try{ document.body.classList.toggle('is-heavy', HEAVY); }catch(e){}
  var sorted=arr.slice().sort(function(a,b){
    var av=isBoostActive(a.radar_boost_level,a.radar_boost_until)?(a.radar_boost_level==='super'?2:1):0;
    var bv=isBoostActive(b.radar_boost_level,b.radar_boost_until)?(b.radar_boost_level==='super'?2:1):0;
    return bv-av;
  });
  sorted.forEach(function(p){ addMarker(p,markerLayer); });
  recomputeCollisions();
  // Leaflet menambahkan elemen marker ke DOM secara asinkron; ulang setelah DOM siap.
  setTimeout(recomputeCollisions, 80);
}

renderProviders(providers);

// Klik pin: pin bertumpuk -> mekar (spiderfy); pin mekar -> kirim ke RN (bottom sheet); pin tunggal -> popup bawaan.
mapContainer.addEventListener('click',function(e){
  var t=e.target;
  if(!t) return;
  var hostEl=null, node=t;
  while(node && node!==mapContainer){ if(node.classList && node.classList.contains('pin-host')){ hostEl=node; break; } node=node.parentElement; }
  if(!hostEl) return;
  var iconEl=hostEl.closest('.leaflet-marker-icon');

  // Cari entry berdasar elemen marker
  var entry=null;
  for(var i=0;i<pinEntries.length;i++){
    if(pinEntries[i].marker.getElement()===iconEl){ entry=pinEntries[i]; break; }
  }
  if(!entry) return;

  // Sudah mekar -> kirim buka bottom sheet untuk pin yang diketuk.
  if(expandedLeaderId!==null){
    e.stopPropagation(); e.preventDefault();
    sendOpenSheet(entry.provider);
    return;
  }
  // Bertumpuk (leader punya follower) -> mekar.
  if(entry.followers && entry.followers.length>0){
    e.stopPropagation(); e.preventDefault();
    expandSpiderfy(entry);
    return;
  }
  // Pin tunggal -> biarkan popup bawaan Leaflet terbuka.
},true);

// Kirim data provider ke React Native untuk menampilkan Bottom Sheet profil.
function sendOpenSheet(p){
  sendToRN({
    type:'OPEN_PROFILE_SHEET',
    id:p.id, name:p.name, face_url:p.face_url||null,
    keahlian:p.keahlian||null, kategori:p.kategori||null,
    rating:(typeof p.rating==='number')?p.rating:null,
    base_price:(typeof p.base_price==='number')?p.base_price:null,
    distance_km:pinDistanceKm(p)
  });
}

// Klik isi popup (kartu "Lihat Profil") -> buka profil penuh (native) / kirim ke RN (web).
document.addEventListener('click',function(e){
  var t=e.target;
  if(!t) return;
  while(t && t.getAttribute && !t.getAttribute('data-prof')){ t=t.parentElement; }
  if(t && t.getAttribute && t.getAttribute('data-prof')){ openProfile(t.getAttribute('data-prof')); }
},true);

window.updateRadius=function(km){
  try{
    radiusKm=km;
    drawRadiusCircle();
    // Sengaja TIDAK zoom-out: biar user yang atur zoom sendiri.
    // Radius cuma memperbesar lingkaran cakupan; peta tetap pada zoom terkini.
  }catch(e){}
};

window.updateProviders=function(list){ try{ renderProviders(list); }catch(e){} };

window.updateUserLoc=function(lat,lng){
  try{
    userLat=lat; userLng=lng;
    userMarker.setLatLng([lat,lng]);
    drawRadiusCircle();
    // Tetap pakai zoom terkini user, jangan paksa zoom-out mengikuti radius.
    var cur=map.getZoom();
    map.setView([lat,lng], cur||15, {animate:false});
  }catch(e){}
};

window.recenterMap=function(){ try{ map.flyTo([userLat,userLng],15,{animate:true,duration:1.2}); }catch(e){} };
function handleRecenterMsg(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(!d) return;
    if(d.type==='RECENTER'){ map.flyTo([userLat,userLng],15,{animate:true,duration:1.2}); }
    else if(d.type==='RADAR_UPDATE'){
      // Web iframe: sinkron tanpa reload.
      if(typeof d.radius==='number' && window.updateRadius){ window.updateRadius(d.radius); }
      if(Array.isArray(d.providers) && window.updateProviders){ window.updateProviders(d.providers); }
    }
  }catch(err){}
}
window.addEventListener('message',handleRecenterMsg);
document.addEventListener('message',handleRecenterMsg);

setTimeout(function(){
  try{ if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'MAP_READY'})); } }catch(e){}
},350);
<\/script><\/body><\/html>`;
}
