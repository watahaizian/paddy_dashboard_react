import { useState } from "react";
import type { FieldDataResponse, MonitorTarget } from "../types";
import ChartCard from "./ChartCard";
import SensorStatusCard from "./SensorStatusCard";
import DashboardButton from "./DashboardButton";
import DataDetailModal from "./DataDetailModal";
import PhotoModal from "./PhotoModal";

type Props = {
  title: string;
  target: MonitorTarget;
  imageUrl?: string;
  data: FieldDataResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  showPhotoButton?: boolean;
};

const ChartsAndStatusPanel = ({
  title,
  target,
  data,
  imageUrl,
  loading,
  error,
  onRefresh,
  showPhotoButton = true,
}: Props) => {
  const [showDetail, setShowDetail] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  return (
    <>
      <div className="h-full min-h-0 bg-white border rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 font-bold truncate">{title} のセンサーデータ</div>
          <button
            className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 disabled:opacity-50"
            onClick={onRefresh}
            disabled={loading}
            title="最新のデータを取得"
          >
            更新
          </button>
        </div>

        <div className="mt-3 h-full min-h-0">
          <div className="h-full flex flex-col min-[520px]:flex-row gap-4">
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <div className="flex-1 min-h-0">
                <ChartCard
                  title="水位"
                  unit="cm"
                  kind="waterCm"
                  data={data}
                  loading={loading}
                  error={error}
                />
              </div>
              <div className="flex-1 min-h-0">
                <ChartCard
                  title="水温"
                  unit="℃"
                  kind="temp"
                  data={data}
                  loading={loading}
                  error={error}
                />
              </div>
            </div>

            <div className="w-full min-[520px]:w-[220px] flex-none flex flex-col gap-2 z-10">
              <div className="flex-1 min-h-0">
                <SensorStatusCard target={target} data={data} loading={loading} error={error} />
              </div>
              <DashboardButton label="データ詳細" heightClass="h-11" onClick={() => setShowDetail(true)} />
              {showPhotoButton && (
                <DashboardButton label="写真" heightClass="h-11" onClick={() => setShowPhoto(true)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {showDetail && <DataDetailModal data={data} onClose={() => setShowDetail(false)} />}
      {showPhoto && showPhotoButton && (
        <PhotoModal imageUrl={imageUrl} onClose={() => setShowPhoto(false)} />
      )}
    </>
  );
};

export default ChartsAndStatusPanel;
