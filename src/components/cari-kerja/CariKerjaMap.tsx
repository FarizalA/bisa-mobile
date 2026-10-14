import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";
import CariKerjaMapFilters from "./CariKerjaMapFilters";

function radiusToZoom(radius: number) {
  if (radius >= 100) return 9;
  if (radius >= 25) return 11;
  if (radius >= 10) return 12;
  if (radius >= 5) return 13;
  if (radius >= 3) return 14;
  return 15;
}

// WEB: Leaflet direct (tanpa iframe, tanpa WebView) — 1:1 screenshot OSM
function CariKerjaMapWeb({ logic }: { logic: CariKerjaLogic }) {
  const { mitraLoc, jobs, setSelectedJob, radius } = logic;
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletReadyRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || !mitraLoc) return;
    const el = mapRef.current;

    const ensureLeaflet = () =>
      new Promise<void>((resolve, reject) => {
        if ((window as any).L) return resolve();
        if (leafletReadyRef.current) {
          const t = setInterval(() => {
            if ((window as any).L) { clearInterval(t); resolve(); }
          }, 50);
          setTimeout(() => { clearInterval(t); reject(new Error("leaflet timeout")); }, 8000);
          return;
        }
        leafletReadyRef.current = true;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("leaflet load failed"));
        document.head.appendChild(script);
      });

    let map: any = null;
    let destroyed = false;

    ensureLeaflet()
      .then(() => {
        if (destroyed || !el) return;
        const L = (window as any).L;
        // Clean previous map instance if hot-reload
        if ((el as any)._leaflet_map) {
          try { (el as any)._leaflet_map.remove(); } catch {}
        }
        map = L.map(el, { zoomControl: false }).setView([mitraLoc.lat, mitraLoc.lng], radiusToZoom(radius));
        (el as any)._leaflet_map = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | Leaflet',
          maxZoom: 19,
        }).addTo(map);

        const mitraIcon = L.divIcon({
          className: "custom",
          html: '<div style="background:#10b981;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const jobIcon = L.divIcon({
          className: "custom",
          html: '<div style="background:#2563eb;width:18px;height:18px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        L.marker([mitraLoc.lat, mitraLoc.lng], { icon: mitraIcon }).addTo(map).bindPopup('<b style="color:#059669">Lokasi Anda</b>');
        const r = radius >= 100 ? 50000 : radius * 1000;
        L.circle([mitraLoc.lat, mitraLoc.lng], { radius: r, color: "#10b981", fillColor: "#10b981", fillOpacity: 0.12, weight: 1.5 }).addTo(map);

        jobs.forEach((j: any) => {
          if (!j.latitude || !j.longitude) return;
          const m = L.marker([Number(j.latitude), Number(j.longitude)], { icon: jobIcon }).addTo(map);
          const popup = `<div style="font-family:sans-serif;min-width:170px"><div style="font-weight:800;font-size:13px;color:#111">${String(j.judul).replace(/</g, "&lt;")}</div><div style="font-size:11px;color:#6b7280">${j.kategori}</div><div style="font-size:12px;font-weight:800;color:#059669;margin-top:4px">${j.budget}</div><button id="btn-${j.id}" style="margin-top:8px;width:100%;padding:7px;background:#10b981;color:white;border:none;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer">Lihat Detail</button></div>`;
          m.bindPopup(popup);
          // Tunggu DOM popup selesai dirender, lalu tempel listener ke tombol.
          // Pakai addEventListener (bukan onclick langsung) supaya event klik marker
          // yang memicu popup TIDAK ikut menembus ke tombol.
          m.on("popupopen", () => {
            setTimeout(() => {
              const btn = document.getElementById(`btn-${j.id}`);
              if (!btn) return;
              btn.addEventListener("click", (ev: any) => {
                try { ev.stopPropagation(); } catch {}
                setSelectedJob(j);
              });
            }, 60);
          });
          // Sengaja TANPA handler click langsung: klik marker hanya buka popup ringkas,
          // modal detail baru muncul setelah user menekan tombol "Lihat Detail" (1:1 native).
        });

        setTimeout(() => map.invalidateSize(), 120);
      })
      .catch((err) => console.error("[CariKerjaMap] leaflet error", err));

    return () => {
      destroyed = true;
      try { if (map) map.remove(); } catch {}
    };
  }, [mitraLoc, jobs, radius, setSelectedJob]);

  if (!mitraLoc) {
    return (
      <View style={{ flex: 1, minHeight: 520, width: "100%", backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#6b7280" }}>Menunggu lokasi...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 520, width: "100%", position: "relative", backgroundColor: "#e5e7eb", overflow: "hidden" }}>
      {/* @ts-ignore web div */}
      <div ref={mapRef} style={{ width: "100%", height: 520, minHeight: 520, background: "#e5e7eb" }} />
      <View style={{ position: "absolute", top: 12, left: 0, right: 0, paddingHorizontal: 16 } as any}>
        <CariKerjaMapFilters logic={logic} />
      </View>
    </View>
  );
}

import { WebView } from "react-native-webview";
import { generateCariKerjaLeafletHtml } from "../../utils/cariKerjaLeafletHtml";

export default function CariKerjaMap({ logic }: { logic: CariKerjaLogic }) {
  const { viewMode, mitraLoc, jobs, setSelectedJob, radius } = logic;
  const webviewRef = useRef<any>(null);

  if (viewMode !== "map") return null;

  if (Platform.OS === "web") {
    return <CariKerjaMapWeb logic={logic} />;
  }

  // Native Android/iOS: WebView with Leaflet fallback (mencegah FC react-native-maps)
  const leafletHTML = generateCariKerjaLeafletHtml(
    mitraLoc?.lat || -6.2,
    mitraLoc?.lng || 106.816666,
    radius,
    jobs
  );

  return (
    <View style={{ flex: 1, minHeight: 520, width: "100%", position: "relative" }}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: leafletHTML }}
        style={{ width: "100%", height: "100%" }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "SELECT_JOB" && data.id != null) {
              // id dari postMessage selalu string, id job bisa number → samakan tipe.
              const job = jobs.find((j: any) => String(j.id) === String(data.id));
              if (job) setSelectedJob(job);
            }
          } catch (e) {}
        }}
      />
      <View className="absolute top-3 left-0 right-0 px-4">
        <CariKerjaMapFilters logic={logic} />
      </View>
    </View>
  );
}
