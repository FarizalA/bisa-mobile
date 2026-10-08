import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { KATEGORI_JASA } from "../../lib/categories";
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";

function radiusToZoom(radius: number) {
  if (radius >= 100) return 9;
  if (radius >= 25) return 11;
  if (radius >= 10) return 12;
  if (radius >= 5) return 13;
  if (radius >= 3) return 14;
  return 15;
}

export default function CariKerjaMap({ logic }: { logic: CariKerjaLogic }) {
  const { viewMode, mitraLoc, jobs, setSelectedJob, activeCategory, setActiveCategory, radius } = logic;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (viewMode !== "map" || !mapRef.current || !mitraLoc) return;
    const el = mapRef.current;

    const ensureLeaflet = () =>
      new Promise<void>((resolve, reject) => {
        if ((window as any).L) return resolve();
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

    let destroyed = false;

    ensureLeaflet()
      .then(() => {
        if (destroyed || !el) return;
        const L = (window as any).L;
        if ((el as any)._leaflet_map) {
          try { (el as any)._leaflet_map.remove(); } catch {}
          (el as any)._leaflet_map = null;
        }
        // Clear children
        el.innerHTML = "";
        const map = L.map(el, { zoomControl: false }).setView([mitraLoc.lat, mitraLoc.lng], radiusToZoom(radius));
        (el as any)._leaflet_map = map;
        mapInstanceRef.current = map;
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
          m.on("popupopen", () => {
            setTimeout(() => {
              const btn = document.getElementById(`btn-${j.id}`);
              if (btn) btn.onclick = () => setSelectedJob(j);
            }, 0);
          });
          m.on("click", () => setSelectedJob(j));
        });

        // expand map div to parent height then invalidate
        const ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(el);
        (el as any)._leaflet_ro = ro;
        setTimeout(() => map.invalidateSize(), 80);
        setTimeout(() => map.invalidateSize(), 400);
      })
      .catch((err) => console.error("[CariKerjaMap.web] leaflet error", err));

    return () => {
      destroyed = true;
      try {
        if ((el as any)._leaflet_ro) { (el as any)._leaflet_ro.disconnect(); (el as any)._leaflet_ro = null; }
        if ((el as any)._leaflet_map) { (el as any)._leaflet_map.remove(); (el as any)._leaflet_map = null; }
      } catch {}
    };
  }, [viewMode, mitraLoc, jobs, radius, setSelectedJob]);

  if (viewMode !== "map") return null;

  if (!mitraLoc) {
    return (
      <View style={{ flex: 1, width: "100%", backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", paddingHorizontal: 24, display: "flex" } as any}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#6b7280" } as any}>Menunggu lokasi...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, width: "100%", position: "relative", backgroundColor: "#e5e7eb", overflow: "hidden", display: "flex", flexDirection: "column" } as any}>
      {/* @ts-ignore web div */}
      <div ref={mapRef} style={{ width: "100%", flex: 1, minHeight: 0, background: "#e5e7eb" }} />
      <View style={{ position: "absolute", top: 12, left: 0, right: 0, paddingHorizontal: 16 } as any}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {KATEGORI_JASA.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.85}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: isSelected ? "#059669" : "#ffffff",
                } as any}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: isSelected ? "#ffffff" : "#374151" } as any}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
