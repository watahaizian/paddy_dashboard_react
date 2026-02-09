// src/components/PhotoModal.tsx
type Props = {
  imageUrl?: string;
  onClose: () => void;
};

const PhotoModal = ({ imageUrl, onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white p-2 hover:text-gray-300"
        >
          閉じる ✕
        </button>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Field Snapshot"
            className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="w-[70vw] max-w-3xl max-h-[70vh] bg-white rounded-2xl shadow-2xl p-8 text-center text-slate-600">
            写真プレビューは準備中です。
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoModal;
