// src/components/BottomSummarySection.tsx
import { useState } from "react";

type Props = { isCompact: boolean };

const cards = [
  { title: "要対応圃場：1件", items: ["圃場E"] },
  { title: "作業待ち圃場：3件", items: ["圃場A", "圃場B", "圃場C"] },
  { title: "割当待ち圃場：1件", items: ["圃場D"] },
  { title: "稼働中メンバ：2人", items: ["水谷", "阪木"] },
];

const BottomSummarySection = ({ isCompact }: Props) => {
  const [activeCard, setActiveCard] = useState<{
    title: string;
    items: string[];
  } | null>(null);

  if (isCompact) {
    return (
      <div className="h-full grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {cards.map((c) => (
          <SummaryCard
            key={c.title}
            title={c.title}
            items={c.items}
            onClick={() => setActiveCard(c)}
          />
        ))}
        {activeCard && (
          <SummaryModal
            title={activeCard.title}
            items={activeCard.items}
            onClose={() => setActiveCard(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-full grid grid-cols-4 gap-4">
      {cards.map((c) => (
        <SummaryCard
          key={c.title}
          title={c.title}
          items={c.items}
          onClick={() => setActiveCard(c)}
        />
      ))}
      {activeCard && (
        <SummaryModal
          title={activeCard.title}
          items={activeCard.items}
          onClose={() => setActiveCard(null)}
        />
      )}
    </div>
  );
};
export default BottomSummarySection;

const SummaryCard = ({
  title,
  items,
  onClick,
}: {
  title: string;
  items: string[];
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-full bg-white border rounded-2xl p-4 flex flex-col w-full text-left hover:shadow-md transition-shadow"
    >
      <div className="font-bold">{title}</div>
      <div className="mt-3 flex-1 border rounded-xl bg-slate-50 p-3 flex flex-col justify-center gap-2">
        {items.map((it) => (
          <div key={it}>{it}</div>
        ))}
      </div>
    </button>
  );
};

const SummaryModal = ({
  title,
  items,
  onClose,
}: {
  title: string;
  items: string[];
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div className="font-bold text-slate-700">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500"
          >
            閉じる
          </button>
        </div>
        <div className="p-4">
          {items.length === 0 ? (
            <div className="text-center text-slate-400">
              対象データがありません。
            </div>
          ) : (
            <ul className="space-y-2 text-slate-700">
              {items.map((it) => (
                <li key={it} className="border rounded-lg px-3 py-2 bg-slate-50">
                  {it}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
