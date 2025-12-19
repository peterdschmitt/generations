import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NanoBananaCase, NanoBananaCategory, GitHubSource, DEFAULT_GITHUB_SOURCES } from '../types/nanobanana';
import {
  fetchNanoBananaCases,
  NanoBananaConfig,
  generateCaseId,
  detectCategory,
  extractTags,
  detectReferenceRequired,
  upsertNanoBananaCases,
  toggleFavorite
} from '../services/nanoBananaService';
import Icon from './Icon';
import Spinner from './Spinner';

interface NanoBananaTabProps {
  airtableApiKey: string;
  airtableBaseId: string;
  githubToken?: string;
}

const CATEGORIES: NanoBananaCategory[] = [
  'Photorealistic',
  'Infographic',
  'Portrait & Character',
  'Product & Mockup',
  'Style Transfer',
  'Scene & Environment',
  'Icon & Logo',
  'Creative Art',
  'Miniature & Toy',
  'Text & Typography',
  'Food & Object',
  'General'
];

const NanoBananaTab: React.FC<NanoBananaTabProps> = ({
  airtableApiKey,
  airtableBaseId,
  githubToken
}) => {
  // State
  const [cases, setCases] = useState<NanoBananaCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<NanoBananaCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRefOnly, setShowRefOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  // Source management
  const [showSourceManager, setShowSourceManager] = useState(false);
  const [sources, setSources] = useState<GitHubSource[]>(() =>
    DEFAULT_GITHUB_SOURCES.map((s, i) => ({
      ...s,
      id: `src-${i}`,
      promptCount: 0,
      enabled: true
    }))
  );
  const [newRepoInput, setNewRepoInput] = useState('');

  const config: NanoBananaConfig = {
    apiKey: airtableApiKey,
    baseId: airtableBaseId
  };

  // Load cases on mount
  useEffect(() => {
    loadCases();
  }, [airtableApiKey, airtableBaseId]);

  // Get unique source repos for the filter dropdown
  const sourceRepos = useMemo(() => {
    const repos = new Set(cases.map(c => c.sourceRepo));
    return Array.from(repos).sort();
  }, [cases]);

  // Apply filters when cases or filter criteria change
  useEffect(() => {
    let filtered = [...cases];

    // Favorites first - always sort favorites to top
    filtered.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return 0;
    });

    // Favorites only filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(c => c.favorite);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(c => c.sourceRepo === selectedSource);
    }

    // Reference required filter
    if (showRefOnly) {
      filtered = filtered.filter(c => c.referenceRequired);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.prompt.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query)) ||
        c.author.toLowerCase().includes(query)
      );
    }

    setFilteredCases(filtered);
  }, [cases, selectedCategory, selectedSource, searchQuery, showRefOnly, showFavoritesOnly]);

  const loadCases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNanoBananaCases(config);
      setCases(data);

      // Update source counts
      const countByRepo: Record<string, number> = {};
      data.forEach(c => {
        countByRepo[c.sourceRepo] = (countByRepo[c.sourceRepo] || 0) + 1;
      });
      setSources(prev => prev.map(s => ({
        ...s,
        promptCount: countByRepo[`${s.owner}/${s.repo}`] || 0
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPrompt = useCallback((caseItem: NanoBananaCase) => {
    navigator.clipboard.writeText(caseItem.prompt);
    setCopiedId(caseItem.id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const handleToggleFavorite = useCallback(async (caseItem: NanoBananaCase) => {
    setTogglingFavorite(caseItem.id);
    try {
      const newFavoriteStatus = !caseItem.favorite;
      await toggleFavorite(config, caseItem.id, newFavoriteStatus);
      // Update local state
      setCases(prev => prev.map(c =>
        c.id === caseItem.id ? { ...c, favorite: newFavoriteStatus } : c
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update favorite');
    } finally {
      setTogglingFavorite(null);
    }
  }, [config]);

  const findSimilar = useCallback((caseItem: NanoBananaCase) => {
    // Search by category and first tag
    const searchTerms: string[] = [caseItem.category];
    if (caseItem.tags.length > 0) {
      searchTerms.push(caseItem.tags[0]);
    }
    setSearchQuery(searchTerms.join(' '));
    setSelectedCategory('all'); // Reset category to show all matches
    setSelectedSource('all');
    setShowFavoritesOnly(false);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const enabledSources = sources.filter(s => s.enabled);

      for (const source of enabledSources) {
        try {
          const headers: Record<string, string> = {
            'User-Agent': 'NanoBanana-Scraper/1.0'
          };
          if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
          }

          let content = '';
          for (const branch of ['main', 'master']) {
            const url = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${branch}/README.md`;
            const response = await fetch(url, { headers });
            if (response.ok) {
              content = await response.text();
              break;
            }
          }

          if (!content) continue;

          const newCases = parseMarkdownSimple(content, source);

          if (newCases.length > 0) {
            await upsertNanoBananaCases(config, newCases);
          }
        } catch (e) {
          console.error(`Failed to sync ${source.owner}/${source.repo}:`, e);
        }
      }

      await loadCases();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const parseMarkdownSimple = (markdown: string, source: GitHubSource) => {
    const cases: any[] = [];
    const codeBlockPattern = /```(?:text|prompt|json)?\n([\s\S]*?)```/g;
    let match;
    let blockNum = 0;

    while ((match = codeBlockPattern.exec(markdown)) !== null) {
      let prompt = match[1].trim();
      blockNum++;

      if (prompt.includes('function ') ||
          prompt.includes('const ') ||
          prompt.includes('import ') ||
          prompt.includes('npm ') ||
          prompt.length < 50) {
        continue;
      }

      if (prompt.startsWith('{')) {
        try {
          const jsonPrompt = JSON.parse(prompt);
          prompt = jsonPrompt.description || JSON.stringify(jsonPrompt, null, 2);
        } catch (e) {}
      }

      const refCheck = detectReferenceRequired(prompt);

      cases.push({
        caseId: generateCaseIdSync(prompt),
        title: prompt.split('\n')[0].substring(0, 80) || `Prompt ${blockNum}`,
        prompt,
        author: source.owner,
        authorUrl: `https://github.com/${source.owner}`,
        sourceRepo: `${source.owner}/${source.repo}`,
        sourceUrl: `https://github.com/${source.owner}/${source.repo}`,
        referenceRequired: refCheck.required,
        referenceNote: refCheck.note,
        tags: extractTags(prompt),
        category: detectCategory(prompt),
        scrapedAt: new Date().toISOString().split('T')[0]
      });
    }

    return cases;
  };

  const generateCaseIdSync = (prompt: string): string => {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
  };

  const addSource = () => {
    const input = newRepoInput.trim();
    if (!input) return;

    const parts = input.split('/');
    if (parts.length !== 2) {
      setError('Invalid format. Use: owner/repo');
      return;
    }

    const [owner, repo] = parts;
    const exists = sources.some(s => s.owner === owner && s.repo === repo);
    if (exists) {
      setError('Source already exists');
      return;
    }

    setSources(prev => [
      ...prev,
      { id: `src-${Date.now()}`, owner, repo, enabled: true, promptCount: 0 }
    ]);
    setNewRepoInput('');
    setError(null);
  };

  const toggleSource = (id: string) => {
    setSources(prev => prev.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const removeSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Spinner />
        <p className="text-gray-400 mt-4">Loading prompt library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            Nano Banana Prompts
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Browse and copy AI image generation prompts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSourceManager(!showSourceManager)}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600"
          >
            <Icon name="sparkles" className="w-4 h-4" />
            Sources
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="text-sm bg-primary hover:bg-primary-hover disabled:bg-gray-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <Spinner />
                Syncing...
              </>
            ) : (
              <>
                <Icon name="sparkles" className="w-4 h-4" />
                Sync
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/50 text-red-200 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Source Manager */}
      {showSourceManager && (
        <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            GitHub Sources
          </h3>
          <div className="space-y-2 mb-4">
            {sources.map(source => (
              <div
                key={source.id}
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSource(source.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center ${
                      source.enabled ? 'bg-primary' : 'bg-gray-700'
                    }`}
                  >
                    {source.enabled && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <div>
                    <span className="text-white">{source.owner}/{source.repo}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      ({source.promptCount} prompts)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeSource(source.id)}
                  className="text-gray-500 hover:text-red-400 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRepoInput}
              onChange={(e) => setNewRepoInput(e.target.value)}
              placeholder="owner/repo"
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary outline-none"
              onKeyDown={(e) => e.key === 'Enter' && addSource()}
            />
            <button
              onClick={addSource}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 sticky top-0 z-10">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Favorites filter - prominent button */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showFavoritesOnly
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'bg-gray-900 text-gray-400 border border-gray-600 hover:border-gray-500'
            }`}
          >
            <svg className="w-4 h-4" fill={showFavoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Favorites
          </button>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Source filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary outline-none max-w-[180px]"
          >
            <option value="all">All Sources</option>
            {sourceRepos.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>

          {/* Reference filter */}
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showRefOnly}
              onChange={(e) => setShowRefOnly(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-900 border-gray-600 text-primary focus:ring-primary"
            />
            Needs Ref
          </label>

          {/* Counter */}
          <div className="text-sm text-gray-500">
            {filteredCases.length} prompts
          </div>
        </div>
      </div>

      {/* Feed - Vertical Scrolling */}
      {filteredCases.length === 0 ? (
        <div className="bg-gray-800/80 p-12 rounded-2xl border border-gray-700 text-center">
          <span className="text-6xl mb-4 block">🍌</span>
          <p className="text-gray-400">No prompts found</p>
          <p className="text-gray-500 text-sm mt-1">
            {cases.length === 0
              ? 'Click "Sync" to fetch prompts from GitHub'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="bg-gray-800/80 rounded-2xl border border-gray-700 overflow-hidden"
            >
              {/* Images - Source and Result side by side if both exist */}
              {(caseItem.geminiImage || caseItem.geminiImageUrl || caseItem.gpt4oImage || caseItem.gpt4oImageUrl) && (
                <div className="w-full bg-gray-900">
                  {/* If we have both source and result images, show side by side */}
                  {(caseItem.gpt4oImage || caseItem.gpt4oImageUrl) && (caseItem.geminiImage || caseItem.geminiImageUrl) ? (
                    <div className="flex flex-col sm:flex-row">
                      {/* Source/Reference Image */}
                      <div className="flex-1 p-2 flex flex-col items-center">
                        <span className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Source</span>
                        <img
                          src={caseItem.gpt4oImage || caseItem.gpt4oImageUrl}
                          alt="Source"
                          className="max-h-[300px] object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                      {/* Arrow */}
                      <div className="flex items-center justify-center p-2 text-gray-500">
                        <svg className="w-8 h-8 rotate-90 sm:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                      {/* Result Image */}
                      <div className="flex-1 p-2 flex flex-col items-center">
                        <span className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Result</span>
                        <img
                          src={caseItem.geminiImage || caseItem.geminiImageUrl}
                          alt="Result"
                          className="max-h-[300px] object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Single image - just show it full width */
                    <img
                      src={caseItem.geminiImage || caseItem.geminiImageUrl}
                      alt={caseItem.title}
                      className="w-full max-h-[500px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                {/* Header Row: Author + Category + Badges */}
                <div className="flex items-center justify-between mb-3">
                  <a
                    href={caseItem.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-medium hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm">
                      {caseItem.author.charAt(0).toUpperCase()}
                    </div>
                    @{caseItem.author}
                  </a>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                      {caseItem.category}
                    </span>
                    {caseItem.referenceRequired && (
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                        REF
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-3">
                  {caseItem.title}
                </h3>

                {/* Prompt Box */}
                <div className="bg-gray-900/80 rounded-lg p-4 mb-4">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                    {caseItem.prompt}
                  </pre>
                </div>

                {/* Reference Note */}
                {caseItem.referenceNote && (
                  <div className="mb-4 flex items-start gap-2 text-orange-400 text-sm bg-orange-500/10 p-3 rounded-lg">
                    <Icon name="sparkles" className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{caseItem.referenceNote}</span>
                  </div>
                )}

                {/* Tags */}
                {caseItem.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {caseItem.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded hover:bg-gray-700 cursor-pointer"
                        onClick={() => setSearchQuery(tag)}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-3">
                    {/* Favorite button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleFavorite(caseItem);
                      }}
                      disabled={togglingFavorite === caseItem.id}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        caseItem.favorite
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-gray-700/50 text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                      }`}
                      title={caseItem.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {togglingFavorite === caseItem.id ? (
                        <Spinner />
                      ) : (
                        <svg className="w-5 h-5 pointer-events-none" fill={caseItem.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                    </button>

                    {/* Find Similar button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        findSimilar(caseItem);
                      }}
                      className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 transition-all cursor-pointer"
                      title="Find similar prompts"
                    >
                      <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>

                    {/* Source link */}
                    <a
                      href={caseItem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 text-sm hover:text-gray-400 transition-colors"
                    >
                      {caseItem.sourceRepo}
                    </a>
                  </div>

                  <button
                    onClick={() => copyPrompt(caseItem)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      copiedId === caseItem.id
                        ? 'bg-green-600 text-white'
                        : 'bg-primary hover:bg-primary-hover text-white'
                    }`}
                  >
                    {copiedId === caseItem.id ? '✓ Copied!' : 'Copy Prompt'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* End of feed message */}
          <div className="text-center py-8 text-gray-500">
            <span className="text-2xl">🍌</span>
            <p className="mt-2">You've reached the end!</p>
            <p className="text-sm">{filteredCases.length} prompts loaded</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NanoBananaTab;
