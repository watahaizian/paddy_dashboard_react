// src/components/ScheduleCard.tsx
import SectionTitle from "./SectionTitle.tsx";

const ScheduleCard = () => {
  return (
    <div className="h-full bg-white border rounded-2xl p-3">
      <SectionTitle>作業スケジュール</SectionTitle>
      <div className="mt-2 space-y-2">
        <Entry date="◆◆/◆◆" action="給水門　閉" person="担当者名" />
        <Entry date="■■/■■" action="見回り" person="担当者名" />
      </div>
    </div>
  );
};
export default ScheduleCard;

const Entry = ({ date, action, person }: { date: string; action: string; person: string }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="w-[72px] tabular-nums">{date}</div>
      <div className="flex-1">{action}</div>
      <div>{person}</div>
    </div>
  );
};
