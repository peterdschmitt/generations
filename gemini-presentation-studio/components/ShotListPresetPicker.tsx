import React, { useState } from 'react';
import { SHOT_LIST_PRESETS, PRESET_CATEGORIES, ShotListPreset } from '../data/shotListPresets';
import Icon from './Icon';

interface ShotListPresetPickerProps {
    onApply: (preset: ShotListPreset) => void;
}

const ShotListPresetPicker: React.FC<ShotListPresetPickerProps> = ({ onApply }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [hoveredPreset, setHoveredPreset] = useState<ShotListPreset | null>(null);

    const filteredPresets = selectedCategory
        ? SHOT_LIST_PRESETS.filter(p => p.category === selectedCategory)
        : SHOT_LIST_PRESETS;

    const handleApply = (preset: ShotListPreset) => {
        onApply(preset);
        setIsOpen(false);
        setHoveredPreset(null);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 px-3 py-1.5 rounded-lg border border-purple-700/50 transition-colors"
            >
                <Icon name="bulb" className="w-4 h-4" />
                Use Shot List Template
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Panel */}
                    <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                            <h3 className="text-sm font-bold text-white">Shot List Templates</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Pre-built camera angle sequences for common projects
                            </p>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex gap-1 p-2 bg-gray-800/50 border-b border-gray-700 overflow-x-auto">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap transition-colors ${
                                    !selectedCategory
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                            >
                                All
                            </button>
                            {PRESET_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap transition-colors ${
                                        selectedCategory === cat.id
                                            ? 'bg-purple-600 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Preset List */}
                        <div className="max-h-64 overflow-y-auto">
                            {filteredPresets.map(preset => (
                                <div
                                    key={preset.id}
                                    className="relative"
                                    onMouseEnter={() => setHoveredPreset(preset)}
                                    onMouseLeave={() => setHoveredPreset(null)}
                                >
                                    <button
                                        onClick={() => handleApply(preset)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-sm font-medium text-white">
                                                    {preset.name}
                                                </span>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {preset.description}
                                                </p>
                                            </div>
                                            <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                                                {preset.shots.length} shots
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Preview Panel (shows on hover) */}
                        {hoveredPreset && (
                            <div className="absolute left-full top-0 ml-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 z-50">
                                <h4 className="text-sm font-bold text-white mb-3">
                                    {hoveredPreset.name}
                                </h4>
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {hoveredPreset.shots.map((shot, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-gray-800 rounded-lg p-2"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded flex items-center justify-center">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-[10px] text-purple-300 font-medium">
                                                    {shot.purpose}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                {shot.angle}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700">
                            <p className="text-[10px] text-gray-500">
                                Click to apply template. Angles will auto-fill.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ShotListPresetPicker;
