
import React, { useState, ChangeEvent, useEffect, useCallback, useRef } from 'react';
import { editImageWithPrompt, generateImageFromPrompt, getSuggestionsForImage, generateVideoFromPrompt, generateWithMultipleImages } from './services/geminiService';
import { saveRecordToAirtable, fetchGenerationHistory, AirtableConfig, fetchControls, ControlRecord } from './services/airtableService';
import { saveLocalImage, getLocalImage } from './services/dbService';
import { fetchSourcePhotos, uploadSourcePhoto, deleteSourcePhoto, SourcePhoto } from './services/sourcePhotoService';
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
import SourceLibraryTab from './components/SourceLibraryTab';
import NanoBananaTab from './components/NanoBananaTab';
import ContentFlowResearchTab from './components/ContentFlowResearchTab';
import ContentFlowCurateTab from './components/ContentFlowCurateTab';
import ContentFlowDraftTab from './components/ContentFlowDraftTab';
import ContentFlowExportTab from './components/ContentFlowExportTab';
import { CFProject } from './types/contentFlow';
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
  // Sequence fields
  sequenceId?: string;
  sequenceIndex?: number;
  sequenceTotal?: number;
  sourcePhotoUrls?: string[];
  keySubjects?: string;
  angleDescription?: string;
  metadata?: {
    style?: string;
    layout?: string;
    lighting?: string;
    camera?: string;
    rawInput?: string;
    templateId?: string;
  }
}

// Shot configuration for batch/carousel mode
interface ShotConfig {
  id: number;
  cameraAngle: string;
  lens: string;
  background: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  resultUrl?: string;
}

// Camera angle presets
const CAMERA_ANGLES = [
  { value: '', label: 'Default' },
  { value: 'eye level', label: 'Eye Level' },
  { value: 'low angle', label: 'Low Angle' },
  { value: 'high angle', label: 'High Angle' },
  { value: 'birds eye view', label: 'Birds Eye View' },
  { value: 'worms eye view', label: 'Worms Eye View' },
  { value: 'dutch angle', label: 'Dutch Angle' },
  { value: 'over the shoulder', label: 'Over the Shoulder' },
  { value: 'close up', label: 'Close Up' },
  { value: 'extreme close up', label: 'Extreme Close Up' },
  { value: 'wide shot', label: 'Wide Shot' },
  { value: 'medium shot', label: 'Medium Shot' },
];

// Lens presets
const LENS_PRESETS = [
  { value: '', label: 'Default' },
  { value: '24mm wide angle', label: '24mm Wide Angle' },
  { value: '35mm standard', label: '35mm Standard' },
  { value: '50mm portrait', label: '50mm Portrait' },
  { value: '85mm portrait', label: '85mm Portrait' },
  { value: '100mm macro', label: '100mm Macro' },
  { value: '200mm telephoto', label: '200mm Telephoto' },
  { value: 'fisheye', label: 'Fisheye' },
  { value: 'tilt shift', label: 'Tilt Shift' },
  { value: 'anamorphic', label: 'Anamorphic' },
];

// Video camera movement presets
const VIDEO_CAMERA_MOVEMENTS = [
  { value: '', label: 'Default (Auto)' },
  { value: 'static shot', label: 'Static Shot' },
  { value: 'slow pan left', label: 'Slow Pan Left' },
  { value: 'slow pan right', label: 'Slow Pan Right' },
  { value: 'slow zoom in', label: 'Slow Zoom In' },
  { value: 'slow zoom out', label: 'Slow Zoom Out' },
  { value: 'dolly forward', label: 'Dolly Forward' },
  { value: 'dolly backward', label: 'Dolly Backward' },
  { value: 'crane up', label: 'Crane Up' },
  { value: 'crane down', label: 'Crane Down' },
  { value: 'tracking shot', label: 'Tracking Shot' },
  { value: 'orbit around subject', label: 'Orbit Around' },
  { value: 'handheld movement', label: 'Handheld' },
];

// Video pacing presets
const VIDEO_PACING = [
  { value: '', label: 'Default' },
  { value: 'slow and dramatic', label: 'Slow & Dramatic' },
  { value: 'gentle and smooth', label: 'Gentle & Smooth' },
  { value: 'moderate pace', label: 'Moderate' },
  { value: 'energetic and dynamic', label: 'Energetic' },
  { value: 'fast paced action', label: 'Fast Action' },
];

// Video style presets
const VIDEO_STYLES = [
  { value: '', label: 'Default' },
  { value: 'cinematic film look', label: 'Cinematic' },
  { value: 'documentary style', label: 'Documentary' },
  { value: 'commercial advertisement', label: 'Commercial' },
  { value: 'music video aesthetic', label: 'Music Video' },
  { value: 'corporate presentation', label: 'Corporate' },
  { value: 'social media content', label: 'Social Media' },
  { value: 'artistic experimental', label: 'Experimental' },
];

