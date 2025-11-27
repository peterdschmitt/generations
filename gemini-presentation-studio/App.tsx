
import React, { useState, ChangeEvent, useEffect, useCallback, useRef } from 'react';
import { editImageWithPrompt, generateImageFromPrompt, getSuggestionsForImage, generateVideoFromPrompt } from './services/geminiService';
import { saveRecordToAirtable, fetchGenerationHistory, AirtableConfig, fetchControls, ControlRecord } from './services/airtableService';
import { saveLocalImage, getLocalImage } from './services/dbService';
import Spinner from './components/Spinner';
import Icon from './components/Icon';
import VideoPlayer from './components/VideoPlayer';
import ImageDropzone from './components/ImageDropzone';
import ControlSelect from './components/ControlSelect';
import SettingsModal from './components/SettingsModal';
import TemplateLibraryModal from './components/TemplateLibraryModal';
import ControlManagerModal from './components/ControlManagerModal';
import Suggestions from './components/Suggestions';
import HistoryFeed from './components/HistoryFeed';
import CreativeDirectionManager from './components/CreativeDirectionManager';
import { PromptTemplate, TEMPLATE_CATEGORIES } from './data/templates';

interface ImageState {
  file: File | null;
  dataUrl: string | null;
}

export type HistoryItem = {
  id: string;
  type: 'image' | 'video';
  topic: string;
  campaign: string;
  isFavorite: boolean;
  imageUrl: string | null; 
  videoUrl?: string | null;
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  isLocalOnly?: boolean; 
  metadata?: {
    style?: string;
    layout?: string;
    lighting?: string;
    camera?: string;
    rawInput?: string;
    creativeDirection?: string;
    templateId?: string;
  }
}

type View = 'image' | 'video';
type ImageMode = 'edit' | 'generate';

// Default Fallbacks
const DEFAULT_LAYOUTS = [
  { value: '', label: 'Freeform (Default)' },
  { value: 'Professional Infographic', label: 'Infographic' },
  { value: 'Data Visualization Diagram', label: 'Chart / Dashboard' },
  { value: 'Standard Slide Layout', label: 'Slide' },
];

