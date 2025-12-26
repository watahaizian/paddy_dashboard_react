export type Field = {
    id: string;
    name: string;
    lat: number;
    lon: number;
    ownerName?: string;
};

export type Point = {
    t: number; // epoch millis
    waterCm?: number;
    temp?: number;
    battery?: number;
    measured?: string;
};

export type FieldDataResponse = {
    points: Point[];
    last?: Point;
};