type View = 'source' | 'image' | 'video' | 'prompts' | 'cf-research' | 'cf-curate' | 'cf-draft' | 'cf-export';

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

  // Collapsible Controls State
  const [showStyleControls, setShowStyleControls] = useState(true);

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
  const [editImages, setEditImages] = useState<ImageState[]>([]);
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

  // Video Production Direction State
  const [videoCameraMovement, setVideoCameraMovement] = useState('');
  const [videoPacing, setVideoPacing] = useState('');
  const [videoStyle, setVideoStyle] = useState('');

  // Video Title/Text Overlay State
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSubtitle, setVideoSubtitle] = useState('');

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

  // Batch/Carousel Mode State
  const [shotCount, setShotCount] = useState<number>(1);
  const [shotConfigs, setShotConfigs] = useState<ShotConfig[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Initialize shot configs when shot count changes
  useEffect(() => {
    const newConfigs: ShotConfig[] = [];
    for (let i = 0; i < shotCount; i++) {
      newConfigs.push({
        id: i,
        cameraAngle: '',
        lens: '',
        background: '',
        status: 'pending'
      });
    }
    setShotConfigs(newConfigs);
  }, [shotCount]);

  const updateShotConfig = (shotId: number, field: keyof ShotConfig, value: string) => {
    setShotConfigs(prev => prev.map(shot =>
      shot.id === shotId ? { ...shot, [field]: value } : shot
    ));
  };

  // Source Photo Library State
  const [sourcePhotos, setSourcePhotos] = useState<SourcePhoto[]>([]);
  const [isSourcePhotosLoading, setIsSourcePhotosLoading] = useState(false);
  const [sourcePhotoError, setSourcePhotoError] = useState<string | null>(null);

  // ContentFlow State
  const [cfProject, setCfProject] = useState<CFProject | null>(null);

  // --- Synthesizer Logic ---
  const getConstructedPrompt = useCallback(() => {
    if (view === 'video') return videoPrompt; 
    
    if (isManualMode) return userInput;

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

    const aesthetics: string[] = [];
    if (visualStyle) aesthetics.push(`Style: ${visualStyle}`);
    if (lighting) aesthetics.push(`Lighting: ${lighting}`);
    if (camera) aesthetics.push(`Camera: ${camera}`);

    if (aesthetics.length > 0) {
        if (!basePrompt.endsWith('.')) basePrompt += '.';
        basePrompt += ` ${aesthetics.join('. ')}.`;
    }

    return basePrompt;
  }, [view, isManualMode, userInput, layoutStyle, topic, visualStyle, lighting, camera, videoPrompt, selectedTemplate]);

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
    loadSourcePhotos(newConfig);
  };

  const loadSourcePhotos = async (config: AirtableConfig) => {
    setIsSourcePhotosLoading(true);
    setSourcePhotoError(null);
    try {
      const photos = await fetchSourcePhotos(config);
      setSourcePhotos(photos);
    } catch (e: any) {
      console.error("Failed to load source photos:", e);
      setSourcePhotoError(e.message || "Failed to load source photos");
    } finally {
      setIsSourcePhotosLoading(false);
    }
  };

  const handleUploadSourcePhoto = async (name: string, base64Image: string) => {
    setSourcePhotoError(null);
    try {
      const newPhoto = await uploadSourcePhoto(airtableConfig, name, base64Image);
      setSourcePhotos(prev => [newPhoto, ...prev]);
    } catch (e: any) {
      setSourcePhotoError(e.message || "Failed to upload photo");
      throw e;
    }
  };

  const handleDeleteSourcePhoto = async (id: string) => {
    try {
      await deleteSourcePhoto(airtableConfig, id);
      setSourcePhotos(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      setSourcePhotoError(e.message || "Failed to delete photo");
    }
  };

  useEffect(() => {
    checkApiKey();
    loadHistory(airtableConfig);
    loadDynamicControls(airtableConfig);
    loadSourcePhotos(airtableConfig);
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
  
  const currentHistory = history.filter(item => {
    if (view === 'source' || view === 'prompts') return false; // Source Library and Prompts have no history
    return item.type === (view === 'image' ? 'image' : 'video');
  });
  
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
  }, [setError, setSuggestions]);

  const pasteHandlerRef = useRef<((event: ClipboardEvent) => void) | null>(null);

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
    try {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        // Fallback: assume API key is available if aistudio API isn't present
        setIsApiKeySelected(true);
      }
    } catch (e) {
      console.error("Error checking API key:", e);
      // Fallback to true to show the button
      setIsApiKeySelected(true);
    }
  };

  const handleSelectKey = async () => {
    try {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
      setIsApiKeySelected(true);
      setError(null);
    } catch (e) {
      console.error("Error selecting API key:", e);
      setIsApiKeySelected(true);
    }
  };

  const resetImageState = () => {
    setOriginalImage({ file: null, dataUrl: null });
    setUserInput('');
    setSuggestions([]);
    setSelectedTemplate(null);
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
        if (item.type === 'video') {
            setSuccessMsg("Uploading video to cloud storage...");
        } else if (airtableConfig.imgbbApiKey) {
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
                imageData: item.type === 'image' ? item.imageUrl : null,
                videoData: item.type === 'video' ? item.videoUrl : null,
                lighting: item.metadata?.lighting,
                camera: item.metadata?.camera,
                rawInput: item.metadata?.rawInput,
                templateId: item.metadata?.templateId
            });
            if (item.type === 'video') {
                setSuccessMsg("Success! Video uploaded to Airtable.");
            } else {
                setSuccessMsg(airtableConfig.imgbbApiKey ? "Success! Image bridged to Airtable." : "Metadata saved. Image stored locally.");
            }
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

  // Unified smart handler that adapts based on images present
  const handleCreateImage = async () => {
    const promptToUse = editImages.length > 0 ? userInput.trim() : finalPrompt;

    if (!promptToUse.trim()) {
      setError("Please provide a prompt to create an image.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setSuggestions([]);

    try {
      let resultImageUrl: string;
      let actionType: string;

      if (editImages.length === 0) {
        // No images = Generate from scratch
        resultImageUrl = await generateImageFromPrompt(
          promptToUse,
          imageAspectRatio,
          imageResolution
        );
        actionType = 'Generate';
      } else if (editImages.length === 1) {
        // Single image = Transform/Edit
        const base64Data = editImages[0].dataUrl!.split(',')[1];
        const mimeType = editImages[0].file?.type || 'image/png';
        resultImageUrl = await editImageWithPrompt(
          base64Data,
          mimeType,
          promptToUse,
          imageAspectRatio,
          imageResolution
        );
        actionType = 'Transform';
      } else {
        // Multiple images = Combine/Transform
        const sourceImagesBase64 = editImages.map(img => ({
          base64Data: img.dataUrl!.split(',')[1],
          mimeType: img.file?.type || 'image/png'
        }));
        resultImageUrl = await generateWithMultipleImages(
          sourceImagesBase64,
          promptToUse,
          imageAspectRatio,
          imageResolution
        );
        actionType = 'Combine';
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
            style: editImages.length > 0 ? actionType : (isManualMode ? 'Manual' : visualStyle),
            layout: layoutStyle,
            lighting: lighting,
            camera: camera,
            rawInput: userInput,
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

      setSuccessMsg(editImages.length > 0
        ? `Image ${actionType.toLowerCase()}ed successfully!`
        : "Image generated successfully!");

      // Reset to single shot mode after successful generation
      setShotCount(1);

    } catch (e) {
      handleApiError(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Batch generation handler - generates multiple shots progressively
  const handleBatchGenerate = async () => {
    const basePrompt = editImages.length > 0 ? userInput.trim() : finalPrompt;

    if (!basePrompt.trim()) {
      setError("Please provide a base prompt for the batch.");
      return;
    }

    setIsBatchGenerating(true);
    setError(null);
    setSuccessMsg(null);

    const sequenceId = `batch-${Date.now()}`;

    // Process each shot sequentially to show progress
    for (let i = 0; i < shotConfigs.length; i++) {
      const shot = shotConfigs[i];

      // Update status to generating
      setShotConfigs(prev => prev.map(s =>
        s.id === shot.id ? { ...s, status: 'generating' } : s
      ));

      // Build shot-specific prompt
      let shotPrompt = basePrompt;
      const shotModifiers: string[] = [];
      if (shot.cameraAngle) shotModifiers.push(`Camera angle: ${shot.cameraAngle}`);
      if (shot.lens) shotModifiers.push(`Lens: ${shot.lens}`);
      if (shot.background) shotModifiers.push(`Background: ${shot.background}`);

      if (shotModifiers.length > 0) {
        shotPrompt += `. ${shotModifiers.join('. ')}.`;
      }

      try {
        let resultImageUrl: string;

        if (editImages.length === 0) {
          // Generate from scratch
          resultImageUrl = await generateImageFromPrompt(
            shotPrompt,
            imageAspectRatio,
            imageResolution
          );
        } else if (editImages.length === 1) {
          // Transform single image
          const base64Data = editImages[0].dataUrl!.split(',')[1];
          const mimeType = editImages[0].file?.type || 'image/png';
          resultImageUrl = await editImageWithPrompt(
            base64Data,
            mimeType,
            shotPrompt,
            imageAspectRatio,
            imageResolution
          );
        } else {
          // Multiple images
          const sourceImagesBase64 = editImages.map(img => ({
            base64Data: img.dataUrl!.split(',')[1],
            mimeType: img.file?.type || 'image/png'
          }));
          resultImageUrl = await generateWithMultipleImages(
            sourceImagesBase64,
            shotPrompt,
            imageAspectRatio,
            imageResolution
          );
        }

        // Update shot config with result
        setShotConfigs(prev => prev.map(s =>
          s.id === shot.id ? { ...s, status: 'completed', resultUrl: resultImageUrl } : s
        ));

        // Add to history
        const tempId = `temp-${Date.now()}-${i}`;
        const newHistoryItem: HistoryItem = {
          id: tempId,
          type: 'image',
          topic: topic.trim() || 'General',
          campaign: campaign.trim() || 'Uncategorized',
          isFavorite: false,
          imageUrl: resultImageUrl,
          prompt: shotPrompt,
          aspectRatio: imageAspectRatio,
          resolution: imageResolution,
          isLocalOnly: true,
          sequenceId: sequenceId,
          sequenceIndex: i + 1,
          sequenceTotal: shotConfigs.length,
          metadata: {
            style: editImages.length > 0 ? 'Batch Transform' : visualStyle,
            layout: layoutStyle,
            lighting: lighting,
            camera: shot.cameraAngle || camera,
            rawInput: userInput,
          }
        };

        setHistory(prev => [newHistoryItem, ...prev]);
        if (i === 0) setCarouselIndex(0);

        // Save to Airtable
        const realRecordId = await autoSaveToAirtable(newHistoryItem);
        const finalId = realRecordId || tempId;
        await saveLocalImage(finalId, resultImageUrl);

        if (realRecordId) {
          setHistory(prev => prev.map(item =>
            item.id === tempId ? { ...item, id: realRecordId } : item
          ));
        }

      } catch (e) {
        console.error(`Failed to generate shot ${i + 1}:`, e);
        setShotConfigs(prev => prev.map(s =>
          s.id === shot.id ? { ...s, status: 'error' } : s
        ));
      }
    }

    setIsBatchGenerating(false);
    const completedCount = shotConfigs.filter(s => s.status === 'completed').length;
    setSuccessMsg(`Batch complete! ${completedCount}/${shotConfigs.length} shots generated.`);

    // Reset to single shot mode after batch completes
    setShotCount(1);
  };

  // Create video from first completed batch shot
  const handleCreateVideoFromBatch = async () => {
    const firstCompletedShot = shotConfigs.find(s => s.status === 'completed' && s.resultUrl);
    if (!firstCompletedShot?.resultUrl) {
      setError("No completed shots available to create video from.");
      return;
    }

    // Extract base64 from data URL
    const imageDataUrl = firstCompletedShot.resultUrl;
    if (!imageDataUrl.startsWith('data:')) {
      setError("Shot image format not supported for video creation.");
      return;
    }

    const base64Data = imageDataUrl.split(',')[1];
    const mimeMatch = imageDataUrl.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    // Use the original prompt as video description
    const videoDescription = finalPrompt || userInput || "Animate this image with subtle motion";

    setIsLoading(true);
    setError(null);
    setLoadingMessage("Creating video from batch shot...");

    try {
      const startImagePayload = {
        mimeType: mimeType,
        data: base64Data
      };

      const videoUrl = await generateVideoFromPrompt(
        videoDescription,
        setLoadingMessage,
        startImagePayload,
        videoAspectRatio,
        videoResolution
      );

      const tempId = `temp-${Date.now()}`;
      const newHistoryItem: HistoryItem = {
        id: tempId,
        type: 'video',
        topic: topic.trim() || 'General',
        campaign: campaign.trim() || 'Uncategorized',
        isFavorite: false,
        imageUrl: firstCompletedShot.resultUrl,
        videoUrl: videoUrl,
        prompt: videoDescription,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        isLocalOnly: true,
        metadata: { style: 'Batch to Video' }
      };

      setHistory(prev => [newHistoryItem, ...prev]);
      setCarouselIndex(0);
      setView('video'); // Switch to video view to see result

      const realRecordId = await autoSaveToAirtable(newHistoryItem);
      if (realRecordId) {
        setHistory(prev => prev.map(item =>
          item.id === tempId ? { ...item, id: realRecordId } : item
        ));
      }

      setSuccessMsg("Video created from batch shot!");
    } catch (e) {
      handleApiError(e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Build enhanced video prompt with production direction
  const buildVideoPrompt = () => {
    let prompt = videoPrompt.trim();
    const directives: string[] = [];

    // Add title/subtitle directives
    if (videoTitle.trim()) {
      directives.push(`Display title text: "${videoTitle.trim()}"`);
    }
    if (videoSubtitle.trim()) {
      directives.push(`Display subtitle text: "${videoSubtitle.trim()}"`);
    }

    // Add production direction
    if (videoCameraMovement) {
      directives.push(`Camera movement: ${videoCameraMovement}`);
    }
    if (videoPacing) {
      directives.push(`Pacing: ${videoPacing}`);
    }
    if (videoStyle) {
      directives.push(`Visual style: ${videoStyle}`);
    }

    // Append directives to base prompt
    if (directives.length > 0) {
      prompt += `. ${directives.join('. ')}.`;
    }

    return prompt;
  };

  const handleGenerateVideo = async () => {
      const basePrompt = videoPrompt.trim();
      if (!basePrompt) { setError("Video prompt required."); return; }

      const enhancedPrompt = buildVideoPrompt();
      setIsLoading(true); setError(null); setLoadingMessage("Initializing...");

      try {
        let startImagePayload = null;

        // If we have title/subtitle but no start image, generate a title card first
        if ((videoTitle.trim() || videoSubtitle.trim()) && !startImage.file) {
          setLoadingMessage("Generating title card...");
          const titlePrompt = `Create a professional title card with${videoTitle.trim() ? ` the main title "${videoTitle.trim()}"` : ''}${videoSubtitle.trim() ? ` and subtitle "${videoSubtitle.trim()}"` : ''}. Clean, modern design with elegant typography on a subtle gradient background. ${videoStyle ? `Style: ${videoStyle}.` : ''}`;

          try {
            const titleCardUrl = await generateImageFromPrompt(titlePrompt, videoAspectRatio, '2K');
            // Extract base64 from data URL
            if (titleCardUrl.startsWith('data:')) {
              const base64Data = titleCardUrl.split(',')[1];
              const mimeMatch = titleCardUrl.match(/data:([^;]+);/);
              startImagePayload = {
                mimeType: mimeMatch ? mimeMatch[1] : 'image/png',
                data: base64Data
              };
            }
          } catch (titleErr) {
            console.warn("Could not generate title card, proceeding without:", titleErr);
          }
        } else if (startImage.file) {
          startImagePayload = {
            mimeType: startImage.file.type,
            data: await fileToBase64(startImage.file)
          };
        }

        setLoadingMessage("Generating video...");
        const videoUrl = await generateVideoFromPrompt(enhancedPrompt, setLoadingMessage, startImagePayload, videoAspectRatio, videoResolution);

        // Auto-download video to local drive
        setLoadingMessage("Saving video to Downloads...");
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const sanitizedTopic = (topic.trim() || 'video').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
        const filename = `${sanitizedTopic}_${timestamp}.mp4`;

        const downloadLink = document.createElement('a');
        downloadLink.href = videoUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        console.log(`Video auto-saved as: ${filename}`);

        const tempId = `temp-${Date.now()}`;
        const newHistoryItem: HistoryItem = {
          id: tempId,
          type: 'video',
          topic: topic.trim() || 'General',
          campaign: campaign.trim() || 'Uncategorized',
          isFavorite: false,
          imageUrl: startImage.dataUrl || null,
          videoUrl: videoUrl,
          prompt: enhancedPrompt,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
          isLocalOnly: true,
          metadata: {
            style: videoStyle || 'Video',
            rawInput: basePrompt
          }
        };

        setHistory(prev => [newHistoryItem, ...prev]);
        setCarouselIndex(0);
        const realRecordId = await autoSaveToAirtable(newHistoryItem);

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
              setSelectedTemplate(null);
          } else {
              setUserInput(item.prompt);
              setIsManualMode(true);
          }
          setSuggestions([]); setEditImages([]); setView('image');
      }
      const inputElement = document.getElementById('input-panel');
      inputElement?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load image from history into Edit mode
  const handleEditFromHistory = async (item: HistoryItem) => {
      setSuccessMsg(null);
      setError(null);
      if (item.type === 'image' && item.imageUrl) {
          // Set context
          if (item.topic) setTopic(item.topic);
          if (item.campaign) setCampaign(item.campaign);
          if (item.aspectRatio) setImageAspectRatio(item.aspectRatio as any);
          if (item.resolution) setImageResolution(item.resolution as any);

          // Load the image into the Edit mode
          const imageUrl = item.imageUrl;

          // Check if it's already a data URL (base64)
          if (imageUrl.startsWith('data:')) {
              // Extract mime type from data URL
              const mimeMatch = imageUrl.match(/data:([^;]+);/);
              const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
              // Create a blob from base64
              const base64Data = imageUrl.split(',')[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: mimeType });
              const file = new File([blob], 'image.png', { type: mimeType });
              setEditImages([{ file, dataUrl: imageUrl }]);
          } else {
              // It's a URL, fetch and convert
              try {
                  const response = await fetch(imageUrl);
                  const blob = await response.blob();
                  const file = new File([blob], 'image.png', { type: blob.type || 'image/png' });
                  // Convert to data URL for display
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      setEditImages([{ file, dataUrl: reader.result as string }]);
                  };
                  reader.readAsDataURL(blob);
              } catch (e) {
                  console.error('Failed to load image:', e);
                  setError('Failed to load image for editing');
                  return;
              }
          }

          // Pre-fill with the original prompt as a starting point
          setUserInput(item.metadata?.rawInput || item.prompt || '');

          // Switch to Image view (unified - images loaded = transform mode)
          setView('image');
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
  };

  const nextItem = () => { if (carouselIndex < currentHistory.length - 1) setCarouselIndex(prev => prev + 1); };
  const prevItem = () => { if (carouselIndex > 0) setCarouselIndex(prev => prev - 1); };

  const isVideoButtonDisabled = isLoading || !videoPrompt.trim() || !isApiKeySelected;

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
      
      <div className="w-full max-w-4xl mb-8 flex flex-col items-center gap-2">
        {/* Main Studio Tabs */}
        <div className="bg-gray-800 p-1 rounded-lg inline-flex items-center space-x-1 border border-gray-700">
          <button onClick={() => setView('source')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'source' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Source Library</button>
          <button onClick={() => setView('image')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'image' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Image Studio</button>
          <button onClick={() => setView('video')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'video' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Video Studio</button>
          <button onClick={() => setView('prompts')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'prompts' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Prompts</button>
        </div>

        {/* ContentFlow Tabs */}
        <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 p-1 rounded-lg inline-flex items-center space-x-1 border border-purple-600/30">
          <span className="px-2 text-xs text-purple-400 font-semibold">ContentFlow:</span>
          <button onClick={() => setView('cf-research')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'cf-research' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:text-white'}`}>Research</button>
          <button onClick={() => setView('cf-curate')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'cf-curate' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:text-white'}`}>Curate</button>
          <button onClick={() => setView('cf-draft')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'cf-draft' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:text-white'}`}>Draft</button>
          <button onClick={() => setView('cf-export')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'cf-export' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:text-white'}`}>Export</button>
        </div>
      </div>

      {/* Source Library Tab - Full Width */}
      {view === 'source' && (
        <div className="w-full max-w-6xl">
          <SourceLibraryTab
            sourcePhotos={sourcePhotos}
            isLoading={isSourcePhotosLoading}
            onUpload={handleUploadSourcePhoto}
            onDelete={handleDeleteSourcePhoto}
            onRefresh={() => loadSourcePhotos(airtableConfig)}
            error={sourcePhotoError}
          />
        </div>
      )}

      {/* Prompts Library Tab - Full Width */}
      {view === 'prompts' && (
        <div className="w-full max-w-6xl">
          <NanoBananaTab
            airtableApiKey={airtableConfig.apiKey}
            airtableBaseId={airtableConfig.baseId}
            githubToken={import.meta.env.VITE_GITHUB_TOKEN}
          />
        </div>
      )}

      {/* ContentFlow Research Tab */}
      {view === 'cf-research' && (
        <div className="w-full max-w-6xl">
          <ContentFlowResearchTab
            config={airtableConfig}
            onSelectProject={(project) => setCfProject(project)}
            onNavigateToCurate={() => setView('cf-curate')}
          />
        </div>
      )}

      {/* ContentFlow Curate Tab */}
      {view === 'cf-curate' && (
        <div className="w-full max-w-6xl">
          <ContentFlowCurateTab
            config={airtableConfig}
            project={cfProject}
            onNavigateToDraft={() => setView('cf-draft')}
            onBack={() => setView('cf-research')}
          />
        </div>
      )}

      {/* ContentFlow Draft Tab */}
      {view === 'cf-draft' && (
        <div className="w-full max-w-6xl">
          <ContentFlowDraftTab
            config={airtableConfig}
            project={cfProject}
            onBack={() => setView('cf-curate')}
            onNavigateToExport={() => setView('cf-export')}
          />
        </div>
      )}

      {/* ContentFlow Export Tab */}
      {view === 'cf-export' && (
        <div className="w-full max-w-6xl">
          <ContentFlowExportTab
            config={airtableConfig}
            project={cfProject}
            onBack={() => setView('cf-draft')}
          />
        </div>
      )}

      {/* Image & Video Studio Layout */}
      {(view === 'image' || view === 'video') && (
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

              {/* Shot Count Selector - At Top */}
              <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Number of Shots</label>
                <select
                  value={shotCount}
                  onChange={(e) => setShotCount(parseInt(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                >
                  <option value={1}>1 Shot</option>
                  <option value={3}>3 Shots</option>
                  <option value={5}>5 Shots</option>
                  <option value={10}>10 Shots</option>
                </select>
              </div>

              {/* Source Images Section - Always Visible */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Source Images ({editImages.length}/5) - optional, for editing/combining
                </label>

                {/* Display uploaded images */}
                {editImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img.dataUrl!}
                          alt={`Image ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                        />
                        <button
                          onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dropzone for adding images */}
                {editImages.length < 5 && (
                  <div
                    className="border-2 border-dashed border-gray-600 rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.multiple = true;
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) {
                          Array.from(files).slice(0, 5 - editImages.length).forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditImages(prev => [...prev, { file, dataUrl: reader.result as string }]);
                            };
                            reader.readAsDataURL(file);
                          });
                        }
                      };
                      input.click();
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer.files;
                      if (files) {
                        Array.from(files).slice(0, 5 - editImages.length).forEach(file => {
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditImages(prev => [...prev, { file, dataUrl: reader.result as string }]);
                            };
                            reader.readAsDataURL(file);
                          }
                        });
                      }
                    }}
                  >
                    <Icon name="image" className="w-6 h-6 mx-auto text-gray-500 mb-1" />
                    <p className="text-xs text-gray-400">
                      {editImages.length === 0 ? 'Drop images here or click to upload' : 'Add more images'}
                    </p>
                  </div>
                )}

                {editImages.length === 0 && (
                  <p className="text-[10px] text-gray-500 mt-1 text-center">
                    Leave empty to generate from scratch, or add images to edit/combine them
                  </p>
                )}
              </div>

              {/* Prompt Section - Always Visible */}
              <div>
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                     {editImages.length > 0
                       ? (editImages.length > 1 ? 'Describe how to combine/transform' : 'Describe changes to make')
                       : (!isManualMode ? 'Content Description' : 'Full Manual Prompt')}
                   </label>
                   {editImages.length === 0 && isManualMode && (
                     <button onClick={() => setIsManualMode(false)} className="text-[10px] text-primary hover:text-white underline">Reset to Auto</button>
                   )}
                </div>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={editImages.length > 0
                    ? (editImages.length > 1
                        ? "e.g., Combine these images into one scene..."
                        : "e.g., Add a red hat, change background to beach sunset...")
                    : (!isManualMode ? "e.g. Sales growth of 20% in Q3..." : "Describe exactly what you want...")}
                  className="w-full h-24 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              {/* Style Controls - Always visible when no source images */}
              {editImages.length === 0 && (
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Style Controls</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <ControlSelect label="Layout Type" value={layoutStyle} onChange={setLayoutStyle} options={layouts} />
                    <ControlSelect label="Visual Style" value={visualStyle} onChange={setVisualStyle} options={styles} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ControlSelect label="Lighting" value={lighting} onChange={setLighting} options={lightingOpts} />
                    <ControlSelect label="Camera/Lens" value={camera} onChange={setCamera} options={cameraOpts} />
                  </div>
                </div>
              )}

              {/* Synthesized Prompt Preview (only for generation mode with auto controls) */}
              {editImages.length === 0 && !isManualMode && finalPrompt.trim() && (
                <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1">
                      <Icon name="sparkles" className="w-3 h-3" /> Synthesized Prompt
                    </span>
                    <button onClick={handleCopyToManual} className="text-[10px] text-primary hover:text-white underline">Edit Manually</button>
                  </div>
                  <p className="text-xs text-gray-300 italic leading-relaxed opacity-90 border-l-2 border-primary pl-2">"{finalPrompt}"</p>
                </div>
              )}

              {/* Output Settings - Always Visible */}
              <div className="flex gap-2 flex-wrap bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 justify-between">
                <ControlSelect label="Aspect Ratio" value={imageAspectRatio} onChange={(v) => setImageAspectRatio(v as any)} options={[{value:'1:1',label:'1:1'},{value:'16:9',label:'16:9'},{value:'9:16',label:'9:16'},{value:'4:3',label:'4:3'}]} />
                <ControlSelect label="Resolution" value={imageResolution} onChange={(v) => setImageResolution(v as any)} options={[{value:'1K',label:'1K'},{value:'2K',label:'2K'},{value:'4K',label:'4K'}]} />
              </div>

              {/* Shot Configuration Grid - Shows when more than 1 shot selected */}
              {shotCount > 1 && (
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                    Per-Shot Settings (Camera, Lens, Background)
                  </label>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {shotConfigs.map((shot, idx) => (
                      <div
                        key={shot.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          shot.status === 'generating' ? 'bg-blue-900/30 border-blue-500 animate-pulse' :
                          shot.status === 'completed' ? 'bg-green-900/20 border-green-600' :
                          shot.status === 'error' ? 'bg-red-900/20 border-red-600' :
                          'bg-gray-800/50 border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-gray-300">Shot {idx + 1}</span>
                          {shot.status === 'generating' && <Spinner />}
                          {shot.status === 'completed' && shot.resultUrl && (
                            <img src={shot.resultUrl} alt={`Shot ${idx + 1}`} className="w-10 h-10 object-cover rounded" />
                          )}
                          {shot.status === 'error' && <span className="text-xs text-red-400">Failed</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={shot.cameraAngle}
                            onChange={(e) => updateShotConfig(shot.id, 'cameraAngle', e.target.value)}
                            disabled={isBatchGenerating}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                          >
                            {CAMERA_ANGLES.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <select
                            value={shot.lens}
                            onChange={(e) => updateShotConfig(shot.id, 'lens', e.target.value)}
                            disabled={isBatchGenerating}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                          >
                            {LENS_PRESETS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={shot.background}
                            onChange={(e) => updateShotConfig(shot.id, 'background', e.target.value)}
                            disabled={isBatchGenerating}
                            placeholder="Background..."
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Smart Create Button */}
              {!isApiKeySelected ? <ApiKeyOverlay /> : shotCount > 1 ? (
                <div className="space-y-2">
                  <button
                    onClick={handleBatchGenerate}
                    disabled={isBatchGenerating || isLoading || (editImages.length === 0 ? !finalPrompt.trim() : !userInput.trim())}
                    className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${
                      isBatchGenerating || isLoading || (editImages.length === 0 ? !finalPrompt.trim() : !userInput.trim())
                        ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                        : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500'
                    }`}
                  >
                    {isBatchGenerating ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                    {isBatchGenerating
                      ? `Generating ${shotConfigs.filter(s => s.status === 'completed').length + 1}/${shotCount}...`
                      : `Generate ${shotCount} Shots`}
                  </button>

                  {/* Create Video from Batch Button - shows when there are completed shots */}
                  {shotConfigs.some(s => s.status === 'completed' && s.resultUrl) && (
                    <button
                      onClick={handleCreateVideoFromBatch}
                      disabled={isLoading || isBatchGenerating}
                      className={`w-full py-2 rounded-lg font-medium text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                        isLoading || isBatchGenerating
                          ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                      }`}
                    >
                      {isLoading ? <Spinner /> : <Icon name="sparkles" className="w-4 h-4" />}
                      {isLoading ? loadingMessage || 'Creating Video...' : 'Create Video from First Shot'}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleCreateImage}
                  disabled={isLoading || (editImages.length === 0 ? !finalPrompt.trim() : !userInput.trim())}
                  className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${
                    isLoading || (editImages.length === 0 ? !finalPrompt.trim() : !userInput.trim())
                      ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                      : editImages.length > 0
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
                        : 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500'
                  }`}
                >
                  {isLoading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                  {isLoading
                    ? 'Creating...'
                    : editImages.length === 0
                      ? 'Generate Image'
                      : editImages.length === 1
                        ? 'Transform Image'
                        : `Create from ${editImages.length} Images`}
                </button>
              )}
            </div>
          )}

          {view === 'video' && (
             <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 backdrop-blur-sm space-y-5">

               {/* Title & Subtitle Section */}
               <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 space-y-3">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Text Overlays (Optional)</label>
                 <input
                   type="text"
                   value={videoTitle}
                   onChange={(e) => setVideoTitle(e.target.value)}
                   placeholder="Title (e.g. Product Launch 2024)"
                   className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                 />
                 <input
                   type="text"
                   value={videoSubtitle}
                   onChange={(e) => setVideoSubtitle(e.target.value)}
                   placeholder="Subtitle (e.g. Innovation Redefined)"
                   className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                 />
               </div>

               {/* Video Description */}
               <div>
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Video Description</label>
                 <textarea
                   value={videoPrompt}
                   onChange={(e) => setVideoPrompt(e.target.value)}
                   placeholder="Describe the video content... (e.g. A sleek product rotating on a pedestal with dramatic lighting)"
                   className="w-full h-24 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none resize-none"
                 />
               </div>

               {/* Start Frame - Compact Preview (Selection happens in right panel) */}
               <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                 <div className="flex items-center justify-between mb-2">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Start Frame</label>
                   {startImage.dataUrl && (
                     <button
                       onClick={() => setStartImage({ file: null, dataUrl: null })}
                       className="text-[10px] text-red-400 hover:text-red-300"
                     >
                       Clear
                     </button>
                   )}
                 </div>
                 {startImage.dataUrl ? (
                   <div className="flex items-center gap-3 p-2 bg-blue-900/20 rounded-lg border border-blue-500/30">
                     <img src={startImage.dataUrl} alt="Start frame" className="w-16 h-16 object-cover rounded-lg border-2 border-blue-500" />
                     <div className="flex-1">
                       <p className="text-xs text-blue-300 font-medium">Frame Selected</p>
                       <p className="text-[10px] text-gray-500">Select from gallery on right →</p>
                     </div>
                   </div>
                 ) : (
                   <div className="flex items-center gap-3">
                     <button
                       onClick={() => document.getElementById('video-start-image-input')?.click()}
                       className="flex-1 border border-dashed border-gray-600 rounded-lg py-2 px-3 text-center hover:border-primary/50 transition-colors"
                     >
                       <span className="text-xs text-gray-400">Upload image</span>
                     </button>
                     <span className="text-[10px] text-gray-500">or select from gallery →</span>
                   </div>
                 )}
                 <input
                   id="video-start-image-input"
                   type="file"
                   accept="image/*"
                   className="hidden"
                   onChange={(e) => {
                     if (e.target.files?.[0]) {
                       processAndSetImage(e.target.files[0], setStartImage, false);
                     }
                   }}
                 />
               </div>

               {/* Production Direction Section */}
               <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 space-y-3">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Production Direction</label>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   <ControlSelect
                     label="Camera Movement"
                     value={videoCameraMovement}
                     onChange={setVideoCameraMovement}
                     options={VIDEO_CAMERA_MOVEMENTS}
                   />
                   <ControlSelect
                     label="Pacing"
                     value={videoPacing}
                     onChange={setVideoPacing}
                     options={VIDEO_PACING}
                   />
                   <ControlSelect
                     label="Style"
                     value={videoStyle}
                     onChange={setVideoStyle}
                     options={VIDEO_STYLES}
                   />
                 </div>
               </div>

               {/* Output Settings */}
               <div className="flex gap-2 flex-wrap bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 justify-between">
                 <ControlSelect
                   label="Aspect Ratio"
                   value={videoAspectRatio}
                   onChange={(v) => setVideoAspectRatio(v as '16:9' | '9:16')}
                   options={[{ value: '16:9', label: '16:9 (Landscape)' }, { value: '9:16', label: '9:16 (Portrait)' }]}
                 />
                 <ControlSelect
                   label="Resolution"
                   value={videoResolution}
                   onChange={(v) => setVideoResolution(v as '720p' | '1080p')}
                   options={[{ value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }]}
                 />
               </div>

               {/* Generate Button */}
               {!isApiKeySelected ? <ApiKeyOverlay /> : (
                 <button
                   onClick={handleGenerateVideo}
                   disabled={isVideoButtonDisabled}
                   className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${
                     isVideoButtonDisabled
                       ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                       : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                   }`}
                 >
                   {isLoading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                   {isLoading ? loadingMessage || 'Generating...' : 'Generate Video'}
                 </button>
               )}
             </div>
          )}

        </div>

        {/* --- RIGHT PANEL --- */}
        <div className="lg:col-span-8 flex flex-col space-y-6">

           {/* Image Selection Gallery - Only shown on Video tab */}
           {view === 'video' && history.filter(item => item.type === 'image' && item.imageUrl).length > 0 && (
             <div className="bg-gray-800 rounded-2xl border-2 border-blue-600/50 p-4">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                   <Icon name="image" className="w-4 h-4" />
                   Select Start Frame for Video
                 </h3>
                 <span className="text-xs text-gray-500">Click an image to use as first frame</span>
               </div>
               <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[200px] overflow-y-auto p-1">
                 {history
                   .filter(item => item.type === 'image' && item.imageUrl)
                   .slice(0, 24)
                   .map((item) => (
                     <button
                       key={item.id}
                       onClick={async () => {
                         const imageUrl = item.imageUrl!;
                         if (imageUrl.startsWith('data:')) {
                           const mimeMatch = imageUrl.match(/data:([^;]+);/);
                           const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                           const base64Data = imageUrl.split(',')[1];
                           const byteCharacters = atob(base64Data);
                           const byteNumbers = new Array(byteCharacters.length);
                           for (let i = 0; i < byteCharacters.length; i++) {
                             byteNumbers[i] = byteCharacters.charCodeAt(i);
                           }
                           const byteArray = new Uint8Array(byteNumbers);
                           const blob = new Blob([byteArray], { type: mimeType });
                           const file = new File([blob], 'start-frame.png', { type: mimeType });
                           setStartImage({ file, dataUrl: imageUrl });
                         } else {
                           try {
                             const response = await fetch(imageUrl);
                             const blob = await response.blob();
                             const file = new File([blob], 'start-frame.png', { type: blob.type || 'image/png' });
                             const reader = new FileReader();
                             reader.onloadend = () => {
                               setStartImage({ file, dataUrl: reader.result as string });
                             };
                             reader.readAsDataURL(blob);
                           } catch (e) {
                             console.error('Failed to load image:', e);
                             setError('Failed to load image');
                           }
                         }
                       }}
                       className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                         startImage.dataUrl === item.imageUrl
                           ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-gray-800 scale-105 z-10'
                           : 'hover:ring-2 hover:ring-primary/50 hover:scale-105'
                       }`}
                       title={item.prompt.slice(0, 50)}
                     >
                       <img
                         src={item.imageUrl!}
                         alt={item.prompt.slice(0, 30)}
                         className="w-full h-full object-cover"
                       />
                       {startImage.dataUrl === item.imageUrl && (
                         <div className="absolute inset-0 bg-blue-500/40 flex items-center justify-center">
                           <div className="bg-blue-500 rounded-full p-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                             </svg>
                           </div>
                         </div>
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-1">
                         <span className="text-[9px] text-white truncate">{item.prompt.slice(0, 20)}...</span>
                       </div>
                     </button>
                   ))}
               </div>
               {!startImage.dataUrl && (
                 <p className="text-center text-xs text-gray-500 mt-2">No image selected - video will generate from description only</p>
               )}
             </div>
           )}

           <div className="flex-grow bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden min-h-[500px] flex flex-col relative">
              {(error || successMsg) && <div className={`w-full p-3 text-sm text-center ${error ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>{error || successMsg}</div>}
              <div className="flex-1 flex items-center justify-center p-8 bg-gray-900/50 relative">
                 {isLoading ? (
                    <div className="text-center"><Spinner /><p className="text-gray-400 animate-pulse mt-4">Creating...</p></div>
                 ) : currentHistory.length > 0 ? (
                    <div className="w-full h-full flex flex-col items-center">
                       <div className="relative w-full flex-1 flex items-center justify-center">
                          {currentHistory[carouselIndex].type === 'video' && currentHistory[carouselIndex].videoUrl ? (
                            <VideoPlayer src={currentHistory[carouselIndex].videoUrl!} />
                          ) : currentHistory[carouselIndex].type === 'image' && currentHistory[carouselIndex].imageUrl ? (
                            <img src={currentHistory[carouselIndex].imageUrl!} className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl" />
                          ) : (
                             <div className="flex flex-col items-center text-center p-10 bg-gray-800/50 border-2 border-dashed border-gray-600 max-w-lg">
                                <Icon name="image" className="w-16 h-16 text-gray-600 mb-4" />
                                <h3 className="text-xl font-bold text-gray-300 mb-2">Media Not Loaded</h3>
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
                        <button onClick={() => handleRemix(currentHistory[carouselIndex])} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">Remix</button>
                        <button onClick={() => handleEditFromHistory(currentHistory[carouselIndex])} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">Edit Image</button>
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
      )}
    </div>
  );
};

export default App;
