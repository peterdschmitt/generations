// ContentFlow Draft Tab
// Content generation, visual generation, review, export

import React, { useState, useEffect } from 'react';
import { AirtableConfig } from '../services/airtableService';
import {
  CFProject,
  CFSource,
  CFTalkingPoint,
  CFOutput,
  TargetChannel,
  PLATFORM_CONFIGS,
  OutputStatus
} from '../types/contentFlow';
import {
  fetchSourcesForProject,
  fetchTalkingPointsForProject,
  fetchOutputsForProject,
  createOutput,
  updateOutput
} from '../services/contentFlowService';
import {
  generateDraft,
  reviseDraft,
  generateVisualPrompts,
  GeneratedDraft
} from '../services/contentProcessorService';
import { generateImageFromPrompt } from '../services/geminiService';
import Icon from './Icon';
import Spinner from './Spinner';

interface Props {
  config: AirtableConfig;
  project: CFProject | null;
  onBack: () => void;
  onNavigateToExport?: () => void;
}

const ContentFlowDraftTab: React.FC<Props> = ({
  config,
  project,
  onBack,
  onNavigateToExport
}) => {
  // Data State
  const [sources, setSources] = useState<CFSource[]>([]);
  const [talkingPoints, setTalkingPoints] = useState<CFTalkingPoint[]>([]);
  const [outputs, setOutputs] = useState<CFOutput[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [isRevising, setIsRevising] = useState(false);

  // Visual Generation
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  const [generatedVisuals, setGeneratedVisuals] = useState<Map<string, string>>(new Map());

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load data when project changes
  useEffect(() => {
    if (project) {
      loadProjectData();
    }
  }, [project?.id]);

  // Update editing content when selection changes
  useEffect(() => {
    const selectedOutput = outputs.find(o => o.id === selectedOutputId);
    if (selectedOutput) {
      setEditingContent(selectedOutput.draftContent);
    }
  }, [selectedOutputId, outputs]);

  const loadProjectData = async () => {
    if (!project) return;

    setIsLoading(true);
    try {
      const [sourcesData, pointsData, outputsData] = await Promise.all([
        fetchSourcesForProject(config, project.id),
        fetchTalkingPointsForProject(config, project.id),
        fetchOutputsForProject(config, project.id)
      ]);

      setSources(sourcesData);
      setTalkingPoints(pointsData);
      setOutputs(outputsData);

      if (outputsData.length > 0) {
        setSelectedOutputId(outputsData[0].id);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDrafts = async () => {
    if (!project) return;

    const selectedSources = sources.filter(s => s.selected);
    const selectedPoints = talkingPoints.filter(p => p.selected);

    if (selectedPoints.length === 0) {
      setError('No talking points selected. Go back to Curate tab.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const newOutputs: CFOutput[] = [];

      for (const channel of project.targetChannels) {
        setGenerationProgress(`Generating ${PLATFORM_CONFIGS[channel].label} draft...`);

        const draft = await generateDraft(
          channel,
          project.topic,
          selectedPoints,
          project.scopingAnswers || {},
          selectedSources
        );

        // Save to Airtable
        const savedOutput = await createOutput(
          config,
          project.id,
          channel,
          draft.content,
          draft.visualPrompts
        );

        newOutputs.push(savedOutput);

        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
      }

      setOutputs(prev => [...prev, ...newOutputs]);
      if (newOutputs.length > 0) {
        setSelectedOutputId(newOutputs[0].id);
      }

      setSuccess(`Generated ${newOutputs.length} drafts!`);
    } catch (e: any) {
      setError(e.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const handleRevise = async () => {
    if (!selectedOutputId || !feedback.trim()) return;

    const output = outputs.find(o => o.id === selectedOutputId);
    if (!output) return;

    setIsRevising(true);
    setError(null);

    try {
      const revisedContent = await reviseDraft(
        output.draftContent,
        feedback,
        output.channel
      );

      // Update in Airtable
      const updated = await updateOutput(config, selectedOutputId, {
        draftContent: revisedContent,
        userFeedback: feedback,
        version: output.version + 1
      });

      setOutputs(prev => prev.map(o => o.id === selectedOutputId ? updated : o));
      setEditingContent(revisedContent);
      setFeedback('');
      setSuccess('Draft revised!');
    } catch (e: any) {
      setError(e.message || 'Revision failed');
    } finally {
      setIsRevising(false);
    }
  };

  const handleGenerateVisuals = async () => {
    const output = outputs.find(o => o.id === selectedOutputId);
    if (!output || !output.visualPrompts || output.visualPrompts.length === 0) {
      setError('No visual prompts available for this draft');
      return;
    }

    setIsGeneratingVisuals(true);
    setError(null);

    try {
      const newVisuals = new Map(generatedVisuals);

      for (let i = 0; i < output.visualPrompts.length; i++) {
        const prompt = output.visualPrompts[i];
        setGenerationProgress(`Generating visual ${i + 1}/${output.visualPrompts.length}...`);

        const imageUrl = await generateImageFromPrompt(
          prompt,
          PLATFORM_CONFIGS[output.channel].imageDimensions.width === 1080 ? '1:1' : '16:9',
          '2K'
        );

        newVisuals.set(`${selectedOutputId}-${i}`, imageUrl);

        // Rate limit
        await new Promise(r => setTimeout(r, 2000));
      }

      setGeneratedVisuals(newVisuals);
      setSuccess('Visuals generated!');
    } catch (e: any) {
      setError(e.message || 'Visual generation failed');
    } finally {
      setIsGeneratingVisuals(false);
      setGenerationProgress('');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOutputId) return;

    try {
      const updated = await updateOutput(config, selectedOutputId, {
        draftContent: editingContent
      });
      setOutputs(prev => prev.map(o => o.id === selectedOutputId ? updated : o));
      setSuccess('Changes saved');
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    }
  };

  const handleStatusChange = async (status: OutputStatus) => {
    if (!selectedOutputId) return;

    try {
      const updated = await updateOutput(config, selectedOutputId, { status });
      setOutputs(prev => prev.map(o => o.id === selectedOutputId ? updated : o));
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editingContent);
    setSuccess('Copied to clipboard!');
  };

  const handleExportMarkdown = () => {
    const output = outputs.find(o => o.id === selectedOutputId);
    if (!output) return;

    const markdown = `# ${project?.topic}\n\n## ${PLATFORM_CONFIGS[output.channel].label}\n\n${editingContent}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name}-${output.channel}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedOutput = outputs.find(o => o.id === selectedOutputId);
  const selectedPoints = talkingPoints.filter(p => p.selected);

  if (!project) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <Icon name="folder" className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Select a project to generate content</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          Go Back
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
            <div className="flex gap-2 mt-2">
              {project.targetChannels.map(ch => (
                <span key={ch} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  {PLATFORM_CONFIGS[ch].label}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerateDrafts}
            disabled={isGenerating || selectedPoints.length === 0}
            className={`px-6 py-3 rounded-lg font-bold text-white flex items-center gap-2 ${
              isGenerating || selectedPoints.length === 0
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500'
            }`}
          >
            {isGenerating ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
            {isGenerating ? 'Generating...' : 'Generate All Drafts'}
          </button>
        </div>

        {isGenerating && (
          <div className="mt-4 bg-purple-900/30 border border-purple-600/50 rounded-lg p-3">
            <p className="text-purple-200 text-sm">{generationProgress}</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Output List */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Drafts</h3>

            {outputs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Click "Generate All Drafts" to create content
              </p>
            ) : (
              <div className="space-y-2">
                {outputs.map(output => (
                  <button
                    key={output.id}
                    onClick={() => setSelectedOutputId(output.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedOutputId === output.id
                        ? 'bg-primary/20 border border-primary'
                        : 'bg-gray-900/50 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name={PLATFORM_CONFIGS[output.channel].icon as any} className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">
                        {PLATFORM_CONFIGS[output.channel].label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        output.status === 'draft' ? 'bg-gray-700 text-gray-300' :
                        output.status === 'review' ? 'bg-amber-900/50 text-amber-300' :
                        output.status === 'approved' ? 'bg-green-900/50 text-green-300' :
                        'bg-blue-900/50 text-blue-300'
                      }`}>
                        {output.status}
                      </span>
                      <span className="text-[10px] text-gray-500">v{output.version}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: Content Editor */}
          <div className="lg:col-span-2 space-y-4">
            {selectedOutput ? (
              <>
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon name={PLATFORM_CONFIGS[selectedOutput.channel].icon as any} className="w-5 h-5 text-gray-400" />
                      <h3 className="text-lg font-bold text-white">
                        {PLATFORM_CONFIGS[selectedOutput.channel].label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedOutput.status}
                        onChange={(e) => handleStatusChange(e.target.value as OutputStatus)}
                        className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="approved">Approved</option>
                        <option value="exported">Exported</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full h-[400px] bg-gray-900 border border-gray-600 rounded-lg p-4 text-sm text-white focus:ring-2 focus:ring-primary outline-none resize-none font-mono"
                  />

                  <div className="flex justify-between items-center mt-4">
                    <div className="text-xs text-gray-500">
                      {editingContent.length} characters
                      {PLATFORM_CONFIGS[selectedOutput.channel].maxLength < 2000 &&
                        ` / ${PLATFORM_CONFIGS[selectedOutput.channel].maxLength} max`
                      }
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyToClipboard}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleExportMarkdown}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                      >
                        Export
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded text-sm font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>

                {/* Revision Panel */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    AI Revision
                  </h4>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Describe changes you want... e.g., 'Make the opening hook more attention-grabbing'"
                    className="w-full h-20 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none resize-none"
                  />
                  <button
                    onClick={handleRevise}
                    disabled={isRevising || !feedback.trim()}
                    className={`mt-3 w-full py-2 rounded-lg font-medium text-white flex items-center justify-center gap-2 ${
                      isRevising || !feedback.trim()
                        ? 'bg-gray-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
                    }`}
                  >
                    {isRevising ? <Spinner /> : <Icon name="sparkles" className="w-4 h-4" />}
                    {isRevising ? 'Revising...' : 'Revise Draft'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                <Icon name="file-text" className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a draft to edit or generate new drafts</p>
              </div>
            )}
          </div>

          {/* Right: Visual Opportunities */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 max-h-[800px] overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              Visual Opportunities
            </h3>

            {selectedOutput ? (
              <div className="space-y-4">
                {/* Key Statistics for Graphics */}
                {talkingPoints.filter(tp => tp.selected && tp.category === 'statistic').length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                      Key Statistics
                    </h4>
                    <div className="space-y-2">
                      {talkingPoints
                        .filter(tp => tp.selected && tp.category === 'statistic')
                        .map((tp, i) => (
                          <div key={tp.id} className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
                            <p className="text-sm text-white mb-2">{tp.content.substring(0, 150)}...</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-emerald-400">
                                {tp.visualPotential !== 'none' ? `Suggested: ${tp.visualPotential}` : 'Text content'}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(tp.content);
                                  setSuccess('Statistic copied!');
                                }}
                                className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Visual Prompts */}
                {selectedOutput.visualPrompts && selectedOutput.visualPrompts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      Generated Visual Prompts
                    </h4>
                    <div className="space-y-3">
                      {selectedOutput.visualPrompts.map((prompt, i) => {
                        const visualKey = `${selectedOutputId}-${i}`;
                        const generatedUrl = generatedVisuals.get(visualKey);

                        return (
                          <div key={i} className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                            {/* Prompt Header */}
                            <div className="p-3 border-b border-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-300">Visual #{i + 1}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(prompt);
                                      setSuccess('Prompt copied! Paste in Image Studio.');
                                    }}
                                    className="text-xs text-primary hover:text-white px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                                    title="Copy prompt for Image Studio"
                                  >
                                    Copy Prompt
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{prompt}</p>
                            </div>

                            {/* Generated Image or Placeholder */}
                            {generatedUrl ? (
                              <div className="p-2">
                                <img
                                  src={generatedUrl}
                                  alt={`Visual ${i + 1}`}
                                  className="w-full rounded"
                                />
                              </div>
                            ) : (
                              <div className="p-4 flex items-center justify-center bg-gray-800/50">
                                <div className="text-center">
                                  <Icon name="image" className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                  <p className="text-xs text-gray-500">Not generated yet</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Generate All Button */}
                    <button
                      onClick={handleGenerateVisuals}
                      disabled={isGeneratingVisuals}
                      className={`w-full mt-4 py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 ${
                        isGeneratingVisuals
                          ? 'bg-gray-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                      }`}
                    >
                      {isGeneratingVisuals ? <Spinner /> : <Icon name="image" className="w-4 h-4" />}
                      {isGeneratingVisuals ? generationProgress : 'Generate All Visuals'}
                    </button>
                  </div>
                )}

                {/* Data Points for Charts */}
                {talkingPoints.filter(tp => tp.selected && tp.visualPotential === 'chart').length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      Chart Data Points
                    </h4>
                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-2">
                        These talking points contain data suitable for charts:
                      </p>
                      <ul className="text-xs text-white space-y-1">
                        {talkingPoints
                          .filter(tp => tp.selected && tp.visualPotential === 'chart')
                          .map(tp => (
                            <li key={tp.id} className="flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span>{tp.content.substring(0, 100)}...</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* No Visuals Message */}
                {(!selectedOutput.visualPrompts || selectedOutput.visualPrompts.length === 0) &&
                 talkingPoints.filter(tp => tp.selected && tp.category === 'statistic').length === 0 && (
                  <div className="text-center py-8">
                    <Icon name="image" className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No visual opportunities detected</p>
                    <p className="text-gray-600 text-xs mt-1">
                      Try selecting talking points with statistics or chart potential
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Icon name="image" className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select a draft to see visual opportunities</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Icon name="chevron-left" className="w-5 h-5" />
          Back to Curate
        </button>

        {onNavigateToExport && outputs.length > 0 && (
          <button
            onClick={onNavigateToExport}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-bold flex items-center gap-2"
          >
            View All Outputs
            <Icon name="chevron-right" className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ContentFlowDraftTab;
