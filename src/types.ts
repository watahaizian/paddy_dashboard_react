export type SensorHealthStatus = "ok" | "no_data" | "stale" | "all_zero" | "same_as_prev";

export type SensorHealth = {
  status: SensorHealthStatus;
  latestMs?: number;
  noData: boolean;
  stale: boolean;
  allZero: boolean;
  sameAsPrev: boolean;
  subBattery1Low: boolean;
  subBattery2Low: boolean;
  waterlevelDayDrop: boolean;
  waterlevel1hRise: boolean;
};

export type MonitorTarget = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  sensorStatus?: 1 | 2 | 3 | 4;
  pinAlert?: "none" | "!" | "!!!";
  sensorHealth?: SensorHealth;
};

export type Field = MonitorTarget & {
  areaId?: number;
  ownerName?: string;
};

export type UnassignedSensor = MonitorTarget & {
  sensorId: number;
  lfourId?: string;
};

export type AreaSummary = {
  areaId: number;
  areaName: string;
  localGovernmentCode?: string;
  areaWeather?: 1 | 2 | 3;
  areaTemp?: number;
  area12Rain?: number;
};

export type Point = {
  t: number;
  waterCm?: number;
  temp?: number;
  battery?: number;
  measured?: string;
};

export type FieldDataResponse = {
  points: Point[];
  last?: Point;
};

export type Worker = {
  id: string;
  name: string;
  area: string;
  method: string;
  photoUrl: string;
  onlineStatus: 1 | 2;
  isOnline: boolean;
  contactEmail: string;
  contactPhone: string;
};
