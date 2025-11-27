
import React from 'react';
import { ThemeDeck, THEME_DECKS } from '../data/themes';

interface ThemeSelectorProps {
    selectedThemeId: string;
    onSelect: (themeId: string) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ selectedThemeId, onSelect }) => {
    return (
        <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Creative Direction / Theme
            </label>
            <div className="grid grid-cols-2 gap-3">
                {THEME_DECKS.map((theme) => {
                    const isSelected = selectedThemeId === theme.id;
                    return (
                        <button
                            key={theme.id}
                            onClick={() => onSelect(theme.id)}
                            className={`relative overflow-hidden rounded-xl p-3 text-left transition-all duration-200 border ${
                                isSelected 
                                    ? 'border-white ring-2 ring-primary ring-offset-2 ring-offset-gray-900 scale-[1.02]' 
                                    : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800'
                            }`}
                        >
                            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${theme.color} opacity-20 blur-xl rounded-full -mr-4 -mt-4`}></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                        {theme.label}
                                    </span>
                                    {isSelected && (
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight">
                                    {theme.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ThemeSelector;
