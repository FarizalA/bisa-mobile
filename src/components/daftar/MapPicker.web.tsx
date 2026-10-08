import { useEffect, useRef } from "react";

declare global {
  interface Window {
    L: any;
  }
}

type Pos = { lat: number; lng: number } | null;

export default function MapPicker({ position, setPosition }: { position: Pos; setPosition: (p: { lat: number; lng: number }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // init map sekali
  useEffect(() => {
    let cancelled = false;

    const ensureLeaflet = async () => {
      // 1. load CSS
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.setAttribute("data-leaflet", "1");
        document.head.appendChild(link);
      }
      // 2. load JS
      if (!window.L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
      }
      if (cancelled) return;

      const L = window.L;
      if (!containerRef.current || mapRef.current) return;

      const initial = position ?? { lat: -7.52, lng: 108.77 }; // Majenang default
      const map = L.map(containerRef.current, { zoomControl: false }).setView([initial.lat, initial.lng], position ? 16 : 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
        maxZoom: 20,
      }).addTo(map);

      // pin oranye
      const pin = L.divIcon({
        className: "custom-leaflet-pin",
        html: `<div style="position:relative;width:44px;height:54px;display:flex;flex-direction:column;align-items:center;">
          <div style="width:38px;height:38px;background:linear-gradient(135deg,#ff6b00,#ff8800);border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 6px 16px rgba(255,107,0,.45);display:flex;align-items:center;justify-content:center">
            <div style="width:14px;height:14px;background:#fff;border-radius:50%;transform:rotate(45deg);display:flex;align-items:center;justify-content:center"><div style="width:6px;height:6px;background:#ff6b00;border-radius:50%"></div></div>
          </div></div>`,
        iconSize: [44, 54],
        iconAnchor: [22, 50],
      });

      if (position) {
        markerRef.current = L.marker([position.lat, position.lng], { draggable: true, icon: pin }).addTo(map);
        markerRef.current.on("dragend", () => {
          const ll = markerRef.current.getLatLng();
          setPosition({ lat: ll.lat, lng: ll.lng });
        });
      }

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        setPosition({ lat, lng });
        if (!markerRef.current) {
          markerRef.current = L.marker([lat, lng], { draggable: true, icon: pin }).addTo(map);
          markerRef.current.on("dragend", () => {
            const ll = markerRef.current.getLatLng();
            setPosition({ lat: ll.lat, lng: ll.lng });
          });
        } else {
          markerRef.current.setLatLng([lat, lng]);
        }
      });

      // tombol recenter ◎
      const Recenter = L.Control.extend({
        onAdd: function () {
          const btn = L.DomUtil.create("button");
          btn.innerHTML = "◎";
          btn.style.cssText = "width:40px;height:40px;background:white;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,.15);font-size:18px;color:#ff6b00;cursor:pointer;display:flex;align-items:center;justify-content:center;";
          btn.onclick = (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                map.flyTo([p.lat, p.lng], 16);
                setPosition(p);
                if (!markerRef.current) {
                  markerRef.current = L.marker([p.lat, p.lng], { draggable: true, icon: pin }).addTo(map);
                } else {
                  markerRef.current.setLatLng([p.lat, p.lng]);
                }
              });
            }
          };
          return btn;
        },
        onRemove: function () {},
      });
      new Recenter({ position: "bottomright" }).addTo(map);

      setTimeout(() => map.invalidateSize(), 300);
      mapRef.current = map;
    };

    ensureLeaflet();

    return () => {
      cancelled = true;
    };
  }, []);

  // sinkron kalau position berubah dari luar (GPS button)
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    if (!position) return;
    const map = mapRef.current;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), { animate: true, duration: 0.8 });
    if (markerRef.current) {
      markerRef.current.setLatLng([position.lat, position.lng]);
    } else {
      const L = window.L;
      const pin = L.divIcon({
        className: "custom-leaflet-pin",
        html: `<div style="position:relative;width:44px;height:54px;display:flex;flex-direction:column;align-items:center;">
          <div style="width:38px;height:38px;background:linear-gradient(135deg,#ff6b00,#ff8800);border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 6px 16px rgba(255,107,0,.45);display:flex;align-items:center;justify-content:center">
            <div style="width:14px;height:14px;background:#fff;border-radius:50%;transform:rotate(45deg);display:flex;align-items:center;justify-content:center"><div style="width:6px;height:6px;background:#ff6b00;border-radius:50%"></div></div>
          </div></div>`,
        iconSize: [44, 54],
        iconAnchor: [22, 50],
      });
      markerRef.current = L.marker([position.lat, position.lng], { draggable: true, icon: pin }).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current.getLatLng();
        setPosition({ lat: ll.lat, lng: ll.lng });
      });
    }
  }, [position?.lat, position?.lng]);

  return (
    <div
      ref={containerRef}
      style={{ height: 320, width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #e5e7eb", zIndex: 1 }}
    />
  );
}
