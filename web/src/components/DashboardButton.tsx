const DashboardButton = ({
  label,
  heightClass = "h-12",
}: {
  label: string;
  heightClass?: string;
}) => {
  return (
    <button
      className={`${heightClass} rounded-xl bg-slate-800 text-white font-semibold hover:opacity-90 relative z-20`}
      onClick={() => { }}
    >
      {label}
    </button>
  );
};
export default DashboardButton;
