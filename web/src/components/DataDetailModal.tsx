// src/components/DataDetailModal.tsx
import type { FieldDataResponse } from "../types";

type Props = {
  data: FieldDataResponse | null;
  onClose: () => void;
};

const DataDetailModal = ({ data, onClose }: Props) => {
  if (!data || !data.points) return null;

  // 日付のフォーマット用関数
  const formatDate = (t?: number | string) => {
    if (t == null) return '-';
    const d = typeof t === 'number' ? new Date(t) : new Date(String(t));
    if (Number.isNaN(d.getTime())) return '-';
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-700">データ詳細</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            ✕
          </button>
        </div>

        <div className="overflow-auto p-4 flex-1">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3">日時</th>
                <th scope="col" className="px-6 py-3">水位 (cm)</th>
                <th scope="col" className="px-6 py-3">水温 (℃)</th>
              </tr>
            </thead>
            <tbody>
              {[...data.points].reverse().map((point, index) => (
                <tr key={index} className="bg-white border-b hover:bg-slate-50">
                  <td className="px-6 py-4">{formatDate(point.t ?? point.measured)}</td>
                  <td className="px-6 py-4">{point.waterCm != null ? point.waterCm.toFixed(1) : '-'}</td>
                  <td className="px-6 py-4 text-orange-600">
                    {point.temp != null ? point.temp.toFixed(1) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.points.length === 0 && (
            <div className="text-center py-8 text-gray-400">データがありません</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataDetailModal;