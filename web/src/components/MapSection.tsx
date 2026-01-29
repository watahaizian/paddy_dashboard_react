// src/components/MapSection.tsx
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { FaSun, FaThermometerHalf, FaTint } from "react-icons/fa";
import L from "leaflet";
import type { Field } from "../types";

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
        background:#F6C84C;
        color:#1A1A1A;
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
