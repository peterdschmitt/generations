
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { ThemeRecord, fetchThemes, createTheme, deleteTheme, AirtableConfig } from '../services/airtableService';

// Expanded defaults based on user's high-leverage prompt list
const DEFAULT_THEMES: ThemeRecord[] = [
    // Visual Style & Mood
    { id: 'def-style-1', name: 'Modern SaaS Vector', prompt: 'Generate a flat vector illustration in a modern SaaS landing‑page style, no gradients, minimal shading.' },
    { id: 'def-style-2', name: 'Corporate Blue Palette', prompt: 'Use a limited palette of navy, cyan, and white only, with navy as the background and cyan for highlights.' },
    { id: 'def-style-3', name: 'Bright & Optimistic', prompt: 'Make the overall mood bright and optimistic, with lots of light and open space, avoiding dark or gloomy tones.' },
    
    // Photography & Lighting
    { id: 'def-photo-1', name: 'Corporate Headshot', prompt: 'Show a close‑up portrait from the shoulders up, camera at eye level, with very little background visible. Light the scene with warm golden‑hour sunlight.' },
    { id: 'def-photo-2', name: 'Golden Hour Realism', prompt: 'Light the scene with warm golden‑hour sunlight from the left, with soft, natural shadows on the right.' },
    { id: 'def-photo-3', name: 'Cinematic 35mm Lens', prompt: 'Render this as if shot with a 35mm lens, slightly wide, with shallow depth of field and strong bokeh in the background.' },
    { id: 'def-photo-4', name: 'Product Focal Point', prompt: 'Place the main product in the exact center, large, with the background softly blurred so nothing distracts from it.' },

    // Layouts: Social & Marketing
    { id: 'def-layout-1', name: 'YouTube Thumbnail (16:9)', prompt: 'Create a 16:9 YouTube thumbnail with plenty of negative space on the right for text.' },
    { id: 'def-layout-2', name: 'Vertical Poster', prompt: 'Create a vertical poster with a large hero image on top, headline in the middle, and call‑to‑action button at the bottom.' },
    { id: 'def-layout-3', name: 'Presentation Title Slide', prompt: 'Design a presentation title slide: large centered headline at top, smaller subtitle underneath, and a subtle abstract background.' },

    // UI & Dashboards
    { id: 'def-ui-1', name: 'Dashboard UI Mockup', prompt: 'Mock up a SaaS analytics dashboard with a top nav, left sidebar, and three main metric cards in the center.' },
    
    // Data Visualization
    { id: 'def-data-1', name: 'Infographic Funnel', prompt: 'Design a 16:9 infographic explaining our 3‑step funnel. Use three big numbered sections with short labels and matching icons.' },
    { id: 'def-data-2', name: 'Minimal Bar Chart', prompt: 'Draw a clean, minimal bar chart with 4 bars showing a steady upward trend; use brand colors only.' },
    { id: 'def-data-3', name: 'Flowchart (5-Step)', prompt: 'Create a left‑to‑right flowchart with 5 boxes connected by arrows, each box having a short, readable label.' },

    // Animation & Video Prep
    { id: 'def-anim-1', name: 'Animation Keyframes (Zoom)', prompt: 'Produce 4 keyframe images of this subject: frame 1 small and distant, frame 4 very large close‑up, so they can be animated as a zoom‑in.' },
];

interface CreativeDirectionManagerProps {
    config: AirtableConfig;
    selectedThemePrompt: string;
    onSelect: (prompt: string) => void;
}

const CreativeDirectionManager: React.FC<CreativeDirectionManagerProps> = ({ config, selectedThemePrompt, onSelect }) => {
    const [themes, setThemes] = useState<ThemeRecord[]>(DEFAULT_THEMES);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    
    // Form State
    const [newName, setNewName] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadThemes();
    }, [config]);

    const loadThemes = async () => {
        setIsLoading(true);
        try {
            const remoteThemes = await fetchThemes(config);
            // Combine defaults with remote themes from Airtable
            setThemes([...DEFAULT_THEMES, ...remoteThemes]);
        } catch (e) {
            console.error("Failed to load themes", e);
            // Fallback to defaults if Airtable fails
            setThemes(DEFAULT_THEMES);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim() || !newPrompt.trim()) return;
        setIsSaving(true);
        try {
            const newTheme = await createTheme(config, newName, newPrompt);
            setThemes(prev => [...prev, newTheme]);
            setNewName('');
            setNewPrompt('');
            // Optional: Auto-select the new theme
            onSelect(newTheme.prompt);
        } catch (e) {
            alert("Failed to save to Airtable. Check your configuration.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (id.startsWith('def-')) {
            alert("Cannot delete default presets.");
            return;
        }
        if (!confirm("Are you sure you want to delete this theme from Airtable?")) return;
        
        try {
            await deleteTheme(config, id);
            setThemes(prev => prev.filter(t => t.id !== id));
            if (selectedThemePrompt === themes.find(t => t.id === id)?.prompt) {
                onSelect('');
            }
        } catch (e) {
            alert("Failed to delete.");
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Creative Direction
                </label>
                <button 
                    onClick={() => setShowModal(true)}
                    className="text-[10px] text-primary-light hover:text-white underline"
                >
                    Manage Presets
                </button>
            </div>
            
            <div className="relative">
                <select
                    value={selectedThemePrompt}
                    onChange={(e) => onSelect(e.target.value)}
                    className="w-full appearance-none bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                >
                    <option value="">Select a Direction...</option>
                    {themes.map(t => (
                        <option key={t.id} value={t.prompt}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>

            {/* CRUD MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="bg-gray-900/50 p-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-md font-bold text-white">Manage Creative Directions</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><Icon name="close" className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto flex-1 space-y-6">
                            {/* Create New */}
                            <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600 space-y-3">
                                <h4 className="text-xs font-bold text-primary-light uppercase">Add New Custom Preset</h4>
                                <input 
                                    type="text" 
                                    placeholder="Name (e.g. My Brand Dark Mode)" 
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                                <textarea 
                                    placeholder="Prompt Instruction (e.g. Use a dark background with neon accents, keep text bold...)" 
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white h-24 resize-none focus:border-primary outline-none"
                                    value={newPrompt}
                                    onChange={e => setNewPrompt(e.target.value)}
                                />
                                <button 
                                    onClick={handleCreate}
                                    disabled={isSaving || !newName || !newPrompt}
                                    className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-600 text-white py-2 rounded text-sm font-bold transition-colors shadow-md"
                                >
                                    {isSaving ? 'Saving to Airtable...' : 'Save to Airtable'}
                                </button>
                            </div>

                            {/* List Existing */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase sticky top-0 bg-gray-800 py-1">Existing Presets</h4>
                                {themes.map(t => (
                                    <div key={t.id} className="flex items-start justify-between bg-gray-900/50 p-3 rounded border border-gray-700 hover:border-gray-500 transition-colors">
                                        <div className="flex-1 mr-3 overflow-hidden">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-gray-200">{t.name}</span>
                                                {t.id.startsWith('def-') && (
                                                    <span className="text-[9px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Default</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 leading-tight line-clamp-2">{t.prompt}</div>
                                        </div>
                                        {!t.id.startsWith('def-') && (
                                            <button 
                                                onClick={() => handleDelete(t.id)}
                                                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded transition-colors"
                                                title="Delete from Airtable"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreativeDirectionManager;
