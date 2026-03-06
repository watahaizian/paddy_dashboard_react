import type { FieldDataResponse, UnassignedSensor } from "../types";
import ChartsAndStatusPanel from "./ChartsAndStatusPanel";
import InfoCard from "./InfoCard";

type Props = {
  isCompact: boolean;
  sensor: UnassignedSensor | null;
  data: FieldDataResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  wrapContent: boolean;
};

const SensorDetailSection = ({
  isCompact,
  sensor,
  data,
  loading,
  error,
  onRefresh,
  wrapContent,
}: Props) => {
  if (!sensor) {
    return (
      <div className="bg-white border rounded-2xl p-12 grid place-items-center">
        未割当センサーを選択してください。
      </div>
    );
  }

  const sensorInfo = [
    { label: "センサーID", value: String(sensor.sensorId) },
    { label: "ELTRESID", value: sensor.lfourId?.trim() ? sensor.lfourId : "--" },
    { label: "緯度", value: sensor.lat.toFixed(5) },
    { label: "経度", value: sensor.lon.toFixed(5) },
  ];
  const noteInfo = [
    { label: "状態", value: sensor.sensorStatus === 4 ? "異常" : "未割当" },
    { label: "圃場紐付け", value: "なし" },
  ];

  const infoPanels = isCompact ? (
    <div className="space-y-3">
      <InfoCard title="未割当センサー情報" rows={sensorInfo} />
      <InfoCard title="補足" rows={noteInfo} />
    </div>
  ) : (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <InfoCard title="未割当センサー情報" rows={sensorInfo} />
      </div>
      <div className="flex-1 min-w-0">
        <InfoCard title="補足" rows={noteInfo} />
      </div>
    </div>
  );

  if (wrapContent) {
    return (
      <div className="space-y-3">
        <ChartsAndStatusPanel
          title={sensor.name}
          target={sensor}
          data={data}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          showPhotoButton={false}
        />
        {infoPanels}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="min-h-[360px] min-w-0">
        <ChartsAndStatusPanel
          title={sensor.name}
          target={sensor}
          data={data}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          showPhotoButton={false}
        />
      </div>
      {infoPanels}
    </div>
  );
};

export default SensorDetailSection;
