import React, { useState, useCallback } from 'react';
import { SourcePhoto } from '../services/sourcePhotoService';
import Icon from './Icon';
import Spinner from './Spinner';

interface SourceLibraryTabProps {
    sourcePhotos: SourcePhoto[];
    isLoading: boolean;
    onUpload: (name: string, base64Image: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onRefresh: () => void;
    error: string | null;
}

const SourceLibraryTab: React.FC<SourceLibraryTabProps> = ({
    sourcePhotos,
    isLoading,
    onUpload,
    onDelete,
    onRefresh,
    error
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadName, setUploadName] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImage(reader.result as string);
            // Auto-generate name from filename
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            setUploadName(baseName);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragActive(false);
    }, []);

    const handleUpload = async () => {
        if (!previewImage || !uploadName.trim()) return;
        setIsUploading(true);
        try {
            await onUpload(uploadName.trim(), previewImage);
            setPreviewImage(null);
            setUploadName('');
        } catch (e) {
            console.error('Upload failed:', e);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await onDelete(id);
        } finally {
            setDeletingId(null);
        }
    };

    const cancelUpload = () => {
        setPreviewImage(null);
        setUploadName('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Source Photo Library</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Upload reference photos to use in sequence generation
                    </p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="text-sm text-primary hover:text-white flex items-center gap-1"
                >
                    <Icon name="sparkles" className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-900/50 text-red-200 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Upload Zone */}
            <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700">
                {!previewImage ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                            dragActive
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-600 hover:border-gray-500'
                        }`}
                    >
                        <Icon name="image" className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-300 mb-2">
                            Drag & drop an image here, or click to select
                        </p>
                        <p className="text-gray-500 text-sm mb-4">
                            PNG, JPG, WebP up to 10MB
                        </p>
                        <label className="inline-block">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                className="hidden"
                            />
                            <span className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg cursor-pointer font-medium">
                                Select Image
                            </span>
                        </label>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                                <img
                                    src={previewImage}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                                        Photo Name
                                    </label>
                                    <input
                                        type="text"
                                        value={uploadName}
                                        onChange={(e) => setUploadName(e.target.value)}
                                        placeholder="e.g., Product Shot 1"
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleUpload}
                                        disabled={isUploading || !uploadName.trim()}
                                        className="flex-1 bg-primary hover:bg-primary-hover disabled:bg-gray-700 disabled:text-gray-400 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Spinner />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="sparkles" className="w-4 h-4" />
                                                Upload to Library
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={cancelUpload}
                                        disabled={isUploading}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Photo Grid */}
            <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                    Your Photos ({sourcePhotos.length})
                </h3>

                {isLoading ? (
                    <div className="text-center py-12">
                        <Spinner />
                        <p className="text-gray-400 mt-2">Loading photos...</p>
                    </div>
                ) : sourcePhotos.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Icon name="image" className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No source photos yet</p>
                        <p className="text-sm mt-1">Upload some photos to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {sourcePhotos.map((photo) => (
                            <div
                                key={photo.id}
                                className="group relative bg-gray-900 rounded-lg overflow-hidden aspect-square"
                            >
                                <img
                                    src={photo.imageUrl}
                                    alt={photo.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                        <p className="text-white text-sm font-medium truncate">
                                            {photo.name}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(photo.id)}
                                    disabled={deletingId === photo.id}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {deletingId === photo.id ? (
                                        <Spinner />
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SourceLibraryTab;
