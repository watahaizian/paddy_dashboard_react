import SectionTitle from "./SectionTitle.tsx";

type Row = { label: string; value: string };

const InfoCard = ({ title, rows }: { title: string; rows: Row[] }) => {
  return (
    <div className="bg-white border rounded-2xl p-3">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-2 space-y-2">
        {rows.map((r) => (
          <InfoRow key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
    </div>
  );
};
export default InfoCard;

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex items-start gap-2">
      {/* Flutter: label幅 180 */}
      <div className="w-[180px] text-slate-600">{label}</div>
      <div className="flex-1 font-medium">{value}</div>
    </div>
  );
};
