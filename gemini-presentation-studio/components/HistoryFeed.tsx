
import React from 'react';
import { HistoryItem } from '../App';
import Icon from './Icon';

interface HistoryFeedProps {
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
}

const HistoryFeed: React.FC<HistoryFeedProps> = ({ history, onSelect }) => {
    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-200 mb-4">Your Creations</h2>
            <div className="flex overflow-x-auto space-x-4 pb-4">
                {history.map((item) => (
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
                            // Placeholder for Items without Images (Text/Metadata only)
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
                ))}
            </div>
        </div>
    );
};

export default HistoryFeed;
