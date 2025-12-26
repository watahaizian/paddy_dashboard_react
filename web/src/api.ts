import type { Field, FieldDataResponse } from "./types";
import { makeDemoFieldData } from "./demo";

const isAbortError = (e: unknown): boolean => {
    return e instanceof DOMException && e.name === "AbortError";
}

export const fetchFields = async (signal?: AbortSignal): Promise<Field[]> => {
    const res = await fetch("/api/fields", { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Field[];
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
