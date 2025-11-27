
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { PromptTemplate, TEMPLATE_CATEGORIES as DEFAULT_CATEGORIES } from '../data/templates';
import { AirtableConfig, fetchTemplates, createTemplate } from '../services/airtableService';
import Spinner from './Spinner';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: PromptTemplate) => void;
  config: AirtableConfig;
}

const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({ isOpen, onClose, onSelectTemplate, config }) => {
  const [activeCategory, setActiveCategory] = useState('illustration');
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
      if (isOpen) loadTemplates();
  }, [isOpen, config]);

  const loadTemplates = async () => {
      setIsLoading(true);
      try {
          const records = await fetchTemplates(config);
          const mapped: PromptTemplate[] = records.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
              prompt: r.prompt,
              category: r.category || 'Custom'
          }));
          setCustomTemplates(mapped);
      } catch (e) {
          console.error("Failed to load templates", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleAddTemplate = async () => {
      if (!newTitle || !newPrompt) return;
      setIsSaving(true);
      try {
          const newRec = await createTemplate(config, newTitle, newDesc, newPrompt, activeCategory);
          const newTmpl: PromptTemplate = {
              id: newRec.id,
              title: newRec.title,
              description: newRec.description,
              prompt: newRec.prompt,
              category: 'Custom' // Simplified for UI
          };
          setCustomTemplates(prev => [...prev, newTmpl]);
          setShowAddForm(false);
          setNewTitle(''); setNewDesc(''); setNewPrompt('');
      } catch (e) {
          alert("Failed to save template. Ensure 'Templates' table exists in Airtable.");
      } finally {
          setIsSaving(false);
      }
  };

  if (!isOpen) return null;

  // Merge Defaults with Customs
  // 1. Get Default Categories
  const categories = [...DEFAULT_CATEGORIES];
  // 2. Add 'Custom' if not present or just map customs into existing cats?
  // Let's simple filter customs by activeCategory, or default to 'Custom' tab if none match
  
  // Actually, let's keep the UI simple: Show Defaults + any Custom ones that map to these IDs.
  // And maybe an "All Custom" tab.
  
  const currentCategoryData = categories.find(c => c.id === activeCategory);
  
  // Filter customs that might match this category (if we stored category ID)
  // For simplicity, we just look for exact match on ID or Label.
  const relevantCustoms = customTemplates.filter(t => 
      // Very simple matching logic, or show all customs in a 'Custom' tab
      activeCategory === 'custom' ? true : false
  );
  
  // If user selects a default category, show defaults. If we add a 'Custom' category to sidebar:
  const displayTemplates = activeCategory === 'custom' 
      ? customTemplates 
      : (currentCategoryData?.templates || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        
        <div className="bg-gray-900/50 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="bulb" className="w-6 h-6 text-primary" />
              Active Prompt Structures
            </h3>
            <p className="text-sm text-gray-400 mt-1">Select or create a professional structure.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><Icon name="close" className="w-6 h-6" /></button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-900/30 border-r border-gray-700 overflow-y-auto p-4 space-y-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setShowAddForm(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat.id ? 'bg-primary/20 text-white border border-primary/50' : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
            <div className="border-t border-gray-700 my-2 pt-2"></div>
            <button
                onClick={() => { setActiveCategory('custom'); setShowAddForm(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === 'custom' ? 'bg-primary/20 text-white border border-primary/50' : 'text-gray-400 hover:bg-gray-800'
                }`}
            >
                My Custom Templates
            </button>
          </div>

          {/* Main */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-800 relative">
             <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
                <h4 className="text-lg font-bold text-white">
                    {activeCategory === 'custom' ? 'Custom Library' : currentCategoryData?.label}
                </h4>
                {activeCategory === 'custom' && (
                    <button 
                        onClick={() => setShowAddForm(true)}
                        className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded font-bold shadow"
                    >
                        + Create New
                    </button>
                )}
             </div>

             {/* Add Form */}
             {showAddForm && (
                 <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 mb-6 animate-fadeIn">
                     <div className="flex justify-between mb-2">
                         <h5 className="font-bold text-white text-sm">New Template</h5>
                         <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white"><Icon name="close" className="w-4 h-4"/></button>
                     </div>
                     <div className="space-y-3">
                         <input className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" 
                             placeholder="Title (e.g. My Quarterly Report)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                         <input className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" 
                             placeholder="Short Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                         <textarea className="w-full h-24 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none resize-none" 
                             placeholder="Prompt Structure. Use [content] and [topic] as placeholders." value={newPrompt} onChange={e => setNewPrompt(e.target.value)} />
                         <button onClick={handleAddTemplate} disabled={isSaving} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded text-sm font-bold">
                             {isSaving ? 'Saving...' : 'Save Template'}
                         </button>
                     </div>
                 </div>
             )}
             
             {isLoading ? <div className="p-10 text-center"><Spinner /></div> : (
                 <div className="grid grid-cols-1 gap-4">
                   {displayTemplates.length === 0 && (
                       <div className="text-gray-500 italic">No templates found in this category.</div>
                   )}
                   {displayTemplates.map((template) => (
                     <div 
                       key={template.id} 
                       className="group bg-gray-700/30 hover:bg-gray-700/60 border border-gray-600 hover:border-primary/50 rounded-xl p-5 transition-all duration-200"
                     >
                       <div className="flex justify-between items-start mb-2">
                         <h5 className="text-md font-bold text-gray-200 group-hover:text-primary-light transition-colors">
                           {template.title}
                         </h5>
                         <button
                           onClick={() => { onSelectTemplate(template); onClose(); }}
                           className="bg-gray-800 hover:bg-primary text-gray-300 hover:text-white text-xs px-3 py-1 rounded-full border border-gray-600 transition-colors"
                         >
                           Use Template
                         </button>
                       </div>
                       <p className="text-xs text-gray-400 mb-3 italic">{template.description}</p>
                       <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 font-mono text-xs text-gray-300 leading-relaxed line-clamp-3">
                         {template.prompt}
                       </div>
                     </div>
                   ))}
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibraryModal;
