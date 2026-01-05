// src/components/DashboardButton.tsx

type Props = {
  label: string;
  heightClass?: string;
  onClick?: () => void; // クリックイベントを受け取れるように追加
};

const DashboardButton = ({
  label,
  heightClass = "h-12",
  onClick,
}: Props) => {
  return (
    <button
      className={`${heightClass} rounded-xl bg-slate-800 text-white font-semibold hover:opacity-90 relative z-20 w-full`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default DashboardButton;
