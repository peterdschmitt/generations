// ContentFlow Curate Tab
// Source weighting, talking point extraction, scoping questions

import React, { useState, useEffect } from 'react';
import { AirtableConfig } from '../services/airtableService';
import {
  CFProject,
  CFSource,
  CFTalkingPoint,
  ScopingAnswers,
  TalkingPointCategory,
  VisualPotential,
  CATEGORY_STYLES,
  VISUAL_POTENTIAL_LABELS
} from '../types/contentFlow';
import {
  fetchSourcesForProject,
  fetchTalkingPointsForProject,
  updateSource,
  updateTalkingPoint,
  createTalkingPointsBatch,
  updateProjectScoping
} from '../services/contentFlowService';
import {
  extractTalkingPoints,
  generateScopingQuestions,
  ScopingQuestion
} from '../services/contentProcessorService';
import Icon from './Icon';
import Spinner from './Spinner';

interface Props {
  config: AirtableConfig;
  project: CFProject | null;
  onNavigateToDraft: () => void;
  onBack: () => void;
}

const ContentFlowCurateTab: React.FC<Props> = ({
  config,
  project,
  onNavigateToDraft,
  onBack
}) => {
  // Data State
  const [sources, setSources] = useState<CFSource[]>([]);
  const [talkingPoints, setTalkingPoints] = useState<CFTalkingPoint[]>([]);
  const [scopingQuestions, setScopingQuestions] = useState<ScopingQuestion[]>([]);
  const [scopingAnswers, setScopingAnswers] = useState<ScopingAnswers>({});

  // UI State
  const [activeSection, setActiveSection] = useState<'sources' | 'points' | 'scoping'>('sources');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<TalkingPointCategory | 'all'>('all');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load data when project changes
  useEffect(() => {
    if (project) {
      loadProjectData();
    }
  }, [project?.id]);

  const loadProjectData = async () => {
    if (!project) return;

    setIsLoading(true);
    try {
      const [sourcesData, pointsData] = await Promise.all([
        fetchSourcesForProject(config, project.id),
        fetchTalkingPointsForProject(config, project.id)
      ]);

      setSources(sourcesData);
      setTalkingPoints(pointsData);

      // Load scoping questions
      const sourcesSummary = sourcesData.map(s => s.summary).join('\n');
      const questions = await generateScopingQuestions(project.topic, sourcesSummary);
      setScopingQuestions(questions);

      // Load existing scoping answers if any
      if (project.scopingAnswers) {
        setScopingAnswers(project.scopingAnswers);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractTalkingPoints = async () => {
    if (!project) return;

    const selectedSources = sources.filter(s => s.selected && s.scrapedContent);
    if (selectedSources.length === 0) {
      setError('No selected sources with content to extract from');
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      let newPoints: CFTalkingPoint[] = [];

      for (let i = 0; i < selectedSources.length; i++) {
        const source = selectedSources[i];
        setExtractionProgress(`Extracting from ${i + 1}/${selectedSources.length}: ${source.title.substring(0, 30)}...`);

        const extracted = await extractTalkingPoints(
          source.scrapedContent!,
          source.title,
          project.topic
        );

        if (extracted.length > 0) {
          const saved = await createTalkingPointsBatch(config, project.id, source.id, extracted);
          newPoints = [...newPoints, ...saved];
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 500));
      }

      setTalkingPoints(prev => [...prev, ...newPoints]);
      setSuccess(`Extracted ${newPoints.length} talking points from ${selectedSources.length} sources`);
      setActiveSection('points');
    } catch (e: any) {
      setError(e.message || 'Extraction failed');
    } finally {
      setIsExtracting(false);
      setExtractionProgress('');
    }
  };

  const handleSourceWeightChange = async (sourceId: string, weight: number) => {
    try {
      const updated = await updateSource(config, sourceId, { weight });
      setSources(prev => prev.map(s => s.id === sourceId ? updated : s));
    } catch (e) {
      console.error('Failed to update weight:', e);
    }
  };

  const handleSourceToggle = async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    const newSelected = !source.selected;
    // Optimistic update
    setSources(prev => prev.map(s => s.id === sourceId ? { ...s, selected: newSelected } : s));

    try {
      await updateSource(config, sourceId, { selected: newSelected });
    } catch (e: any) {
      // Revert on error
      setSources(prev => prev.map(s => s.id === sourceId ? { ...s, selected: !newSelected } : s));
      setError(`Failed to toggle source: ${e.message}`);
    }
  };

  const handlePointToggle = async (pointId: string) => {
    const point = talkingPoints.find(p => p.id === pointId);
    if (!point) return;

    const newSelected = !point.selected;
    // Optimistic update
    setTalkingPoints(prev => prev.map(p => p.id === pointId ? { ...p, selected: newSelected } : p));

    try {
      await updateTalkingPoint(config, pointId, { selected: newSelected });
    } catch (e: any) {
      // Revert on error
      setTalkingPoints(prev => prev.map(p => p.id === pointId ? { ...p, selected: !newSelected } : p));
      setError(`Failed to toggle point: ${e.message}`);
    }
  };

  const handleVisualToggle = async (pointId: string) => {
    const point = talkingPoints.find(p => p.id === pointId);
    if (!point) return;

    const newUseForVisual = !point.useForVisual;
    // Optimistic update
    setTalkingPoints(prev => prev.map(p => p.id === pointId ? { ...p, useForVisual: newUseForVisual } : p));

    try {
      await updateTalkingPoint(config, pointId, { useForVisual: newUseForVisual });
    } catch (e: any) {
      // Revert on error
      setTalkingPoints(prev => prev.map(p => p.id === pointId ? { ...p, useForVisual: !newUseForVisual } : p));
      setError(`Failed to toggle visual: ${e.message}`);
    }
  };

  const handleScopingAnswerChange = (key: string, value: string) => {
    setScopingAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveScoping = async () => {
    if (!project) return;

    try {
      await updateProjectScoping(config, project.id, scopingAnswers);
      setSuccess('Scoping answers saved');
    } catch (e: any) {
      setError(e.message || 'Failed to save scoping answers');
    }
  };

  const filteredPoints = talkingPoints.filter(p => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (showOnlySelected && !p.selected) return false;
    return true;
  });

  const selectedSourcesCount = sources.filter(s => s.selected).length;
  const selectedPointsCount = talkingPoints.filter(p => p.selected).length;
  const visualPointsCount = talkingPoints.filter(p => p.useForVisual).length;

  if (!project) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <Icon name="folder" className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Select a project from the Research tab to curate content</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          Go to Research
        </button>
      </div>
    );
  }

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

      {/* Project Header */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{project.topic}</h2>
            <p className="text-sm text-gray-500">{project.name}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              <span className="text-white font-bold">{selectedSourcesCount}</span> sources
            </span>
            <span className="text-gray-400">
              <span className="text-white font-bold">{selectedPointsCount}</span> points
            </span>
            <span className="text-gray-400">
              <span className="text-emerald-400 font-bold">{visualPointsCount}</span> visuals
            </span>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('sources')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'sources'
              ? 'bg-primary text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          1. Sources ({selectedSourcesCount}/{sources.length})
        </button>
        <button
          onClick={() => setActiveSection('points')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'points'
              ? 'bg-primary text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          2. Talking Points ({talkingPoints.length})
        </button>
        <button
          onClick={() => setActiveSection('scoping')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'scoping'
              ? 'bg-primary text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          3. Scoping
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          {/* Sources Section */}
          {activeSection === 'sources' && (
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Weight & Select Sources
                </h3>
                <button
                  onClick={handleExtractTalkingPoints}
                  disabled={isExtracting || selectedSourcesCount === 0}
                  className={`px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2 ${
                    isExtracting || selectedSourcesCount === 0
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                  }`}
                >
                  {isExtracting ? <Spinner /> : <Icon name="sparkles" className="w-4 h-4" />}
                  {isExtracting ? 'Extracting...' : 'Extract Talking Points'}
                </button>
              </div>

              {isExtracting && (
                <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3 mb-4">
                  <p className="text-purple-200 text-sm">{extractionProgress}</p>
                </div>
              )}

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {sources.map(source => (
                  <div
                    key={source.id}
                    className={`p-4 rounded-lg border transition-all ${
                      source.selected
                        ? 'bg-gray-900/50 border-gray-600'
                        : 'bg-gray-900/30 border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={source.selected}
                        onChange={() => handleSourceToggle(source.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-500 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-white hover:text-primary"
                          >
                            {source.title}
                          </a>
                          <button
                            onClick={() => setExpandedSourceId(
                              expandedSourceId === source.id ? null : source.id
                            )}
                            className="text-gray-500 hover:text-white"
                          >
                            <Icon
                              name={expandedSourceId === source.id ? 'chevron-up' : 'chevron-down'}
                              className="w-4 h-4"
                            />
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 mt-1">{source.summary || source.url}</p>

                        {/* Weight Slider */}
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-xs text-gray-500">Weight:</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={source.weight}
                            onChange={(e) => handleSourceWeightChange(source.id, parseInt(e.target.value))}
                            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className={`text-xs font-bold ${
                            source.weight >= 4 ? 'text-green-400' :
                            source.weight >= 3 ? 'text-yellow-400' :
                            'text-gray-400'
                          }`}>
                            {source.weight}
                          </span>
                        </div>

                        {/* Expanded Content */}
                        {expandedSourceId === source.id && source.scrapedContent && (
                          <div className="mt-3 p-3 bg-gray-950 rounded-lg border border-gray-700 max-h-[200px] overflow-y-auto">
                            <p className="text-xs text-gray-400 whitespace-pre-wrap">
                              {source.scrapedContent.substring(0, 2000)}
                              {source.scrapedContent.length > 2000 && '...'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talking Points Section */}
          {activeSection === 'points' && (
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Review & Select Talking Points
                </h3>
                <div className="flex items-center gap-3">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as TalkingPointCategory | 'all')}
                    className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm text-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="statistic">Statistics</option>
                    <option value="quote">Quotes</option>
                    <option value="process">Processes</option>
                    <option value="opinion">Opinions</option>
                    <option value="comparison">Comparisons</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlySelected}
                      onChange={(e) => setShowOnlySelected(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800 cursor-pointer"
                    />
                    Selected only
                  </label>
                </div>
              </div>

              {filteredPoints.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="file-text" className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No talking points yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Go to Sources tab and click "Extract Talking Points"
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredPoints.map(point => {
                    const style = CATEGORY_STYLES[point.category];
                    return (
                      <div
                        key={point.id}
                        className={`p-4 rounded-lg border transition-all ${
                          point.selected
                            ? 'bg-gray-900/50 border-gray-600'
                            : 'bg-gray-900/30 border-gray-700 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={point.selected}
                            onChange={() => handlePointToggle(point.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-500 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800 cursor-pointer"
                          />

                          <div className="flex-1">
                            <p className="text-sm text-white">{point.content}</p>

                            <div className="flex items-center gap-2 mt-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${style.bgClass} ${style.borderClass} ${style.textClass}`}>
                                {style.label}
                              </span>
                              {point.visualPotential !== 'none' && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                  {VISUAL_POTENTIAL_LABELS[point.visualPotential]}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Visual Toggle */}
                          {point.visualPotential !== 'none' && (
                            <button
                              onClick={() => handleVisualToggle(point.id)}
                              className={`p-2 rounded-lg transition-all ${
                                point.useForVisual
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-700 text-gray-400 hover:text-white'
                              }`}
                              title={point.useForVisual ? 'Will generate visual' : 'Click to generate visual'}
                            >
                              <Icon name="image" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Scoping Section */}
          {activeSection === 'scoping' && (
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Content Direction & Tone
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Configure your content style, tone of voice, and structure preferences.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scopingQuestions.map(q => (
                  <div key={q.id} className={q.type === 'text' ? 'md:col-span-2' : ''}>
                    <label className="text-sm font-medium text-white block mb-2">
                      {q.question}
                      {q.required && <span className="text-red-400 ml-1">*</span>}
                    </label>

                    {q.type === 'select' && q.options ? (
                      <select
                        value={(scopingAnswers as any)[q.id] || ''}
                        onChange={(e) => handleScopingAnswerChange(q.id, e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                      >
                        <option value="">Select...</option>
                        {q.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={(scopingAnswers as any)[q.id] || ''}
                        onChange={(e) => handleScopingAnswerChange(q.id, e.target.value)}
                        placeholder={q.placeholder}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Tone Preview */}
              <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tone Preview</h4>
                <div className="flex flex-wrap gap-2">
                  {(scopingAnswers as any).formality && (
                    <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                      {(scopingAnswers as any).formality}
                    </span>
                  )}
                  {(scopingAnswers as any).energy && (
                    <span className="text-xs px-2 py-1 bg-amber-900/50 text-amber-300 rounded">
                      {(scopingAnswers as any).energy}
                    </span>
                  )}
                  {(scopingAnswers as any).personality && (
                    <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                      {(scopingAnswers as any).personality}
                    </span>
                  )}
                  {(scopingAnswers as any).hookStyle && (
                    <span className="text-xs px-2 py-1 bg-green-900/50 text-green-300 rounded">
                      Hook: {(scopingAnswers as any).hookStyle}
                    </span>
                  )}
                  {(scopingAnswers as any).closingStyle && (
                    <span className="text-xs px-2 py-1 bg-rose-900/50 text-rose-300 rounded">
                      Close: {(scopingAnswers as any).closingStyle}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveScoping}
                className="mt-6 px-6 py-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white rounded-lg font-medium"
              >
                Save Configuration
              </button>
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Icon name="chevron-left" className="w-5 h-5" />
          Back to Research
        </button>

        <button
          onClick={onNavigateToDraft}
          disabled={selectedPointsCount === 0}
          className={`px-6 py-3 rounded-lg font-bold text-white flex items-center gap-2 ${
            selectedPointsCount === 0
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
          }`}
        >
          Continue to Draft
          <Icon name="chevron-right" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ContentFlowCurateTab;
