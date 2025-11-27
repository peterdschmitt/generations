import React from 'react';
import Spinner from './Spinner';

export interface SequenceProgressItem {
    index: number;
    status: 'pending' | 'generating' | 'completed' | 'error';
    imageUrl?: string;
    error?: string;
}

interface SequenceProgressProps {
    total: number;
    items: SequenceProgressItem[];
    currentIndex: number;
    message?: string;
}

const SequenceProgress: React.FC<SequenceProgressProps> = ({
    total,
    items,
    currentIndex,
    message
}) => {
    const completedCount = items.filter(i => i.status === 'completed').length;
    const progressPercent = (completedCount / total) * 100;

    return (
        <div className="bg-gray-900/80 border border-primary/30 rounded-xl p-4 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Spinner />
                    <span className="text-white font-medium">
                        Generating Sequence
                    </span>
                </div>
                <span className="text-primary font-bold">
                    {completedCount} / {total}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-primary to-purple-500 h-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Status Message */}
            {message && (
                <p className="text-sm text-gray-400 text-center animate-pulse">
                    {message}
                </p>
            )}

            {/* Image Thumbnails */}
            <div className="flex gap-2 justify-center flex-wrap">
                {Array.from({ length: total }).map((_, index) => {
                    const item = items.find(i => i.index === index);
                    const status = item?.status || 'pending';

                    return (
                        <div
                            key={index}
                            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                status === 'completed'
                                    ? 'border-green-500'
                                    : status === 'generating'
                                    ? 'border-primary animate-pulse'
                                    : status === 'error'
                                    ? 'border-red-500'
                                    : 'border-gray-700'
                            }`}
                        >
                            {status === 'completed' && item?.imageUrl ? (
                                <img
                                    src={item.imageUrl}
                                    alt={`Image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center ${
                                    status === 'generating' ? 'bg-primary/20' :
                                    status === 'error' ? 'bg-red-900/30' :
                                    'bg-gray-800'
                                }`}>
                                    {status === 'generating' ? (
                                        <Spinner />
                                    ) : status === 'error' ? (
                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        <span className="text-gray-600 font-bold">{index + 1}</span>
                                    )}
                                </div>
                            )}

                            {/* Status indicator badge */}
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                status === 'completed' ? 'bg-green-500 text-white' :
                                status === 'generating' ? 'bg-primary text-white' :
                                status === 'error' ? 'bg-red-500 text-white' :
                                'bg-gray-700 text-gray-400'
                            }`}>
                                {status === 'completed' ? (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : status === 'generating' ? (
                                    '...'
                                ) : status === 'error' ? (
                                    '!'
                                ) : (
                                    index + 1
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Error messages */}
            {items.filter(i => i.status === 'error').map(item => (
                <div key={item.index} className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded">
                    Image {item.index + 1} failed: {item.error || 'Unknown error'}
                </div>
            ))}
        </div>
    );
};

export default SequenceProgress;
