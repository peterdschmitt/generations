// ContentFlow Research Tab
// Topic input, source discovery, project creation

import React, { useState, useEffect } from 'react';
import { AirtableConfig } from '../services/airtableService';
import {
  CFProject,
  CFSource,
  TargetChannel,
  SourceType,
  PLATFORM_CONFIGS
} from '../types/contentFlow';
import {
  fetchProjects,
  createProject,
  deleteProject,
  createSourcesBatch,
  fetchSourcesForProject,
  updateSource
} from '../services/contentFlowService';
import {
  discoverSources,
  scrapeWebPage,
  fetchRedditPost,
  DiscoveredSource
} from '../services/researchService';
import { summarizeSource } from '../services/contentProcessorService';
import Icon from './Icon';
import Spinner from './Spinner';

interface Props {
  config: AirtableConfig;
  onSelectProject: (project: CFProject) => void;
  onNavigateToCurate: () => void;
}

const CHANNEL_OPTIONS: { value: TargetChannel; label: string; icon: string }[] = [
  { value: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { value: 'blog', label: 'Blog', icon: 'file-text' },
  { value: 'twitter', label: 'Twitter/X', icon: 'twitter' },
  { value: 'newsletter', label: 'Newsletter', icon: 'mail' },
  { value: 'meta', label: 'Instagram', icon: 'instagram' }
];

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'article', label: 'Web Articles' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'youtube', label: 'YouTube' }
];

