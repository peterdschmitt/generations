
import React from 'react';
import { HistoryItem } from '../App';
import Icon from './Icon';

interface HistoryFeedProps {
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
}

const HistoryFeed: React.FC<HistoryFeedProps> = ({ history, onSelect }) => {
    // Group items by sequenceId for sequence display
    const groupedHistory = React.useMemo(() => {
        const groups: { sequenceId: string | null; items: HistoryItem[] }[] = [];
        const seenSequences = new Set<string>();

        history.forEach(item => {
            if (item.sequenceId) {
                if (!seenSequences.has(item.sequenceId)) {
                    seenSequences.add(item.sequenceId);
                    // Get all items in this sequence
                    const sequenceItems = history
                        .filter(h => h.sequenceId === item.sequenceId)
                        .sort((a, b) => (a.sequenceIndex || 0) - (b.sequenceIndex || 0));
                    groups.push({ sequenceId: item.sequenceId, items: sequenceItems });
                }
            } else {
                groups.push({ sequenceId: null, items: [item] });
            }
        });

        return groups;
    }, [history]);

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-200 mb-4">Your Creations</h2>
            <div className="flex overflow-x-auto space-x-4 pb-4">
                {groupedHistory.map((group, groupIndex) => {
                    // Single item (not a sequence)
                    if (!group.sequenceId || group.items.length === 1) {
                        const item = group.items[0];
                        return (
                            <div
                                key={item.id}
                                className="group relative flex-shrink-0 cursor-pointer"
                                onClick={() => onSelect(item)}
                            >
                                {item.imageUrl ? (
                                     <div className="relative">
                                         <img
                                            src={item.imageUrl}
                                            alt={item.prompt}
                                            className={`w-40 h-40 object-cover rounded-lg border transition-colors ${item.isLocalOnly ? 'border-orange-500/50' : 'border-gray-700 group-hover:border-primary'}`}
                                        />
                                        {item.isLocalOnly && (
                                            <div className="absolute top-2 right-2 bg-black/70 p-1 rounded-full text-orange-400" title="Saved to Local Hard Drive">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" /></svg>
                                            </div>
                                        )}
                                     </div>
                                ) : (
                                     <div className="w-40 h-40 rounded-lg bg-gray-700/50 border border-gray-600 flex flex-col items-center justify-center p-2 text-center group-hover:border-primary transition-colors">
                                        <Icon name={item.type === 'video' ? 'video' : 'image'} className="w-8 h-8 text-gray-500 mb-2" />
                                        <span className="text-[10px] text-gray-400 line-clamp-3 leading-tight px-1">
                                            {item.prompt}
                                        </span>
                                     </div>
                                )}

                                {item.imageUrl && (
                                    <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                         {item.type === 'video' && (
                                            <Icon name="play" className="w-10 h-10 text-white mb-1" />
                                         )}
                                        <p className="text-white text-center text-sm p-2 font-bold">Open</p>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Sequence - show as a stacked card with carousel indicator
                    return (
                        <SequenceCard
                            key={group.sequenceId}
                            items={group.items}
                            onSelect={onSelect}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// Sequence Card Component with mini-carousel
const SequenceCard: React.FC<{
    items: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
}> = ({ items, onSelect }) => {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const activeItem = items[activeIndex];

    const nextSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex(prev => (prev + 1) % items.length);
    };

    const prevSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex(prev => (prev - 1 + items.length) % items.length);
    };

    return (
        <div
            className="group relative flex-shrink-0 cursor-pointer"
            onClick={() => onSelect(activeItem)}
        >
            {/* Stacked effect background cards */}
            <div className="absolute -right-1 -bottom-1 w-40 h-40 bg-gray-700/50 rounded-lg border border-gray-600" />
            <div className="absolute -right-2 -bottom-2 w-40 h-40 bg-gray-800/50 rounded-lg border border-gray-700" />

            {/* Main card */}
            <div className="relative">
                {activeItem.imageUrl ? (
                    <img
                        src={activeItem.imageUrl}
                        alt={activeItem.prompt}
                        className="w-40 h-40 object-cover rounded-lg border-2 border-purple-500/50"
                    />
                ) : (
                    <div className="w-40 h-40 rounded-lg bg-gray-700/50 border-2 border-purple-500/50 flex items-center justify-center">
                        <Icon name="image" className="w-8 h-8 text-gray-500" />
                    </div>
                )}

                {/* Sequence badge */}
                <div className="absolute top-2 left-2 bg-purple-600/90 px-2 py-0.5 rounded-full text-[10px] font-bold text-white">
                    {activeIndex + 1}/{items.length}
                </div>

                {/* Sequence indicator label */}
                <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-purple-300 font-medium">
                    Sequence
                </div>

                {/* Navigation arrows */}
                {items.length > 1 && (
                    <>
                        <button
                            onClick={prevSlide}
                            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Dots indicator */}
                {items.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {items.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveIndex(idx);
                                }}
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                    idx === activeIndex ? 'bg-purple-400' : 'bg-gray-500/50'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg z-10 pointer-events-none">
                <p className="text-white text-center text-sm font-bold">View Sequence</p>
                <p className="text-purple-300 text-xs">{items.length} images</p>
            </div>
        </div>
    );
};

export default HistoryFeed;
