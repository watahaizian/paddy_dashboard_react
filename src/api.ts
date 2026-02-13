// src/api.ts
import type { Field, FieldDataResponse, Worker } from "./types";
import { makeDemoFieldData } from "./demo";

const isAbortError = (e: unknown): boolean => {
    return e instanceof DOMException && e.name === "AbortError";
}

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

    const toNumberOrUndef = (v: unknown): number | undefined => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
        return undefined;
    };

    const rows = (await res.json()) as ApiField[];
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
    try {
        const res = await fetch(`/api/fields/${encodeURIComponent(padId)}/data`, {
            signal,
        });
        if (res.ok) {
            const data = (await res.json()) as FieldDataResponse;
            if (!data?.points || data.points.length === 0) {
                return makeDemoFieldData(padId, 24);
            }
            return data;
        }

        throw new Error(`HTTP ${res.status}`);
    } catch (e) {
        if (isAbortError(e)) {
            throw e;
        }
        return makeDemoFieldData(padId, 24);
    }
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
