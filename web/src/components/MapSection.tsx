// src/components/MapSection.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Polygon, useMapEvents } from "react-leaflet";
import { FaSun, FaThermometerHalf, FaTint } from "react-icons/fa";
import L from "leaflet";
import type { Field } from "../types";
import polygonData from "../assets/2025_202142_chino.json";

type GeoJsonFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties?: {
    polygon_uuid?: string;
    land_type?: number;
  };
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type IndexedPolygon = {
  id: string;
  bounds: L.LatLngBounds;
  latlngs: [number, number][][];
};

const buildPolygonIndex = (data: GeoJsonFeatureCollection): IndexedPolygon[] => {
  if (!data?.features) return [];

  return data.features.flatMap((feature, index) => {
    if (feature.properties?.land_type !== 100) return [];
    if (!feature?.geometry || feature.geometry.type !== "Polygon") return [];
    const coords = feature.geometry.coordinates ?? [];
    if (coords.length === 0) return [];

    let minLat = Infinity;
    let minLng = Infinity;
    let maxLat = -Infinity;
    let maxLng = -Infinity;

    const latlngs = coords.map((ring) =>
      ring.map(([lng, lat]) => {
        if (lat < minLat) minLat = lat;
        if (lng < minLng) minLng = lng;
        if (lat > maxLat) maxLat = lat;
        if (lng > maxLng) maxLng = lng;
        return [lat, lng] as [number, number];
      })
    );

    if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return [];

    const bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
    const id = feature.properties?.polygon_uuid ?? `polygon-${index}`;
    return [{ id, bounds, latlngs }];
  });
};

const polygonIndex = buildPolygonIndex(polygonData as GeoJsonFeatureCollection);

type Props = {
  fields: Field[];
  selectedId?: string;
  onSelect: (f: Field) => void;
};

const pin = (color: string, size: number, alert: "none" | "!" | "!!!" = "none") => {
  const alertHtml =
    alert === "none"
      ? ""
      : `<div style="
        position:absolute;
        top:-20px;
        left:50%;
        transform:translateX(-50%);
        background:${alert == "!" ? "#F6C84C" : "#CF352E"};
        color:${alert == "!" ? "#1A1A1A" : "#FFFFFF"};
        font-weight:800;
        font-size:12px;
        line-height:1;
        padding:2px 6px 3px;
        border-radius:999px;
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,.25);
        white-space:nowrap;
      ">${alert}</div>`;

  return L.divIcon({
    className: "",
    html: `<div style="
      position:relative;
      width:${size}px;height:${size}px;
      border-radius:999px;
      background:${color};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
    ">${alertHtml}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

const MapBoundsWatcher = ({ onChange }: { onChange: (bounds: L.LatLngBounds) => void }) => {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
    zoomend: () => onChange(map.getBounds()),
  });

  useEffect(() => {
    onChange(map.getBounds());
  }, [map, onChange]);

  return null;
};

const MapSection = ({ fields, selectedId, onSelect }: Props) => {
  if (fields.length === 0) {
    return (
      <div style={{ border: "1px solid #BFCBDA", borderRadius: 16, background: "white", height: "100%", display: "grid", placeItems: "center" }}>
        圃場がありません
      </div>
    );
  }

  const center = fields[0];
  const selected = fields.find((f) => f.id === selectedId) ?? center;

  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  }, []);

  const visiblePolygons = useMemo(() => {
    if (!mapBounds) return [];
    return polygonIndex.filter((poly) => mapBounds.intersects(poly.bounds));
  }, [mapBounds]);

  return (
    <div style={{ border: "1px solid #BFCBDA", borderRadius: 16, overflow: "hidden", background: "white", height: "100%" }}>
      <div style={{ background: "#E2EEF8", padding: "10px 14px", fontWeight: 700, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <div>エリア名</div>

        <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <FaSun style={{ color: '#F6C84C' }} size={18} />
          <span>天気</span>
        </div>

        <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <FaThermometerHalf style={{ color: '#E53935' }} size={16} />
          <span>気温</span>
        </div>

        <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <FaTint style={{ color: '#1F88E5' }} size={16} />
          <span>12時間予測降水量</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #BFCBDA", height: "calc(100% - 44px)" }}>
        <MapContainer
          key={selected.id}
          center={[selected.lat, selected.lon]}
          zoom={15.6}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          <MapBoundsWatcher onChange={handleBoundsChange} />

          {visiblePolygons.map((poly) => (
            <Polygon
              key={poly.id}
              positions={poly.latlngs}
              pathOptions={{
                color: "#2E7D32",
                weight: 1,
                fillColor: "#A5D6A7",
                fillOpacity: 0.45,
              }}
            />
          ))}

          {fields.map((f) => {
            const isSelected = f.id === selectedId;
            const alert = f.pinAlert ?? "none";
            const icon = isSelected ? pin("#E53935", 22, alert) : pin("#1F88E5", 18, alert);
            return (
              <Marker
                key={f.id}
                position={[f.lat, f.lon]}
                icon={icon}
                eventHandlers={{ click: () => onSelect(f) }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  {f.name}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
export default MapSection;
