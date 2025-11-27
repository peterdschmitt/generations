import React from 'react';
import { SourcePhoto } from '../services/sourcePhotoService';
import Icon from './Icon';

interface SourcePhotoPickerProps {
    sourcePhotos: SourcePhoto[];
    selectedPhotos: SourcePhoto[];
    onSelectionChange: (photos: SourcePhoto[]) => void;
    maxSelection?: number;
}

const SourcePhotoPicker: React.FC<SourcePhotoPickerProps> = ({
    sourcePhotos,
    selectedPhotos,
    onSelectionChange,
    maxSelection = 5
}) => {
    const isSelected = (photo: SourcePhoto) =>
        selectedPhotos.some(p => p.id === photo.id);

    const toggleSelection = (photo: SourcePhoto) => {
        if (isSelected(photo)) {
            onSelectionChange(selectedPhotos.filter(p => p.id !== photo.id));
        } else if (selectedPhotos.length < maxSelection) {
            onSelectionChange([...selectedPhotos, photo]);
        }
    };

    const clearSelection = () => {
        onSelectionChange([]);
    };

    if (sourcePhotos.length === 0) {
        return (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
                <Icon name="image" className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No source photos available</p>
                <p className="text-gray-500 text-xs mt-1">
                    Go to Source Library tab to upload photos
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Source Photos ({selectedPhotos.length}/{maxSelection} selected)
                </label>
                {selectedPhotos.length > 0 && (
                    <button
                        onClick={clearSelection}
                        className="text-xs text-red-400 hover:text-red-300"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Selected Photos Preview */}
            {selectedPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                    {selectedPhotos.map((photo, index) => (
                        <div
                            key={photo.id}
                            className="relative group"
                        >
                            <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-primary">
                                <img
                                    src={photo.imageUrl}
                                    alt={photo.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                                {index + 1}
                            </span>
                            <button
                                onClick={() => toggleSelection(photo)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Photo Grid for Selection */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2">
                    {sourcePhotos.map((photo) => {
                        const selected = isSelected(photo);
                        const selectionIndex = selectedPhotos.findIndex(p => p.id === photo.id);
                        const canSelect = selected || selectedPhotos.length < maxSelection;

                        return (
                            <button
                                key={photo.id}
                                onClick={() => canSelect && toggleSelection(photo)}
                                disabled={!canSelect}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                    selected
                                        ? 'border-primary ring-2 ring-primary/50'
                                        : canSelect
                                        ? 'border-transparent hover:border-gray-500'
                                        : 'border-transparent opacity-50 cursor-not-allowed'
                                }`}
                            >
                                <img
                                    src={photo.imageUrl}
                                    alt={photo.name}
                                    className="w-full h-full object-cover"
                                />
                                {selected && (
                                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                        <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                                            {selectionIndex + 1}
                                        </span>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                                    <p className="text-white text-[10px] truncate">{photo.name}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <p className="text-xs text-gray-500">
                Select up to {maxSelection} reference photos. These will be analyzed by Gemini to inform the style and composition of your sequence.
            </p>
        </div>
    );
};

export default SourcePhotoPicker;
