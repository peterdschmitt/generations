import React from 'react';
import Icon from './Icon';

interface ImagePlaceholderProps {
  label: string;
  isDraggingOver?: boolean;
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ label, isDraggingOver }) => {
  const baseClasses = "flex flex-col items-center justify-center w-full h-full bg-gray-900/30 border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300";
  const stateClasses = isDraggingOver 
    ? "border-primary cursor-copy"
    : "border-gray-600 hover:border-gray-500 cursor-pointer";

  return (
    <div className={`${baseClasses} ${stateClasses}`}>
      <Icon name="image" className="h-16 w-16 text-gray-500 mb-4" />
      <span className="text-gray-400">{label}</span>
    </div>
  );
};

export default ImagePlaceholder;