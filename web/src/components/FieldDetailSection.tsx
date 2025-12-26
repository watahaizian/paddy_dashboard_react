import type { Field, FieldDataResponse } from "../types";
import ChartsAndStatusPanel from "./ChartsAndStatusPanel.tsx";
import ScheduleCard from "./ScheduleCard.tsx";
import ActivityLogCard from "./ActivityLogCard.tsx";
import InfoCard from "./InfoCard.tsx";

type Props = {
  isCompact: boolean;
  field: Field | null;
  data: FieldDataResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  wrapContent: boolean;
};

const FieldDetailSection = ({
  isCompact,
  field,
  data,
  loading,
  error,
  onRefresh,
  wrapContent,
}: Props) => {
  if (!field) {
    return (
      <div className="bg-white border rounded-2xl p-12 grid place-items-center">
        圃場を選択してください。
      </div>
    );
  }

  const basicInfo = [
    { label: "圃場名", value: field.name },
    { label: "緯度", value: field.lat.toFixed(5) },
    { label: "経度", value: field.lon.toFixed(5) },
  ];
  const ownerInfo = [
    { label: "所有者名", value: field.ownerName?.trim() ? field.ownerName : "--" },
    { label: "連絡先", value: "--" },
    { label: "加入プラン", value: "--" },
  ];

  const buildScheduleAndLog = (tight: boolean) => {
    if (isCompact) {
      if (tight) {
        return (
          <div className="space-y-3">
            <div className="h-[100px]">
              <ScheduleCard />
            </div>
            <div className="h-[100px]">
              <ActivityLogCard />
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <ScheduleCard />
          <ActivityLogCard />
        </div>
      );
    }

    // PCは横2枚
    return (
      <div className={`flex gap-4 ${tight ? "items-stretch" : "items-start"}`}>
        <div className="flex-1 min-w-0">
          <ScheduleCard />
        </div>
        <div className="flex-1 min-w-0">
          <ActivityLogCard />
        </div>
      </div>
    );
  };

  const buildInfoPanels = (tight: boolean) => {
    if (isCompact) {
      if (tight) {
        return (
          <div className="space-y-3">
            <div className="h-[110px]">
              <InfoCard title="圃場情報" rows={basicInfo} />
            </div>
            <div className="h-[110px]">
              <InfoCard title="所有者情報" rows={ownerInfo} />
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <InfoCard title="圃場情報" rows={basicInfo} />
          <InfoCard title="所有者情報" rows={ownerInfo} />
        </div>
      );
    }

    // PCは横2枚
    return (
      <div className={`flex gap-4 ${tight ? "items-stretch" : "items-start"}`}>
        <div className="flex-1 min-w-0">
          <InfoCard title="圃場情報" rows={basicInfo} />
        </div>
        <div className="flex-1 min-w-0">
          <InfoCard title="所有者情報" rows={ownerInfo} />
        </div>
      </div>
    );
  };

  // wrapContent（モバイルの中スクロール用）はそのまま
  if (wrapContent) {
    return (
      <div className="space-y-3">
        <div className="h-auto">
          <ChartsAndStatusPanel
            padId={field.id}
            fieldName={field.name}
            data={data}
            loading={loading}
            error={error}
            onRefresh={onRefresh}
          />
        </div>
        {buildScheduleAndLog(false)}
        {buildInfoPanels(false)}
      </div>
    );
  }

  // ✅ PC側：高さ固定（60vh）をやめる。必要な分だけ伸びて下を押し下げる
  return (
    <div className="space-y-3">
      <div className="min-h-[360px] min-w-0">
        <ChartsAndStatusPanel
          padId={field.id}
          fieldName={field.name}
          data={data}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
        />
      </div>

      {buildScheduleAndLog(false)}
      {buildInfoPanels(false)}
    </div>
  );
};

export default FieldDetailSection;
