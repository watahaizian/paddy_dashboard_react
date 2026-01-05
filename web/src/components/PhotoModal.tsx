// src/components/PhotoModal.tsx
type Props = {
  imageUrl: string;
  onClose: () => void;
};

const PhotoModal = ({ imageUrl, onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative max-w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white p-2 hover:text-gray-300"
        >
          閉じる ✕
        </button>
        <img
          src={imageUrl}
          alt="Field Snapshot"
          className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

export default PhotoModal;