const ContentFlowResearchTab: React.FC<Props> = ({
  config,
  onSelectProject,
  onNavigateToCurate
}) => {
  // Project State
  const [projects, setProjects] = useState<CFProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<CFProject | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // New Project Form
  const [topic, setTopic] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Set<TargetChannel>>(new Set(['linkedin', 'blog']));
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Discovery State
  const [sources, setSources] = useState<CFSource[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState('');
  const [selectedSourceTypes, setSelectedSourceTypes] = useState<Set<SourceType>>(new Set(['article', 'reddit']));

  // Manual Add
  const [manualUrl, setManualUrl] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [config]);

  const loadProjects = async () => {
    if (!config.apiKey || !config.baseId) return;

    setIsLoadingProjects(true);
    try {
      const data = await fetchProjects(config);
      setProjects(data);
    } catch (e: any) {
      console.error('Failed to load projects:', e);
      setError(`Failed to load projects: ${e.message}`);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleCreateProject = async () => {
    if (!topic.trim()) {
      setError('Please enter a research topic');
      return;
    }
    if (selectedChannels.size === 0) {
      setError('Please select at least one target channel');
      return;
    }

    setIsCreatingProject(true);
    setError(null);

    try {
      const project = await createProject(config, topic.trim(), Array.from(selectedChannels));
      setProjects(prev => [project, ...prev]);
      setSelectedProject(project);
      onSelectProject(project);
      setTopic('');
      setSuccess(`Project "${project.name}" created! Starting discovery...`);

      // Auto-start discovery
      await handleDiscover(project);
    } catch (e: any) {
      setError(e.message || 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDiscover = async (project: CFProject) => {
    setIsDiscovering(true);
    setError(null);
    setDiscoveryProgress('Searching for sources...');

    try {
      // Discover sources
      const discovered = await discoverSources({
        query: project.topic,
        sourceTypes: Array.from(selectedSourceTypes),
        maxResults: 15
      });

      setDiscoveryProgress(`Found ${discovered.length} sources. Scraping content...`);

      // Scrape content for each source
      const sourcesWithContent: Array<{
        url: string;
        title: string;
        sourceType: SourceType;
        discoveryMethod: 'auto_discovery';
        scrapedContent?: string;
        summary?: string;
      }> = [];

      for (let i = 0; i < discovered.length; i++) {
        const source = discovered[i];
        setDiscoveryProgress(`Scraping ${i + 1}/${discovered.length}: ${source.title.substring(0, 30)}...`);

        let content = source.scrapedContent || '';

        // Scrape based on type
        if (!content && source.sourceType === 'reddit') {
          content = await fetchRedditPost(source.url);
        } else if (!content && source.sourceType === 'article') {
          content = await scrapeWebPage(source.url);
        }

        // Generate summary if we have content
        let summary = source.snippet || '';
        if (content && content.length > 200) {
          try {
            setDiscoveryProgress(`Summarizing ${i + 1}/${discovered.length}...`);
            summary = await summarizeSource(content, source.title);
          } catch (e) {
            console.warn('Summary generation failed:', e);
          }
        }

        sourcesWithContent.push({
          url: source.url,
          title: source.title,
          sourceType: source.sourceType,
          discoveryMethod: 'auto_discovery',
          scrapedContent: content,
          summary
        });

        // Rate limit
        await new Promise(r => setTimeout(r, 300));
      }

      setDiscoveryProgress('Saving to Airtable...');

      // Save to Airtable
      const savedSources = await createSourcesBatch(config, project.id, sourcesWithContent);
      setSources(savedSources);

      setSuccess(`Discovery complete! Found ${savedSources.length} sources.`);
    } catch (e: any) {
      setError(e.message || 'Discovery failed');
    } finally {
      setIsDiscovering(false);
      setDiscoveryProgress('');
    }
  };

  const handleSelectProject = async (project: CFProject) => {
    setSelectedProject(project);
    onSelectProject(project);

    // Load sources for project
    try {
      const projectSources = await fetchSourcesForProject(config, project.id);
      setSources(projectSources);
    } catch (e) {
      console.error('Failed to load sources:', e);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project and all its data?')) return;

    try {
      await deleteProject(config, projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setSources([]);
      }
      setSuccess('Project deleted');
    } catch (e: any) {
      setError(e.message || 'Failed to delete project');
    }
  };

  const handleAddManualSource = async () => {
    if (!selectedProject) return;
    if (!manualUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsAddingManual(true);
    setError(null);

    try {
      // Detect source type from URL
      let sourceType: SourceType = 'article';
      if (manualUrl.includes('reddit.com')) sourceType = 'reddit';
      else if (manualUrl.includes('youtube.com') || manualUrl.includes('youtu.be')) sourceType = 'youtube';

      // Scrape content
      let content = '';
      if (sourceType === 'reddit') {
        content = await fetchRedditPost(manualUrl);
      } else if (sourceType === 'article') {
        content = await scrapeWebPage(manualUrl);
      }

      // Generate summary
      let summary = '';
      if (content && content.length > 200) {
        summary = await summarizeSource(content, manualUrl);
      }

      // Save to Airtable
      const savedSources = await createSourcesBatch(config, selectedProject.id, [{
        url: manualUrl,
        title: new URL(manualUrl).hostname + ' - ' + manualUrl.substring(0, 50),
        sourceType,
        discoveryMethod: 'manual_add',
        scrapedContent: content,
        summary
      }]);

      setSources(prev => [...savedSources, ...prev]);
      setManualUrl('');
      setSuccess('Source added successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to add source');
    } finally {
      setIsAddingManual(false);
    }
  };

  const toggleChannel = (channel: TargetChannel) => {
    setSelectedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  };

  const toggleSourceType = (type: SourceType) => {
    setSelectedSourceTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-900/50 text-red-200 p-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-white">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 text-green-200 p-3 rounded-lg text-sm">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 text-green-400 hover:text-white">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Project List */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Projects</h3>

          {isLoadingProjects ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : projects.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No projects yet. Create one to start!</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedProject?.id === project.id
                      ? 'bg-primary/20 border border-primary'
                      : 'bg-gray-900/50 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{project.topic}</p>
                      <p className="text-xs text-gray-500 mt-1">{project.name}</p>
                      <div className="flex gap-1 mt-2">
                        {project.targetChannels.map(ch => (
                          <span key={ch} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                      className="text-gray-500 hover:text-red-400 p-1"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      project.status === 'discovery' ? 'bg-blue-900/50 text-blue-300' :
                      project.status === 'scoping' ? 'bg-amber-900/50 text-amber-300' :
                      project.status === 'drafting' ? 'bg-purple-900/50 text-purple-300' :
                      project.status === 'review' ? 'bg-green-900/50 text-green-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: New Project / Discovery */}
        <div className="lg:col-span-2 space-y-6">
          {/* New Project Form */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">New Content Project</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">Research Topic</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Best practices for remote team management in 2024"
                  className="w-full h-20 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">Target Channels</label>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleChannel(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        selectedChannels.has(opt.value)
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">Source Types to Search</label>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleSourceType(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedSourceTypes.has(opt.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateProject}
                disabled={isCreatingProject || !topic.trim() || selectedChannels.size === 0}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${
                  isCreatingProject || !topic.trim() || selectedChannels.size === 0
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500'
                }`}
              >
                {isCreatingProject ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                {isCreatingProject ? 'Creating...' : 'Create Project & Discover Sources'}
              </button>
            </div>
          </div>

          {/* Discovery Progress */}
          {isDiscovering && (
            <div className="bg-blue-900/30 border border-blue-600/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <Spinner />
                <div>
                  <p className="text-blue-200 font-medium">Discovering Sources...</p>
                  <p className="text-blue-400 text-sm">{discoveryProgress}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sources List */}
          {selectedProject && sources.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Discovered Sources ({sources.length})
                </h3>
                <button
                  onClick={() => handleDiscover(selectedProject)}
                  disabled={isDiscovering}
                  className="text-xs text-primary hover:text-white flex items-center gap-1"
                >
                  <Icon name="sparkles" className="w-3 h-3" /> Find More
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {sources.map(source => (
                  <div
                    key={source.id}
                    className={`p-3 rounded-lg border transition-all ${
                      source.selected
                        ? 'bg-gray-900/50 border-gray-600'
                        : 'bg-gray-900/30 border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={source.selected}
                        onChange={async (e) => {
                          e.stopPropagation();
                          const newSelected = !source.selected;
                          // Optimistically update UI
                          setSources(prev => prev.map(s => s.id === source.id ? { ...s, selected: newSelected } : s));
                          try {
                            await updateSource(config, source.id, { selected: newSelected });
                          } catch (err: any) {
                            // Revert on error
                            setSources(prev => prev.map(s => s.id === source.id ? { ...s, selected: !newSelected } : s));
                            setError(`Failed to update source: ${err.message}`);
                          }
                        }}
                        className="mt-1 h-4 w-4 rounded border-gray-500 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-white hover:text-primary truncate block"
                        >
                          {source.title}
                        </a>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{source.summary || source.url}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${
                            source.sourceType === 'reddit' ? 'bg-orange-900/50 text-orange-300' :
                            source.sourceType === 'youtube' ? 'bg-red-900/50 text-red-300' :
                            'bg-blue-900/50 text-blue-300'
                          }`}>
                            {source.sourceType}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {source.scrapedContent ? `${Math.round(source.scrapedContent.length / 1000)}k chars` : 'No content'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Manual Add */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <label className="text-xs font-semibold text-gray-400 block mb-2">Add Source Manually</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                  />
                  <button
                    onClick={handleAddManualSource}
                    disabled={isAddingManual || !manualUrl.trim()}
                    className={`px-4 py-2 rounded-lg font-medium text-white ${
                      isAddingManual || !manualUrl.trim()
                        ? 'bg-gray-700 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {isAddingManual ? <Spinner /> : 'Add'}
                  </button>
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={onNavigateToCurate}
                className="w-full mt-4 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 flex items-center justify-center gap-2"
              >
                Continue to Curation
                <Icon name="chevron-right" className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentFlowResearchTab;
