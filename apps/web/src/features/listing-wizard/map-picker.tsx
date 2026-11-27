"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import styles from "./wizard.module.css";

/**
 * Meeting point map: OpenStreetMap tiles through Leaflet (no paid key).
 * Click the map or drag the pin to set the point. Loaded in the browser only.
 */
export default function MapPicker({
  center,
  pin,
  onChange,
}: {
  center: { lat: number; lng: number };
  pin: { lat: number; lng: number } | null;
  onChange: (pin: { lat: number; lng: number }) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const change = useRef(onChange);
  const placeRef = useRef<(lat: number, lng: number) => void>(() => {});
  useEffect(() => {
    change.current = onChange;
  });

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { scrollWheelZoom: false }).setView([pin?.lat ?? center.lat, pin?.lng ?? center.lng], pin ? 16 : 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    const icon = L.divIcon({ className: "", html: `<div class="${styles.pin}"></div>`, iconSize: [24, 24], iconAnchor: [12, 24] });
    const place = (lat: number, lng: number) => {
      if (!marker.current) {
        marker.current = L.marker([lat, lng], { draggable: true, icon, keyboard: true, title: "Meeting point" }).addTo(m);
        marker.current.on("dragend", () => {
          const p = marker.current!.getLatLng();
          change.current({ lat: round(p.lat), lng: round(p.lng) });
        });
      } else marker.current.setLatLng([lat, lng]);
    };
    placeRef.current = place;
    if (pin) place(pin.lat, pin.lng);
    m.on("click", (e: L.LeafletMouseEvent) => {
      place(e.latlng.lat, e.latlng.lng);
      change.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // Built once; later centre / pin changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new city moves the map (and the pin, when it was left at the old city).
  useEffect(() => {
    if (!map.current) return;
    if (pin) {
      placeRef.current(pin.lat, pin.lng);
      map.current.setView([pin.lat, pin.lng], Math.max(map.current.getZoom(), 15));
    } else map.current.setView([center.lat, center.lng], 13);
  }, [center.lat, center.lng, pin]);

  return <div ref={box} className={styles.map} role="application" aria-label="Map: click or drag the pin to set the meeting point" />;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
