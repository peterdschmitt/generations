
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { AirtableConfig, fetchControls, createControl, deleteControl, ControlRecord } from '../services/airtableService';
import Spinner from './Spinner';

interface ControlManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AirtableConfig;
  onUpdate: () => void; // Trigger refresh in parent
}

const CATEGORIES = ['Layout', 'Style', 'Lighting', 'Camera'];

const ControlManagerModal: React.FC<ControlManagerModalProps> = ({ isOpen, onClose, config, onUpdate }) => {
  const [controls, setControls] = useState<ControlRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Layout');
  
  // Form State
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) loadControls();
  }, [isOpen, config]);

  const loadControls = async () => {
    setIsLoading(true);
    try {
        const data = await fetchControls(config);
        setControls(data);
    } catch (e) {
        console.error("Failed to load controls", e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAdd = async () => {
      if (!newLabel || !newValue) return;
      setIsSaving(true);
      try {
          const newItem = await createControl(config, newLabel, newValue, activeTab);
          setControls(prev => [...prev, newItem]);
          setNewLabel('');
          setNewValue('');
          onUpdate(); // Refresh app options
      } catch (e) {
          alert("Failed to add control. Check Airtable 'Controls' table exists.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Delete this option?")) return;
      try {
          await deleteControl(config, id);
          setControls(prev => prev.filter(c => c.id !== id));
          onUpdate();
      } catch (e) {
          alert("Failed to delete.");
      }
  };

  if (!isOpen) return null;

  const filteredControls = controls.filter(c => c.category === activeTab);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl">
        <div className="bg-gray-900/50 p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="settings" className="w-5 h-5 text-primary" />
                Manage Studio Controls
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><Icon name="close" className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-gray-700 bg-gray-900/30">
            {CATEGORIES.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === cat ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-400 hover:text-white'}`}
                >
                    {cat}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
             {/* Add New */}
             <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                 <div className="sm:col-span-5">
                     <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Label (Dropdown Name)</label>
                     <input 
                        type="text" 
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        placeholder="e.g. Neon Noir"
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:border-primary outline-none"
                     />
                 </div>
                 <div className="sm:col-span-5">
                     <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Value (Prompt Injection)</label>
                     <input 
                        type="text" 
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        placeholder="e.g. High contrast neon lighting"
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:border-primary outline-none"
                     />
                 </div>
                 <div className="sm:col-span-2">
                     <button 
                        onClick={handleAdd}
                        disabled={isSaving || !newLabel}
                        className="w-full bg-primary hover:bg-primary-hover text-white py-1.5 rounded text-sm font-bold flex justify-center"
                     >
                         {isSaving ? <Spinner /> : 'Add'}
                     </button>
                 </div>
             </div>

             {/* List */}
             {isLoading ? (
                 <div className="text-center py-4"><Spinner /></div>
             ) : (
                 <div className="space-y-2">
                     {filteredControls.map(c => (
                         <div key={c.id} className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded hover:border-gray-500">
                             <div>
                                 <div className="font-bold text-sm text-gray-200">{c.label}</div>
                                 <div className="text-xs text-gray-500">{c.value}</div>
                             </div>
                             <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:bg-red-900/30 p-1.5 rounded transition-colors">
                                 <Icon name="close" className="w-4 h-4" />
                             </button>
                         </div>
                     ))}
                     {filteredControls.length === 0 && (
                         <div className="text-center text-gray-500 text-sm py-4 italic">
                             No custom controls found for {activeTab}.
                         </div>
                     )}
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default ControlManagerModal;
