// src/api.ts
import type { Field, FieldDataResponse, Worker } from "./types";

const isAbortError = (e: unknown): boolean => {
    return e instanceof DOMException && e.name === "AbortError";
};

export const fetchFields = async (signal?: AbortSignal): Promise<Field[]> => {
    const res = await fetch("/api/fields", { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    type ApiField = {
        field_id?: number | string;
        field_name?: string;
        owner_id?: string;
        lat?: number | string;
        lon?: number | string;
        waterlevel?: number | string | null;
        temperature?: number | string | null;
    };
    type ApiRequest = {
        target_field_id?: number | string | null;
    };

    const toNumberOrUndef = (v: unknown): number | undefined => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
        return undefined;
    };

    const rows = (await res.json()) as ApiField[];
    const activeRequestFieldIDs = new Set<string>();

    try {
        // API呼び出し回数を減らすため、依頼一覧はまず全件取得を試す。
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
            const id = row.field_id == null ? "" : String(row.field_id);
            const lat = toNumberOrUndef(row.lat) ?? 0;
            const lon = toNumberOrUndef(row.lon) ?? 0;
            const waterMm = toNumberOrUndef(row.waterlevel ?? undefined);
            const temp = toNumberOrUndef(row.temperature ?? undefined);
            const waterCm = waterMm == null ? undefined : waterMm / 10;

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
                ownerName: (row.owner_id ?? "").trim() || undefined,
                pinAlert,
            } satisfies Field;
        })
        .filter((f) => f.id !== "");
};

export const fetchFieldData = async (padId: string, signal?: AbortSignal): Promise<FieldDataResponse> => {
    const toNumberOrUndef = (v: unknown): number | undefined => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
        return undefined;
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

    const normalizeData = (raw: unknown): FieldDataResponse => {
        // バックエンドの配列レスポンスをフロント共通形式へ寄せるために正規化する。
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

    const rangeQs = new URLSearchParams({
        fromd: fmt(from),
        tod: fmt(now),
    });

    // グラフと同時表示のため、期間データ1回取得して末尾をステータス最新値として使う。
    const rangeRes = await fetch(
        `/api/fields/${encodeURIComponent(padId)}/data?${rangeQs.toString()}`,
        { signal }
    );
    if (!rangeRes.ok) {
        throw new Error(`HTTP ${rangeRes.status}`);
    }

    return normalizeData(await rangeRes.json());
};

export const fetchWorkers = async (signal?: AbortSignal): Promise<Worker[]> => {
    const res = await fetch("/api/workers", { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Worker[];
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
    signal?: AbortSignal
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
