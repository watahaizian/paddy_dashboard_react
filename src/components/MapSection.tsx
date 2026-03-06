import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { MapContainer, Marker, Polygon, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import { FaSun, FaThermometerHalf, FaTint } from "react-icons/fa";
import L from "leaflet";
import {
  fetchPolygonLocalGovernments,
  fetchPolygons,
  type LocalGovernment,
  type PolygonApiRow,
} from "../api";
import type { Field, UnassignedSensor } from "../types";

type Props = {
  fields: Field[];
  unassignedSensors: UnassignedSensor[];
  selectedFieldId?: string;
  selectedSensorId?: string;
  onSelectField: (field: Field) => void;
  onSelectUnassignedSensor: (sensor: UnassignedSensor) => void;
  unassignedSensorsError?: string | null;
};

type DisplayPolygon = {
  polyId: number;
  latlngs: [number, number][][];
  bounds: L.LatLngBounds;
  inUse: boolean;
};

type ActiveScope = {
  key: string;
  localGovernmentCode?: string;
};

const minPolygonZoom = 15;
const EMPTY_LOCAL_GOVERNMENTS: LocalGovernment[] = [];

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const formatDateTime = (ms?: number) => {
  if (!ms) return "--";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
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
        background:${alert === "!" ? "#F6C84C" : "#CF352E"};
        color:${alert === "!" ? "#1A1A1A" : "#FFFFFF"};
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
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      background:${color};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
    ">${alertHtml}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

const toLatLngRings = (coordinates: unknown): [number, number][][] => {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  const rings: [number, number][][] = [];
  for (const ring of coordinates) {
    if (!Array.isArray(ring)) {
      continue;
    }

    const points: [number, number][] = [];
    for (const point of ring) {
      if (!Array.isArray(point) || point.length < 2) {
        continue;
      }

      const lng = Number(point[0]);
      const lat = Number(point[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }
      points.push([lat, lng]);
    }

    if (points.length >= 3) {
      rings.push(points);
    }
  }

  return rings;
};

const toDisplayPolygon = (row: PolygonApiRow): DisplayPolygon | null => {
  const latlngs = toLatLngRings(row.coordinates);
  if (latlngs.length === 0) {
    return null;
  }

  const allPoints = latlngs.flat();
  if (allPoints.length === 0) {
    return null;
  }

  return {
    polyId: row.poly_id,
    latlngs,
    bounds: L.latLngBounds(allPoints),
    inUse: row.in_use === true,
  };
};

const MapBoundsWatcher = ({
  onViewChanged,
}: {
  onViewChanged: (bounds: L.LatLngBounds, zoom: number) => void;
}) => {
  const map = useMapEvents({
    moveend: () => onViewChanged(map.getBounds(), map.getZoom()),
    zoomend: () => onViewChanged(map.getBounds(), map.getZoom()),
  });

  useEffect(() => {
    onViewChanged(map.getBounds(), map.getZoom());
  }, [map, onViewChanged]);

  return null;
};

const MapSection = ({
  fields,
  unassignedSensors,
  selectedFieldId,
  selectedSensorId,
  onSelectField,
  onSelectUnassignedSensor,
  unassignedSensorsError,
}: Props) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unassignedPanelOpen, setUnassignedPanelOpen] = useState(false);
  const [selectedPrefectureCode, setSelectedPrefectureCode] = useState("");
  const [enabledMunicipalityCodes, setEnabledMunicipalityCodes] = useState<string[]>([]);
  const [view, setView] = useState<{ bounds: L.LatLngBounds; zoom: number } | null>(null);

  const localGovernmentsQuery = useQuery({
    queryKey: ["polygonLocalGovernments"],
    queryFn: ({ signal }) => fetchPolygonLocalGovernments(signal),
    staleTime: 5 * 60 * 1000,
  });
  const localGovernments = useMemo(
    () => localGovernmentsQuery.data ?? EMPTY_LOCAL_GOVERNMENTS,
    [localGovernmentsQuery.data],
  );
  const localGovernmentError = localGovernmentsQuery.error
    ? toErrorMessage(localGovernmentsQuery.error)
    : null;

  const prefectureOptions = useMemo(() => {
    const byCode = new Map<string, string>();
    for (const row of localGovernments) {
      if (!row.prefecture_code) {
        continue;
      }
      if (!byCode.has(row.prefecture_code)) {
        byCode.set(row.prefecture_code, row.prefecture_name || `Prefecture ${row.prefecture_code}`);
      }
    }
    return Array.from(byCode.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [localGovernments]);

  const effectiveSelectedPrefectureCode = useMemo(() => {
    if (selectedPrefectureCode && prefectureOptions.some((pref) => pref.code === selectedPrefectureCode)) {
      return selectedPrefectureCode;
    }
    return prefectureOptions[0]?.code ?? "";
  }, [prefectureOptions, selectedPrefectureCode]);

  const municipalityOptions = useMemo(() => {
    if (!effectiveSelectedPrefectureCode) {
      return [] as LocalGovernment[];
    }
    return localGovernments
      .filter((row) => row.prefecture_code === effectiveSelectedPrefectureCode)
      .sort((a, b) => a.local_government_code.localeCompare(b.local_government_code));
  }, [effectiveSelectedPrefectureCode, localGovernments]);

  const activeScopes = useMemo<ActiveScope[]>(() => {
    return enabledMunicipalityCodes.map((code) => ({
      key: `local:${code}`,
      localGovernmentCode: code,
    }));
  }, [enabledMunicipalityCodes]);

  const polygonQueries = useQueries({
    queries: activeScopes.map((scope) => ({
      queryKey: ["polygons", scope.localGovernmentCode ?? ""],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchPolygons({ localGovernmentCode: scope.localGovernmentCode }, signal),
      staleTime: 5 * 60 * 1000,
      enabled: !!scope.localGovernmentCode,
    })),
  });

  const handleViewChanged = useCallback((bounds: L.LatLngBounds, zoom: number) => {
    setView({ bounds, zoom });
  }, []);

  const activePolygons = useMemo(() => {
    const byId = new Map<number, DisplayPolygon>();
    for (let i = 0; i < activeScopes.length; i += 1) {
      const rows = polygonQueries[i]?.data ?? [];
      for (const polygon of rows) {
        const displayPolygon = toDisplayPolygon(polygon);
        if (displayPolygon != null && !byId.has(displayPolygon.polyId)) {
          byId.set(displayPolygon.polyId, displayPolygon);
        }
      }
    }
    return Array.from(byId.values());
  }, [activeScopes, polygonQueries]);

  const polygonLoadProgress = useMemo(() => {
    const total = polygonQueries.length;
    const done = polygonQueries.filter((query) => query.status === "success" || query.status === "error").length;
    return { total, done };
  }, [polygonQueries]);

  const polygonError = useMemo(() => {
    const firstError = polygonQueries.find((query) => query.error != null)?.error;
    return firstError == null ? null : toErrorMessage(firstError);
  }, [polygonQueries]);

  const visiblePolygons = useMemo(() => {
    if (view == null || view.zoom < minPolygonZoom) {
      return [] as DisplayPolygon[];
    }
    return activePolygons.filter((polygon) => polygon.bounds.intersects(view.bounds));
  }, [activePolygons, view]);

  const isPolygonLoading = polygonLoadProgress.total > 0 && polygonLoadProgress.done < polygonLoadProgress.total;
  const polygonLoadPercent =
    polygonLoadProgress.total > 0
      ? Math.min(100, Math.round((polygonLoadProgress.done / polygonLoadProgress.total) * 100))
      : 0;

  const selectedPrefectureMunicipalityCodes = municipalityOptions.map((m) => m.local_government_code);
  const currentPrefectureEnabled =
    selectedPrefectureMunicipalityCodes.length > 0 &&
    selectedPrefectureMunicipalityCodes.every((code) => enabledMunicipalityCodes.includes(code));

  const toggleSelectedPrefecture = () => {
    if (!effectiveSelectedPrefectureCode) {
      return;
    }

    setEnabledMunicipalityCodes((prev) => {
      if (selectedPrefectureMunicipalityCodes.length === 0) {
        return prev;
      }
      if (currentPrefectureEnabled) {
        return prev.filter((code) => !selectedPrefectureMunicipalityCodes.includes(code));
      }

      const next = new Set(prev);
      for (const code of selectedPrefectureMunicipalityCodes) {
        next.add(code);
      }
      return Array.from(next);
    });
  };

  const toggleMunicipality = (localGovernmentCode: string) => {
    setEnabledMunicipalityCodes((prev) => {
      if (prev.includes(localGovernmentCode)) {
        return prev.filter((code) => code !== localGovernmentCode);
      }
      return [...prev, localGovernmentCode];
    });
  };

  const clearAllPolygonVisibility = () => {
    setEnabledMunicipalityCodes([]);
  };

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;
  const selectedSensor = unassignedSensors.find((sensor) => sensor.id === selectedSensorId) ?? null;
  const centerTarget = selectedSensor ?? selectedField ?? fields[0] ?? unassignedSensors[0] ?? null;

  if (centerTarget == null) {
    return (
      <div
        style={{
          border: "1px solid #BFCBDA",
          borderRadius: 16,
          background: "white",
          height: "100%",
          display: "grid",
          placeItems: "center",
        }}
      >
        表示できるデータがありません
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #BFCBDA",
        borderRadius: 16,
        overflow: "hidden",
        background: "white",
        height: "100%",
      }}
    >
      <div
        style={{
          background: "#E2EEF8",
          padding: "10px 14px",
          fontWeight: 700,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
        }}
      >
        <div>エリア</div>
        <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <FaSun style={{ color: "#F6C84C" }} size={18} />
          <span>天気</span>
        </div>
        <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <FaThermometerHalf style={{ color: "#E53935" }} size={16} />
          <span>気温</span>
        </div>
        <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <FaTint style={{ color: "#1F88E5" }} size={16} />
          <span>12時間降水量</span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #BFCBDA", height: "calc(100% - 44px)", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            zIndex: 500,
            top: 8,
            right: 8,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #9FB4C8",
              background: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ポリゴン表示設定
          </button>
        </div>

        <div
          style={{
            position: "absolute",
            zIndex: 500,
            left: 8,
            bottom: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <button
            type="button"
            onClick={() => setUnassignedPanelOpen((prev) => !prev)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #9FB4C8",
              background: "white",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,.12)",
            }}
          >
            未割当センサー ({unassignedSensors.length})
          </button>

          {unassignedPanelOpen && (
            <div
              style={{
                width: 320,
                maxHeight: 360,
                overflow: "auto",
                border: "1px solid #9FB4C8",
                borderRadius: 12,
                background: "white",
                boxShadow: "0 6px 18px rgba(0,0,0,.14)",
                padding: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>未割当センサー一覧</div>
                <button
                  type="button"
                  onClick={() => setUnassignedPanelOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#607D99",
                  }}
                >
                  閉じる
                </button>
              </div>

              {unassignedSensorsError && (
                <div style={{ fontSize: 12, color: "#C62828", marginBottom: 10 }}>
                  取得エラー: {unassignedSensorsError}
                </div>
              )}

              {unassignedSensors.length === 0 ? (
                <div style={{ fontSize: 12, color: "#607D99" }}>未割当センサーはありません</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {unassignedSensors.map((sensor) => {
                    const active = sensor.id === selectedSensorId;
                    return (
                      <button
                        key={sensor.id}
                        type="button"
                        onClick={() => {
                          onSelectUnassignedSensor(sensor);
                          setUnassignedPanelOpen(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: active ? "1px solid #2563EB" : "1px solid #E1E7EF",
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: active ? "#EFF6FF" : "white",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ fontWeight: 700, color: "#1F2D3A" }}>{sensor.name}</div>
                          {sensor.sensorStatus === 4 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#B71C1C",
                                background: "#FFEBEE",
                                border: "1px solid #FFCDD2",
                                borderRadius: 999,
                                padding: "2px 8px",
                              }}
                            >
                              異常
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#4A657F", marginTop: 4 }}>
                          sensor_id: {sensor.sensorId}
                          {sensor.lfourId ? ` / ${sensor.lfourId}` : ""}
                        </div>
                        <div style={{ fontSize: 12, color: "#607D99", marginTop: 4 }}>
                          最終受信: {formatDateTime(sensor.sensorHealth?.latestMs)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {settingsOpen && (
          <div
            style={{
              position: "absolute",
              zIndex: 500,
              top: 44,
              right: 8,
              width: 320,
              maxHeight: 420,
              overflow: "auto",
              border: "1px solid #9FB4C8",
              borderRadius: 12,
              background: "white",
              boxShadow: "0 6px 18px rgba(0,0,0,.14)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>表示 ON/OFF</div>
            <div style={{ fontSize: 12, color: "#4A657F", marginBottom: 10 }}>
              ポリゴンはズーム {minPolygonZoom} 以上で表示します
            </div>

            {localGovernmentError && (
              <div style={{ fontSize: 12, color: "#C62828", marginBottom: 10 }}>
                自治体一覧取得エラー: {localGovernmentError}
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, color: "#4A657F", marginBottom: 4 }}>都道府県</label>
              <select
                value={effectiveSelectedPrefectureCode}
                onChange={(e) => setSelectedPrefectureCode(e.target.value)}
                style={{ width: "100%", border: "1px solid #BFCBDA", borderRadius: 8, padding: "6px 8px" }}
              >
                {prefectureOptions.map((pref) => (
                  <option key={pref.code} value={pref.code}>
                    {pref.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={toggleSelectedPrefecture}
                disabled={!effectiveSelectedPrefectureCode}
                style={{
                  flex: 1,
                  border: "1px solid #9FB4C8",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: currentPrefectureEnabled ? "#2E7D32" : "white",
                  color: currentPrefectureEnabled ? "white" : "#1F2D3A",
                  fontWeight: 700,
                  cursor: effectiveSelectedPrefectureCode ? "pointer" : "not-allowed",
                }}
              >
                都道府県を{currentPrefectureEnabled ? "OFF" : "ON"}
              </button>
              <button
                type="button"
                onClick={clearAllPolygonVisibility}
                style={{
                  border: "1px solid #9FB4C8",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                全解除
              </button>
            </div>

            {isPolygonLoading && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#4A657F", marginBottom: 4 }}>
                  読み込み中 {polygonLoadProgress.done}/{polygonLoadProgress.total} ({polygonLoadPercent}%)
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    borderRadius: 999,
                    background: "#E1E7EF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${polygonLoadPercent}%`,
                      height: "100%",
                      background: "#2E7D32",
                      transition: "width 160ms linear",
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: "#4A657F", marginBottom: 6 }}>市区町村</div>
            <div style={{ display: "grid", gap: 6 }}>
              {municipalityOptions.map((municipality) => {
                const checked = enabledMunicipalityCodes.includes(municipality.local_government_code);
                return (
                  <label
                    key={municipality.local_government_code}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: "1px solid #E1E7EF",
                      borderRadius: 8,
                      padding: "6px 8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMunicipality(municipality.local_government_code)}
                    />
                    <span style={{ fontSize: 13 }}>
                      {municipality.municipality_name || municipality.local_government_name}
                    </span>
                  </label>
                );
              })}
              {municipalityOptions.length === 0 && (
                <div style={{ fontSize: 12, color: "#607D99" }}>市区町村データがありません</div>
              )}
            </div>

            {polygonError && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#C62828" }}>
                ポリゴン取得エラー: {polygonError}
              </div>
            )}
          </div>
        )}

        <MapContainer
          key={selectedSensor ? `sensor:${selectedSensor.id}` : selectedField ? `field:${selectedField.id}` : "default"}
          center={[centerTarget.lat, centerTarget.lon]}
          zoom={15.6}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          <MapBoundsWatcher onViewChanged={handleViewChanged} />

          {visiblePolygons.map((polygon) => (
            <Polygon
              key={polygon.polyId}
              positions={polygon.latlngs}
              pathOptions={{
                color: polygon.inUse ? "#B71C1C" : "#2E7D32",
                weight: 1,
                fillColor: polygon.inUse ? "#EF9A9A" : "#A5D6A7",
                fillOpacity: 0.45,
              }}
            />
          ))}

          {fields.map((field) => {
            const isSelected = field.id === selectedFieldId;
            const alert = field.pinAlert ?? "none";
            const icon = isSelected ? pin("#E53935", 22, alert) : pin("#1F88E5", 18, alert);
            return (
              <Marker
                key={field.id}
                position={[field.lat, field.lon]}
                icon={icon}
                eventHandlers={{ click: () => onSelectField(field) }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  {field.name}
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