const App: React.FC = () => {
  // Mode State
  const [view, setView] = useState<View>('image');
  const [imageMode, setImageMode] = useState<ImageMode>('generate');

  // Common state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  // Project Context State
  const [topic, setTopic] = useState<string>('');
  const [campaign, setCampaign] = useState<string>('');
  
  // Aesthetics State
  const [visualStyle, setVisualStyle] = useState<string>('');
  const [lighting, setLighting] = useState<string>('');
  const [camera, setCamera] = useState<string>('');
  const [creativeDirectionPrompt, setCreativeDirectionPrompt] = useState<string>(''); 
  
  // Dynamic Controls State (From Airtable)
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [styles, setStyles] = useState([{ value: '', label: 'None' }]);
  const [lightingOpts, setLightingOpts] = useState([{ value: '', label: 'Default' }]);
  const [cameraOpts, setCameraOpts] = useState([{ value: '', label: 'Default' }]);

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState<number>(0);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');

  // Image Input State
  const [originalImage, setOriginalImage] = useState<ImageState>({ file: null, dataUrl: null });
  const [userInput, setUserInput] = useState<string>(''); 
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  
  // Image Aesthetic Controls
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '9:16' | '16:9'>('16:9');
  const [imageResolution, setImageResolution] = useState<'1K' | '2K' | '4K'>('2K');
  const [layoutStyle, setLayoutStyle] = useState<string>('');
  
  // Video Input State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [startImage, setStartImage] = useState<ImageState>({ file: null, dataUrl: null });
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');

  // Manual Override Mode
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Template State
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);

  // Airtable State
  const [isSavingToAirtable, setIsSavingToAirtable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [airtableConfig, setAirtableConfig] = useState<AirtableConfig>({
    apiKey: import.meta.env.VITE_AIRTABLE_API_KEY || '',
    baseId: import.meta.env.VITE_AIRTABLE_BASE_ID || '',
    tableName: import.meta.env.VITE_AIRTABLE_TABLE_NAME || 'Generations',
    imgbbApiKey: import.meta.env.VITE_IMGBB_API_KEY || ''
  });

  // Modal States
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showControlManager, setShowControlManager] = useState(false);

  // --- Synthesizer Logic ---
  const getConstructedPrompt = useCallback(() => {
    if (view === 'video') return videoPrompt; 
    
    if (isManualMode || imageMode === 'edit') return userInput;

    let basePrompt = '';

    if (selectedTemplate) {
        basePrompt = selectedTemplate.prompt;
        const topicText = topic.trim() || 'the subject';
        const contentText = userInput.trim() || 'placeholder content';

        basePrompt = basePrompt.replace(/\[topic\]/gi, topicText);
        basePrompt = basePrompt.replace(/\[subject\]/gi, contentText);
        basePrompt = basePrompt.replace(/\[content\]/gi, contentText);
        
    } else {
        const safeTopic = topic.trim() ? `about ${topic.trim()}` : '';
        const safeLayout = layoutStyle ? `[Layout: ${layoutStyle}]` : '';
        basePrompt = `${safeLayout} ${safeTopic}: ${userInput.trim()}`.trim();
    }

    if (creativeDirectionPrompt) {
        if (!basePrompt.endsWith('.')) basePrompt += '.';
        basePrompt += ` ${creativeDirectionPrompt}`;
    }

    const aesthetics: string[] = [];
    if (visualStyle) aesthetics.push(`Style: ${visualStyle}`);
    if (lighting) aesthetics.push(`Lighting: ${lighting}`);
    if (camera) aesthetics.push(`Camera: ${camera}`);

    if (aesthetics.length > 0) {
        if (!basePrompt.endsWith('.')) basePrompt += '.';
        basePrompt += ` ${aesthetics.join('. ')}.`;
    }

    return basePrompt;
  }, [view, isManualMode, imageMode, userInput, layoutStyle, topic, visualStyle, lighting, camera, videoPrompt, selectedTemplate, creativeDirectionPrompt]);

  const finalPrompt = getConstructedPrompt();

  useEffect(() => {
    const savedConfig = localStorage.getItem('airtableConfig');
    if (savedConfig) {
      setAirtableConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleSaveSettings = (newConfig: AirtableConfig) => {
    setAirtableConfig(newConfig);
    localStorage.setItem('airtableConfig', JSON.stringify(newConfig));
    loadHistory(newConfig);
    loadDynamicControls(newConfig);
  };

  useEffect(() => {
    checkApiKey();
    loadHistory(airtableConfig);
    loadDynamicControls(airtableConfig);
  }, []);

  const loadDynamicControls = async (config: AirtableConfig) => {
      try {
          const controls = await fetchControls(config);

          if (controls.length > 0) {
              const mapOptions = (cat: string, def: any[]) => {
                  const items = controls.filter(c => c.category === cat).map(c => ({ value: c.value, label: c.label, description: c.description }));
                  return items.length > 0 ? [{value:'', label:'Default'}, ...items] : def;
              };

              setLayouts(mapOptions('Layout', DEFAULT_LAYOUTS));
              setStyles(mapOptions('Style', [{value:'', label:'None'}]));
              setLightingOpts(mapOptions('Lighting', [{value:'', label:'Default'}]));
              setCameraOpts(mapOptions('Camera', [{value:'', label:'Default'}]));
          }
      } catch (e) {
          console.warn("Failed to load controls from Airtable, using defaults.");
      }
  };
  
  const loadHistory = async (config: AirtableConfig) => {
      setIsHistoryLoading(true);
      try {
          const remoteHistory = await fetchGenerationHistory(config);
          const mergedHistory = await Promise.all(remoteHistory.map(async (item: HistoryItem) => {
              if (!item.imageUrl && !item.videoUrl) {
                  const localImage = await getLocalImage(item.id);
                  if (localImage) {
                      return { 
                          ...item, 
                          imageUrl: item.type === 'image' ? localImage : null,
                          videoUrl: item.type === 'video' ? localImage : null,
                          isLocalOnly: true 
                      };
                  }
              }
              return item;
          }));
          setHistory(mergedHistory);
          if (mergedHistory.length > 0) setCarouselIndex(0);
      } catch (e) {
          console.error("Failed to load history", e);
      } finally {
          setIsHistoryLoading(false);
      }
  };
  
  const currentHistory = history.filter(item => item.type === view);
  
  // --- Filtering Logic ---
  const uniqueTopics = Array.from(new Set(currentHistory.map(item => item.topic).filter(Boolean)));
  const uniqueCampaigns = Array.from(new Set(currentHistory.map(item => item.campaign).filter(Boolean)));

  const filteredHistory = currentHistory.filter(item => {
      const searchMatch = !searchTerm || item.prompt.toLowerCase().includes(searchTerm.toLowerCase());
      const topicMatch = !filterTopic || item.topic === filterTopic;
      const campaignMatch = !filterCampaign || item.campaign === filterCampaign;
      return searchMatch && topicMatch && campaignMatch;
  });

  useEffect(() => {
    setCarouselIndex(0);
    setError(null);
    setSuccessMsg(null);
    setSearchTerm('');
    setFilterTopic('');
    setFilterCampaign('');
  }, [view]);

  const processAndSetImage = useCallback((file: File, setter: React.Dispatch<React.SetStateAction<ImageState>>, isForImageStudio: boolean) => {
    if (!file.type.startsWith('image/')) {
        setError('Pasted content is not a valid image file.');
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result) {
            const dataUrl = reader.result as string;
            setter({ file: file, dataUrl: dataUrl });
            setError(null);
            if (isForImageStudio) {
                setImageMode('edit');
                setSuggestions([]);
            }
        } else {
             setError('Failed to read image data from pasted file.');
        }
    };
    reader.onerror = () => {
      setError('Failed to read the pasted image.');
    }
    reader.readAsDataURL(file);
  }, [setError, setSuggestions, setImageMode]);

  const pasteHandlerRef = useRef<(event: ClipboardEvent) => void>();

  useEffect(() => {
    pasteHandlerRef.current = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          event.preventDefault();
          if (view === 'image') {
            processAndSetImage(file, setOriginalImage, true);
          } else if (view === 'video') {
            processAndSetImage(file, setStartImage, false);
          }
        }
      }
    };
  });

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (pasteHandlerRef.current) {
        pasteHandlerRef.current(event);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const checkApiKey = async () => {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    setIsApiKeySelected(hasKey);
  };

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    setIsApiKeySelected(true);
    setError(null);
  };

  const resetImageState = () => {
    setOriginalImage({ file: null, dataUrl: null });
    setUserInput('');
    setSuggestions([]);
    setSelectedTemplate(null);
  };

  const handleImageModeChange = (newMode: ImageMode) => {
    setImageMode(newMode);
    if (newMode === 'edit') setIsManualMode(true);
    resetImageState();
    setError(null);
    setSuccessMsg(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleApiError = (e: any) => {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
        setError("Permission Denied: These models require a paid API key.");
        setIsApiKeySelected(false);
    } else {
        setError(`Generation failed: ${errorMessage}`);
    }
  };

  const autoSaveToAirtable = async (item: HistoryItem): Promise<string | null> => {
    if (airtableConfig.apiKey && airtableConfig.baseId) {
        setIsSavingToAirtable(true);
        if (airtableConfig.imgbbApiKey) {
            setSuccessMsg("Bridging image to cloud... (Check ad-blockers if this fails)");
        } else {
            setSuccessMsg("Saving metadata...");
        }

        try {
            const newRecordId = await saveRecordToAirtable(airtableConfig, {
                prompt: item.prompt,
                type: item.type,
                topic: item.topic,
                campaign: item.campaign,
                style: item.metadata?.style,
                layout: item.metadata?.layout,
                aspectRatio: item.aspectRatio,
                resolution: item.resolution,
                isFavorite: item.isFavorite,
                imageData: item.imageUrl, 
                lighting: item.metadata?.lighting,
                camera: item.metadata?.camera,
                rawInput: item.metadata?.rawInput,
                creativeDirection: item.metadata?.creativeDirection,
                templateId: item.metadata?.templateId
            });
            setSuccessMsg(airtableConfig.imgbbApiKey ? "Success! Image bridged to Airtable." : "Metadata saved. Image stored locally.");
            return newRecordId;
        } catch (e: any) {
            console.error("Auto-save failed", e);
            // Show specific upload error in red to alert user
            setError(`Airtable Sync Issues: ${e.message}`);
        } finally {
            setIsSavingToAirtable(false);
        }
    }
    return null;
  };

  const handleGenerateImage = async () => {
    const promptToUse = finalPrompt;

    if (imageMode === 'edit' && (!originalImage.file || !promptToUse.trim())) {
      setError("Please upload an image and provide an editing prompt.");
      return;
    }
    if (imageMode === 'generate' && !promptToUse.trim()) {
      setError("Please provide a prompt to generate an image.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setSuggestions([]);

    try {
      let resultImageUrl: string;
      if (imageMode === 'edit' && originalImage.file) {
        const base64String = await fileToBase64(originalImage.file);
        resultImageUrl = await editImageWithPrompt(
          base64String,
          originalImage.file.type,
          promptToUse, 
          imageAspectRatio,
          imageResolution
        );
      } else {
        resultImageUrl = await generateImageFromPrompt(
            promptToUse,
            imageAspectRatio,
            imageResolution
        );
      }
      
      const tempId = `temp-${Date.now()}`;
      const newHistoryItem: HistoryItem = {
        id: tempId,
        type: 'image',
        topic: topic.trim() || 'General',
        campaign: campaign.trim() || 'Uncategorized',
        isFavorite: false,
        imageUrl: resultImageUrl,
        prompt: promptToUse, 
        aspectRatio: imageAspectRatio,
        resolution: imageResolution,
        isLocalOnly: true,
        metadata: {
            style: isManualMode ? 'Manual' : visualStyle,
            layout: layoutStyle,
            lighting: lighting,
            camera: camera,
            rawInput: userInput,
            creativeDirection: creativeDirectionPrompt,
            templateId: selectedTemplate?.id
        }
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);
      setCarouselIndex(0); 
      
      const realRecordId = await autoSaveToAirtable(newHistoryItem);
      const finalId = realRecordId || tempId;
      await saveLocalImage(finalId, resultImageUrl);

      if (realRecordId) {
          setHistory(prev => prev.map(item => 
              item.id === tempId ? { ...item, id: realRecordId } : item
          ));
      }

    } catch (e) {
      handleApiError(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
      let promptToUse = videoPrompt;
      if (!promptToUse.trim()) { setError("Video prompt required."); return; }
      setIsLoading(true); setError(null); setLoadingMessage("Initializing...");
      try {
        let startImagePayload = null;
        if (startImage.file) {
          startImagePayload = {
            mimeType: startImage.file.type,
            data: await fileToBase64(startImage.file)
          }
        }
        const videoUrl = await generateVideoFromPrompt(promptToUse, setLoadingMessage, startImagePayload, videoAspectRatio, videoResolution);
        
        const tempId = `temp-${Date.now()}`;
        const newHistoryItem: HistoryItem = {
          id: tempId,
          type: 'video',
          topic: topic.trim() || 'General',
          campaign: campaign.trim() || 'Uncategorized',
          isFavorite: false,
          imageUrl: startImage.dataUrl || null,
          videoUrl: videoUrl,
          prompt: promptToUse,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
          isLocalOnly: true,
          metadata: { style: isManualMode ? 'Manual' : 'Video' }
        };
        
        setHistory(prev => [newHistoryItem, ...prev]);
        setCarouselIndex(0);
        const realRecordId = await autoSaveToAirtable(newHistoryItem);
        const finalId = realRecordId || tempId;
        
        if (realRecordId) {
             setHistory(prev => prev.map(item => item.id === tempId ? { ...item, id: realRecordId } : item));
        }

      } catch(e) { handleApiError(e); } finally { setIsLoading(false); setLoadingMessage(''); }
  };

  const toggleFavorite = (itemId: string) => {
      setHistory(prev => prev.map(item => item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item));
  };

  const downloadFavorites = async () => {
    const faves = history.filter(h => h.isFavorite && (h.imageUrl || h.videoUrl));
    if (faves.length === 0) {
      setError("No favorites found to download.");
      return;
    }
    setSuccessMsg(`Downloading ${faves.length} favorites... check your downloads folder.`);
    
    // Process sequentially to avoid browser blocking multiple downloads
    for (let i = 0; i < faves.length; i++) {
        const item = faves[i];
        const link = document.createElement('a');
        const url = item.type === 'image' ? item.imageUrl! : item.videoUrl!;
        const ext = item.type === 'image' ? 'png' : 'mp4';
        const filename = `fav_${item.topic.replace(/\s+/g,'_')}_${item.id}.${ext}`;
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Short delay to be gentle on the browser
        await new Promise(r => setTimeout(r, 800));
    }
  };
  
  const handleRemix = async (item: HistoryItem) => {
      setSuccessMsg(null);
      if (item.type === 'image') {
          if (item.topic) setTopic(item.topic);
          if (item.campaign) setCampaign(item.campaign);
          if (item.aspectRatio) setImageAspectRatio(item.aspectRatio as any);
          if (item.resolution) setImageResolution(item.resolution as any);
          const meta = item.metadata || {};
          if (meta.rawInput) {
              setUserInput(meta.rawInput);
              setIsManualMode(false);
              setVisualStyle(meta.style || '');
              setLayoutStyle(meta.layout || '');
              setLighting(meta.lighting || '');
              setCamera(meta.camera || '');
              setCreativeDirectionPrompt(meta.creativeDirection || '');
              setSelectedTemplate(null); 
          } else {
              setUserInput(item.prompt); 
              setIsManualMode(true);
          }
          setSuggestions([]); setImageMode('generate'); setView('image');
      }
      const inputElement = document.getElementById('input-panel');
      inputElement?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleTemplateSelect = (template: PromptTemplate) => {
      setSelectedTemplate(template);
      setIsManualMode(false); 
  };
  
  const handleCopyToManual = () => {
    setUserInput(finalPrompt);
    setIsManualMode(true);
    setSelectedTemplate(null); 
    setCreativeDirectionPrompt(''); 
  };

  const nextItem = () => { if (carouselIndex < currentHistory.length - 1) setCarouselIndex(prev => prev + 1); };
  const prevItem = () => { if (carouselIndex > 0) setCarouselIndex(prev => prev - 1); };

  const isImageButtonDisabled = isLoading || !finalPrompt.trim() || (imageMode === 'edit' && !originalImage.file) || !isApiKeySelected;
  const isVideoButtonDisabled = isLoading || !finalPrompt.trim() || !isApiKeySelected;

  const ApiKeyOverlay = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-900/50 rounded-lg border border-gray-700">
      <h3 className='text-xl font-semibold text-white'>API Key Required</h3>
      <button onClick={handleSelectKey} className="mt-4 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-lg shadow-lg">Select API Key</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 relative">
      <SettingsModal 
         isOpen={showSettings} 
         onClose={() => setShowSettings(false)}
         config={airtableConfig}
         onSave={handleSaveSettings}
         history={history}
      />
      
      <TemplateLibraryModal
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleTemplateSelect}
        config={airtableConfig}
      />

      <ControlManagerModal
        isOpen={showControlManager}
        onClose={() => setShowControlManager(false)}
        config={airtableConfig}
        onUpdate={() => loadDynamicControls(airtableConfig)}
      />

      <button onClick={() => setShowSettings(true)} className="fixed top-4 right-4 z-50 text-gray-300 hover:text-white p-2 bg-gray-800/80 rounded-full shadow-lg border border-gray-600/50">
          <Icon name="settings" className="w-6 h-6" />
      </button>

      <header className="w-full max-w-6xl flex justify-center items-center mb-8">
        <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary">
            Gemini Presentation Studio
            </h1>
            <p className="mt-2 text-lg text-gray-400">Professional asset generator.</p>
        </div>
      </header>
      
      <div className="w-full max-w-xs mb-8 flex justify-center">
        <div className="bg-gray-800 p-1 rounded-lg inline-flex items-center space-x-1 border border-gray-700">
          <button onClick={() => setView('image')} className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${view === 'image' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Image Studio</button>
          <button onClick={() => setView('video')} className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${view === 'video' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Video Studio</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-6xl">
        <div className="lg:col-span-4 space-y-6" id="input-panel">
          
          <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 backdrop-blur-sm space-y-4">
             <div className="flex items-center justify-between mb-2">
                 <h2 className="text-sm font-bold text-white uppercase tracking-wider">Project Context</h2>
             </div>
             <div className="grid grid-cols-2 gap-3">
                 <div><input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. Q3 Financials)" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none" /></div>
                 <div><input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Campaign (e.g. Social)" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none" /></div>
             </div>
          </div>

          {view === 'image' && (
            <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 backdrop-blur-sm space-y-5">
              <div className="flex border-b border-gray-700 pb-1">
                <button onClick={() => handleImageModeChange('generate')} className={`flex-1 pb-3 text-sm font-medium transition-colors ${imageMode === 'generate' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>Generate</button>
                <button onClick={() => handleImageModeChange('edit')} className={`flex-1 pb-3 text-sm font-medium transition-colors ${imageMode === 'edit' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>Edit / Remix</button>
              </div>
              
              {imageMode === 'generate' && !isManualMode && (
                  <>
                     <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/50 space-y-3 relative group">
                         <div className="flex justify-between items-center">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Studio Controls</h3>
                             <button onClick={() => setShowControlManager(true)} className="text-[10px] text-primary hover:text-white underline">Manage Options</button>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                             <ControlSelect label="Layout Type" value={layoutStyle} onChange={setLayoutStyle} options={layouts} />
                             <ControlSelect label="Visual Style" value={visualStyle} onChange={setVisualStyle} options={styles} />
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                             <ControlSelect label="Lighting" value={lighting} onChange={setLighting} options={lightingOpts} />
                             <ControlSelect label="Camera/Lens" value={camera} onChange={setCamera} options={cameraOpts} />
                         </div>
                     </div>

                     <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg flex items-center justify-between">
                         <div className="overflow-hidden mr-2">
                             <span className="block text-[10px] text-primary-light font-bold uppercase tracking-wider">Active Prompt Structure</span>
                             <span className="block text-sm text-white truncate font-medium">
                                {selectedTemplate ? selectedTemplate.title : "Freeform (No Template)"}
                             </span>
                         </div>
                         <button onClick={() => setShowTemplateLibrary(true)} className="text-xs bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-md font-bold whitespace-nowrap transition-colors">
                            Change
                         </button>
                     </div>
                  </>
              )}

              {imageMode === 'edit' && (
                <div className="h-40">
                  <ImageDropzone
                    imageState={originalImage}
                    onFileSelect={(file) => processAndSetImage(file, setOriginalImage, true)}
                    onRemove={() => setOriginalImage({ file: null, dataUrl: null })}
                    placeholderLabel="Upload to Edit"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                     {imageMode === 'generate' && !isManualMode ? 'Content Description' : 'Full Manual Prompt'}
                   </label>
                   {isManualMode && <button onClick={() => setIsManualMode(false)} className="text-[10px] text-primary hover:text-white underline">Reset to Auto</button>}
                </div>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={imageMode === 'generate' && !isManualMode ? "e.g. Sales growth of 20% in Q3..." : "Describe exactly what you want..."}
                  className="w-full h-24 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              {imageMode === 'generate' && !isManualMode && (
                <CreativeDirectionManager config={airtableConfig} selectedThemePrompt={creativeDirectionPrompt} onSelect={setCreativeDirectionPrompt} />
              )}
              
              {imageMode === 'generate' && !isManualMode && (
                  <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1"><Icon name="sparkles" className="w-3 h-3" /> Synthesized Prompt</span>
                          <button onClick={handleCopyToManual} className="text-[10px] text-primary hover:text-white underline">Edit Manually</button>
                      </div>
                      <p className="text-xs text-gray-300 italic leading-relaxed opacity-90 border-l-2 border-primary pl-2">"{finalPrompt}"</p>
                  </div>
              )}
              
              <div className="flex gap-2 flex-wrap bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 justify-between">
                   <ControlSelect label="Aspect Ratio" value={imageAspectRatio} onChange={(v) => setImageAspectRatio(v as any)} options={[{value:'1:1',label:'1:1'},{value:'16:9',label:'16:9'},{value:'9:16',label:'9:16'},{value:'4:3',label:'4:3'}]} />
                   <ControlSelect label="Resolution" value={imageResolution} onChange={(v) => setImageResolution(v as any)} options={[{value:'1K',label:'1K'},{value:'2K',label:'2K'},{value:'4K',label:'4K'}]} />
              </div>

              {!isApiKeySelected ? <ApiKeyOverlay /> : (
                <button
                  onClick={handleGenerateImage}
                  disabled={isImageButtonDisabled}
                  className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${isImageButtonDisabled ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500'}`}
                >
                  {isLoading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                  {isLoading ? 'Processing...' : imageMode === 'generate' ? 'Generate Asset' : 'Edit Image'}
                </button>
              )}
            </div>
          )}

          {view === 'video' && (
             <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 backdrop-blur-sm space-y-6">
               <textarea value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} placeholder="Describe video..." className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none resize-none" />
               {!isApiKeySelected ? <ApiKeyOverlay /> : (
                <button onClick={handleGenerateVideo} disabled={isVideoButtonDisabled} className="w-full py-3 rounded-lg font-bold text-white bg-blue-600">Generate Video</button>
               )}
             </div>
          )}

        </div>

        {/* --- RIGHT PANEL --- */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
           <div className="flex-grow bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden min-h-[500px] flex flex-col relative">
              {(error || successMsg) && <div className={`w-full p-3 text-sm text-center ${error ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>{error || successMsg}</div>}
              <div className="flex-1 flex items-center justify-center p-8 bg-gray-900/50 relative">
                 {isLoading ? (
                    <div className="text-center"><Spinner /><p className="text-gray-400 animate-pulse mt-4">Creating...</p></div>
                 ) : currentHistory.length > 0 ? (
                    <div className="w-full h-full flex flex-col items-center">
                       <div className="relative w-full flex-1 flex items-center justify-center">
                          {currentHistory[carouselIndex].type === 'image' && currentHistory[carouselIndex].imageUrl ? (
                            <img src={currentHistory[carouselIndex].imageUrl!} className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl" />
                          ) : (
                             <div className="flex flex-col items-center text-center p-10 bg-gray-800/50 border-2 border-dashed border-gray-600 max-w-lg">
                                <Icon name="image" className="w-16 h-16 text-gray-600 mb-4" />
                                <h3 className="text-xl font-bold text-gray-300 mb-2">Image Not Loaded</h3>
                                <p className="text-gray-400 mb-6">Upload to 'Attachments' in Airtable.</p>
                             </div>
                          )}
                       </div>
                    </div>
                 ) : (
                    <div className="text-center text-gray-500"><p>No content found.</p></div>
                 )}
              </div>
              {currentHistory.length > 0 && !isLoading && (
                 <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                    <div className="flex gap-2">
                        <button onClick={() => toggleFavorite(currentHistory[carouselIndex].id)} className={`p-2 rounded-lg transition-colors ${currentHistory[carouselIndex].isFavorite ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => handleRemix(currentHistory[carouselIndex])} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">Remix / Edit</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={downloadFavorites} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/></svg>
                            Download Favorites
                        </button>
                        {(currentHistory[carouselIndex].imageUrl || currentHistory[carouselIndex].videoUrl) && (
                            <a href={currentHistory[carouselIndex].type === 'image' ? currentHistory[carouselIndex].imageUrl! : currentHistory[carouselIndex].videoUrl!} download className="px-4 py-2 bg-primary text-white rounded-lg font-bold">Download</a>
                        )}
                    </div>
                 </div>
              )}
           </div>
           
           <div className="flex flex-col gap-4">
               <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">History & Filters</h3>
                    <button onClick={() => loadHistory(airtableConfig)} className="text-xs text-primary hover:text-white flex items-center gap-1"><Icon name="sparkles" className="w-3 h-3"/> Refresh</button>
               </div>
               
               <div className="flex flex-wrap gap-2 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                    <div className="flex-1 min-w-[200px]">
                        <input 
                            type="text" 
                            placeholder="Search prompt content..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                    </div>
                    <div className="w-40">
                         <select 
                            value={filterTopic} 
                            onChange={(e) => setFilterTopic(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300 focus:border-primary outline-none"
                        >
                            <option value="">All Topics</option>
                            {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="w-40">
                         <select 
                            value={filterCampaign} 
                            onChange={(e) => setFilterCampaign(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300 focus:border-primary outline-none"
                        >
                            <option value="">All Campaigns</option>
                            {uniqueCampaigns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {(searchTerm || filterTopic || filterCampaign) && (
                        <button 
                            onClick={() => { setSearchTerm(''); setFilterTopic(''); setFilterCampaign(''); }}
                            className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-sm"
                        >
                            Reset
                        </button>
                    )}
               </div>

               {filteredHistory.length > 0 ? (
                   <HistoryFeed 
                        history={filteredHistory} 
                        onSelect={(item) => { 
                            const index = currentHistory.findIndex(i => i.id === item.id); 
                            if(index !== -1) setCarouselIndex(index); 
                        }} 
                    />
               ) : (
                   <div className="p-8 border border-dashed border-gray-700 rounded-2xl text-center text-gray-500">
                       {currentHistory.length > 0 ? "No matches found." : "History is empty"}
                   </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
