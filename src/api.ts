import type {
  Field,
  FieldDataResponse,
  SensorHealth,
  SensorHealthStatus,
  UnassignedSensor,
  Worker,
} from "./types";

const SENSOR_ALERT_NO_DATA = 1;
const SENSOR_ALERT_STALE = 1 << 1;
const SENSOR_ALERT_ALL_ZERO = 1 << 2;
const SENSOR_ALERT_SAME_AS_PREV = 1 << 3;
const SENSOR_ALERT_SUB_BATTERY1_LOW = 1 << 4;
const SENSOR_ALERT_SUB_BATTERY2_LOW = 1 << 5;
const SENSOR_ALERT_WATERLEVEL_DAY_DROP = 1 << 6;
const SENSOR_ALERT_WATERLEVEL_1H_RISE = 1 << 7;

const isAbortError = (e: unknown): boolean => {
  return e instanceof DOMException && e.name === "AbortError";
};

const toNumberOrUndef = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

const toBooleanOrUndef = (v: unknown): boolean | undefined => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
};

const toSensorHealthStatus = (v: unknown): SensorHealthStatus | undefined => {
  if (typeof v !== "string") return undefined;
  const normalized = v.trim().toLowerCase();
  switch (normalized) {
    case "ok":
    case "no_data":
    case "stale":
    case "all_zero":
    case "same_as_prev":
      return normalized;
    default:
      return undefined;
  }
};

type ApiSensorState = {
  sensor_status?: number | string | null;
  sensor_alert_flags?: number | string | null;
  sensor_latest_dtcrc?: string | null;
  sensor_no_data?: boolean | number | string | null;
  sensor_is_stale?: boolean | number | string | null;
  sensor_is_all_zero?: boolean | number | string | null;
  sensor_is_same_as_prev?: boolean | number | string | null;
  sensor_health?: string | null;
};

const buildSensorHealth = (row: ApiSensorState): SensorHealth => {
  const latestMs = row.sensor_latest_dtcrc == null ? undefined : Date.parse(row.sensor_latest_dtcrc);
  const sensorAlertFlagsRaw = toNumberOrUndef(row.sensor_alert_flags ?? undefined);
  const sensorAlertFlags = sensorAlertFlagsRaw == null ? undefined : Math.max(0, Math.trunc(sensorAlertFlagsRaw));
  const hasFlagSource = sensorAlertFlags != null;
  const hasFlag = (bit: number): boolean => sensorAlertFlags != null && (sensorAlertFlags & bit) !== 0;

  const noData = hasFlagSource ? hasFlag(SENSOR_ALERT_NO_DATA) : (toBooleanOrUndef(row.sensor_no_data) ?? false);
  const stale = hasFlagSource ? hasFlag(SENSOR_ALERT_STALE) : (toBooleanOrUndef(row.sensor_is_stale) ?? false);
  const allZero = hasFlagSource ? hasFlag(SENSOR_ALERT_ALL_ZERO) : (toBooleanOrUndef(row.sensor_is_all_zero) ?? false);
  const sameAsPrev = hasFlagSource ? hasFlag(SENSOR_ALERT_SAME_AS_PREV) : (toBooleanOrUndef(row.sensor_is_same_as_prev) ?? false);
  const subBattery1Low = hasFlagSource && hasFlag(SENSOR_ALERT_SUB_BATTERY1_LOW);
  const subBattery2Low = hasFlagSource && hasFlag(SENSOR_ALERT_SUB_BATTERY2_LOW);
  const waterlevelDayDrop = hasFlagSource && hasFlag(SENSOR_ALERT_WATERLEVEL_DAY_DROP);
  const waterlevel1hRise = hasFlagSource && hasFlag(SENSOR_ALERT_WATERLEVEL_1H_RISE);

  const status =
    toSensorHealthStatus(row.sensor_health) ??
    (noData
      ? "no_data"
      : stale
        ? "stale"
        : allZero
          ? "all_zero"
          : sameAsPrev
            ? "same_as_prev"
            : "ok");

  return {
    status,
    latestMs: Number.isFinite(latestMs) ? latestMs : undefined,
    noData,
    stale,
    allZero,
    sameAsPrev,
    subBattery1Low,
    subBattery2Low,
    waterlevelDayDrop,
    waterlevel1hRise,
  };
};

type ApiField = ApiSensorState & {
  field_id?: number | string;
  field_name?: string;
  owner_id?: string;
  lat?: number | string;
  lon?: number | string;
  waterlevel?: number | string | null;
  temperature?: number | string | null;
};

type ApiUnassignedSensor = ApiSensorState & {
  sensor_id?: number | string;
  lfour_id?: string;
  lat?: number | string;
  lon?: number | string;
};

