type Props = { isCompact: boolean };

const cards = [
  { title: "作業待ち圃場：3件", items: ["圃場A", "圃場B", "圃場C"] },
  { title: "割当待ち圃場：1件", items: ["圃場D"] },
  { title: "稼働中メンバ：2人", items: ["水谷", "阪木"] },
];

const BottomSummarySection = ({ isCompact }: Props) => {
  if (isCompact) {
    // Flutter: Wrap(spacing:16, runSpacing:16)
    return (
      <div className="h-full flex flex-wrap gap-4">
        {cards.map((c) => (
          <SummaryCard key={c.title} title={c.title} items={c.items} />
        ))}
      </div>
    );
  }

  // Flutter: Row + Expandedで3枚
  return (
    <div className="h-full grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <SummaryCard key={c.title} title={c.title} items={c.items} />
      ))}
    </div>
  );
};
export default BottomSummarySection;

const SummaryCard = ({ title, items }: { title: string; items: string[] }) => {
  return (
    <div className="h-full bg-white border rounded-2xl p-4 flex flex-col min-w-[220px]">
      <div className="font-bold">{title}</div>
      <div className="mt-3 flex-1 border rounded-xl bg-slate-50 p-3 flex flex-col justify-center gap-2">
        {items.map((it) => (
          <div key={it}>{it}</div>
        ))}
      </div>
    </div>
  );
};
