import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import ImagePlaceholder from './ImagePlaceholder';

// Define ImageState locally to avoid circular dependencies if ever needed
interface ImageState {
  file: File | null;
  dataUrl: string | null;
}

interface ImageDropzoneProps {
  imageState: ImageState;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  placeholderLabel: string;
}

// Static Placeholder for use outside the main dropzone context (e.g., in the output panel)
const StaticImagePlaceholder = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-16 w-16 text-gray-500 mb-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
      <span className="text-gray-400">{label}</span>
    </div>
);


const ImageDropzone: React.FC<ImageDropzoneProps> & { Placeholder: typeof StaticImagePlaceholder } = ({
  imageState,
  onFileSelect,
  onRemove,
  placeholderLabel,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      {imageState.dataUrl ? (
        <div className="relative group w-full">
          <img
            src={imageState.dataUrl}
            alt="Uploaded content"
            className="w-full h-auto max-h-[300px] object-contain rounded-lg"
          />
          <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={triggerFileSelect}
              className="bg-gray-900/70 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-800/90"
            >
              Change
            </button>
            <button
              onClick={onRemove}
              className="bg-red-600/80 text-white p-1 rounded-full hover:bg-red-500/90"
              aria-label="Remove image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="w-full h-full"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <ImagePlaceholder label={placeholderLabel} isDraggingOver={isDraggingOver} />
        </div>
      )}
    </div>
  );
};

ImageDropzone.Placeholder = StaticImagePlaceholder;

export default ImageDropzone;