type ApiRequest = {
  target_field_id?: number | string | null;
};

export const fetchFields = async (signal?: AbortSignal): Promise<Field[]> => {
  const res = await fetch("/api/fields", { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const rows = (await res.json()) as ApiField[];
  const activeRequestFieldIDs = new Set<string>();

  try {
    // 依頼中の圃場だけ追加で目立たせるため、別APIの結果も合わせて見る。
    const requestRes = await fetch("/api/requests", { signal });
    if (requestRes.ok) {
      const requestRows = (await requestRes.json()) as ApiRequest[];
      for (const request of requestRows) {
        const fieldID = request.target_field_id == null ? "" : String(request.target_field_id).trim();
        if (fieldID !== "") {
          activeRequestFieldIDs.add(fieldID);
        }
      }
    }
  } catch (e) {
    if (isAbortError(e)) {
      throw e;
    }
  }

  return rows
    .map((row) => {
      const id = row.field_id == null ? "" : String(row.field_id).trim();
      const lat = toNumberOrUndef(row.lat) ?? 0;
      const lon = toNumberOrUndef(row.lon) ?? 0;
      const rawSensorStatus = toNumberOrUndef(row.sensor_status);
      const sensorStatus = rawSensorStatus === 1 || rawSensorStatus === 2 || rawSensorStatus === 3 || rawSensorStatus === 4
        ? rawSensorStatus
        : undefined;
      const waterMm = toNumberOrUndef(row.waterlevel ?? undefined);
      const temp = toNumberOrUndef(row.temperature ?? undefined);
      const waterCm = waterMm == null ? undefined : waterMm / 10;
      const sensorHealth = buildSensorHealth(row);

      let pinAlert: "none" | "!" | "!!!" = "none";
      if (waterCm == null || temp == null) {
        pinAlert = "!!!";
      } else if (waterCm < 2 || waterCm > 25 || temp < 5 || temp > 35) {
        pinAlert = "!";
      }
      if (activeRequestFieldIDs.has(id)) {
        pinAlert = "!";
      }

      return {
        id,
        name: (row.field_name ?? "").trim() || id,
        lat,
        lon,
        sensorStatus,
        ownerName: (row.owner_id ?? "").trim() || undefined,
        pinAlert,
        sensorHealth,
      } satisfies Field;
    })
    .filter((field) => field.id !== "");
};

export const fetchUnassignedSensors = async (signal?: AbortSignal): Promise<UnassignedSensor[]> => {
  const res = await fetch("/api/sensors/unassigned", { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const rows = (await res.json()) as ApiUnassignedSensor[];
  return rows.flatMap((row) => {
    const sensorId = toNumberOrUndef(row.sensor_id);
    if (sensorId == null) {
      return [];
    }

    const rawSensorStatus = toNumberOrUndef(row.sensor_status);
    const sensorStatus = rawSensorStatus === 1 || rawSensorStatus === 2 || rawSensorStatus === 3 || rawSensorStatus === 4
      ? rawSensorStatus
      : undefined;
    const lfourId = (row.lfour_id ?? "").trim();

    return [{
      id: String(sensorId),
      sensorId,
      lfourId: lfourId || undefined,
      name: lfourId || `未割当センサー ${sensorId}`,
      lat: toNumberOrUndef(row.lat) ?? 0,
      lon: toNumberOrUndef(row.lon) ?? 0,
      sensorStatus,
      pinAlert: "none",
      sensorHealth: buildSensorHealth(row),
    } satisfies UnassignedSensor];
  });
};

type ApiFieldDataPoint = {
  measured_date?: string;
  measured?: string;
  t?: number | string;
  waterlevel?: number | string | null;
  water_temperature?: number | string | null;
  temperature?: number | string | null;
  battery?: number | string | null;
  waterCm?: number | string | null;
  temp?: number | string | null;
};

const normalizePoint = (raw: ApiFieldDataPoint) => {
  const measured = raw.measured_date ?? raw.measured;
  const t = toTimeMsOrUndef(raw.t ?? measured);
  if (t == null) {
    return null;
  }

  const waterMm = toNumberOrUndef(raw.waterlevel ?? undefined);
  const waterCm = toNumberOrUndef(raw.waterCm ?? undefined) ?? (waterMm == null ? undefined : waterMm / 10);
  const temp = toNumberOrUndef(raw.temp ?? undefined) ??
    toNumberOrUndef(raw.temperature ?? raw.water_temperature ?? undefined);
  const battery = toNumberOrUndef(raw.battery ?? undefined);

  return {
    t,
    waterCm,
    temp,
    battery,
    measured,
  };
};

const toTimeMsOrUndef = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const ms = Date.parse(v);
    if (Number.isFinite(ms)) return ms;
  }
  return undefined;
};

const normalizeData = (raw: unknown): FieldDataResponse => {
  // バックエンドの返し方が配列でも points ラップでも読めるようにする。
  if (Array.isArray(raw)) {
    const points = raw
      .map((row) => normalizePoint((row ?? {}) as ApiFieldDataPoint))
      .filter((p): p is NonNullable<ReturnType<typeof normalizePoint>> => p != null)
      .sort((a, b) => a.t - b.t);

    const last = points.length > 0 ? points[points.length - 1] : undefined;
    return last ? { points, last } : { points };
  }

  if (raw && typeof raw === "object" && Array.isArray((raw as { points?: unknown[] }).points)) {
    const points = ((raw as { points?: unknown[] }).points ?? [])
      .map((row) => normalizePoint((row ?? {}) as ApiFieldDataPoint))
      .filter((p): p is NonNullable<ReturnType<typeof normalizePoint>> => p != null)
      .sort((a, b) => a.t - b.t);

    const last = points.length > 0 ? points[points.length - 1] : undefined;
    return last ? { points, last } : { points };
  }

  return { points: [] };
};

const buildRangeQuery = () => {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => {
    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
  };

  return new URLSearchParams({
    fromd: fmt(from),
    tod: fmt(now),
  });
};

const fetchMonitoringData = async (url: string, signal?: AbortSignal): Promise<FieldDataResponse> => {
  const rangeRes = await fetch(`${url}?${buildRangeQuery().toString()}`, { signal });
  if (!rangeRes.ok) {
    throw new Error(`HTTP ${rangeRes.status}`);
  }
  return normalizeData(await rangeRes.json());
};

export const fetchFieldData = async (fieldId: string, signal?: AbortSignal): Promise<FieldDataResponse> => {
  return fetchMonitoringData(`/api/fields/${encodeURIComponent(fieldId)}/data`, signal);
};

export const fetchSensorData = async (sensorId: string, signal?: AbortSignal): Promise<FieldDataResponse> => {
  return fetchMonitoringData(`/api/sensors/${encodeURIComponent(sensorId)}/data`, signal);
};

export const fetchWorkers = async (signal?: AbortSignal): Promise<Worker[]> => {
  const res = await fetch("/api/workers", { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  type ApiWorker = {
    id?: string;
    name?: string;
    area?: string;
    method?: string;
    photoUrl?: string;
    online_status?: number | string;
    is_online?: boolean;
    contact_email?: string;
    contact_phone?: string;
  };

  const rows = (await res.json()) as ApiWorker[];
  return rows.map((row) => {
    const onlineStatusRaw = Number(row.online_status ?? 2);
    const onlineStatus: 1 | 2 = onlineStatusRaw === 1 ? 1 : 2;
    const isOnline = typeof row.is_online === "boolean"
      ? row.is_online
      : onlineStatus === 1;

    return {
      id: String(row.id ?? "").trim(),
      name: String(row.name ?? "").trim() || "未設定",
      area: String(row.area ?? "").trim() || "未設定",
      method: String(row.method ?? "").trim() || "未設定",
      photoUrl: String(row.photoUrl ?? "").trim(),
      onlineStatus,
      isOnline,
      contactEmail: String(row.contact_email ?? "").trim(),
      contactPhone: String(row.contact_phone ?? "").trim(),
    } satisfies Worker;
  }).filter((row) => row.id !== "");
};

export type LocalGovernment = {
  local_government_code: string;
  local_government_name: string;
  prefecture_code: string;
  prefecture_name: string;
  municipality_name: string;
};

export type PolygonApiRow = {
  poly_id: number;
  local_government_code?: string;
  coordinates: unknown;
  in_use?: boolean;
};

type FetchPolygonsParams = {
  prefectureCode?: string;
  localGovernmentCode?: string;
};

export const fetchPolygonLocalGovernments = async (signal?: AbortSignal): Promise<LocalGovernment[]> => {
  const res = await fetch("/api/polygons/local-governments", { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as LocalGovernment[];
};

export const fetchPolygons = async (
  params: FetchPolygonsParams,
  signal?: AbortSignal,
): Promise<PolygonApiRow[]> => {
  const qs = new URLSearchParams();
  if (params.prefectureCode?.trim()) {
    qs.set("prefecture_code", params.prefectureCode.trim());
  }
  if (params.localGovernmentCode?.trim()) {
    qs.set("local_government_code", params.localGovernmentCode.trim());
  }

  const suffix = qs.toString();
  const url = suffix ? `/api/polygons?${suffix}` : "/api/polygons";
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PolygonApiRow[];
};
