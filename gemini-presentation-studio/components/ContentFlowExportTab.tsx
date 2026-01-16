// ContentFlow Export Tab
// View all outputs side-by-side, export, and publish

import React, { useState, useEffect } from 'react';
import { AirtableConfig } from '../services/airtableService';
import {
  CFProject,
  CFOutput,
  TargetChannel,
  PLATFORM_CONFIGS,
  OutputStatus,
  VisualAsset
} from '../types/contentFlow';
import {
  fetchOutputsForProject,
  updateOutput
} from '../services/contentFlowService';
import Icon from './Icon';
import Spinner from './Spinner';

// =============================================================================
// Image Carousel Component
// =============================================================================

interface ImageCarouselProps {
  images: VisualAsset[];
  onImageClick?: (image: VisualAsset) => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[currentIndex];

  return (
    <div className="relative">
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden">
        <img
          src={currentImage.thumbnailUrl || currentImage.url}
          alt={currentImage.filename || `Visual ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick?.(currentImage)}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <Icon name="chevron-left" className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <Icon name="chevron-right" className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-1 rounded-full text-xs text-white">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                idx === currentIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={img.thumbnailUrl || img.url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Open Full Size Link */}
      <a
        href={currentImage.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 text-xs text-primary hover:text-primary-hover flex items-center gap-1"
      >
        <Icon name="image" className="w-3 h-3" />
        Open full size
      </a>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

interface Props {
  config: AirtableConfig;
  project: CFProject | null;
  onBack: () => void;
}

const ContentFlowExportTab: React.FC<Props> = ({
  config,
  project,
  onBack
}) => {
  const [outputs, setOutputs] = useState<CFOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<TargetChannel>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'compare'>('grid');

  useEffect(() => {
    if (project) {
      loadOutputs();
    }
  }, [project?.id]);

  const loadOutputs = async () => {
    if (!project) return;

    setIsLoading(true);
    try {
      const data = await fetchOutputsForProject(config, project.id);
      setOutputs(data);
      // Select all channels by default
      setSelectedChannels(new Set(data.map(o => o.channel)));
    } catch (e: any) {
      setError(e.message || 'Failed to load outputs');
    } finally {
      setIsLoading(false);
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

  const handleStatusChange = async (outputId: string, status: OutputStatus) => {
    try {
      const updated = await updateOutput(config, outputId, { status });
      setOutputs(prev => prev.map(o => o.id === outputId ? updated : o));
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    }
  };

  const handleCopyContent = (content: string, channel: string) => {
    navigator.clipboard.writeText(content);
    setSuccess(`${channel} content copied to clipboard!`);
  };

  const handleExportAll = () => {
    const visibleOutputs = outputs.filter(o => selectedChannels.has(o.channel));

    let markdown = `# ${project?.topic}\n\n`;
    markdown += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;

    for (const output of visibleOutputs) {
      markdown += `## ${PLATFORM_CONFIGS[output.channel].label}\n\n`;
      markdown += `Status: ${output.status} | Version: ${output.version}\n\n`;

      // Add images section if available
      if (output.visualAssets && output.visualAssets.length > 0) {
        markdown += `### Visual Assets\n\n`;
        output.visualAssets.forEach((img, idx) => {
          markdown += `![${img.filename || `Image ${idx + 1}`}](${img.url})\n\n`;
        });
      }

      markdown += `### Content\n\n`;
      markdown += output.draftContent;
      markdown += `\n\n---\n\n`;
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'content'}-all-channels.md`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('All content exported!');
  };

  const handleExportJSON = () => {
    const visibleOutputs = outputs.filter(o => selectedChannels.has(o.channel));

    const exportData = {
      project: {
        topic: project?.topic,
        name: project?.name,
        channels: project?.targetChannels
      },
      generatedAt: new Date().toISOString(),
      outputs: visibleOutputs.map(o => ({
        channel: o.channel,
        platform: PLATFORM_CONFIGS[o.channel].label,
        content: o.draftContent,
        status: o.status,
        version: o.version,
        visualPrompts: o.visualPrompts,
        images: o.visualAssets?.map(img => ({
          url: img.url,
          filename: img.filename,
          thumbnail: img.thumbnailUrl
        })) || []
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'content'}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('JSON exported!');
  };

  const visibleOutputs = outputs.filter(o => selectedChannels.has(o.channel));
  const approvedCount = outputs.filter(o => o.status === 'approved' || o.status === 'exported').length;

  if (!project) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <Icon name="folder" className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Select a project to view outputs</p>
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

      {/* Header */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{project.topic}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {outputs.length} outputs • {approvedCount} approved
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('compare')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'compare' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Compare
              </button>
            </div>

            {/* Export Buttons */}
            <button
              onClick={handleExportAll}
              disabled={visibleOutputs.length === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Export Markdown
            </button>
            <button
              onClick={handleExportJSON}
              disabled={visibleOutputs.length === 0}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Channel Filters */}
        <div className="flex flex-wrap gap-2">
          {outputs.map(output => (
            <button
              key={output.id}
              onClick={() => toggleChannel(output.channel)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                selectedChannels.has(output.channel)
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <Icon name={PLATFORM_CONFIGS[output.channel].icon as any} className="w-4 h-4" />
              {PLATFORM_CONFIGS[output.channel].label}
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                output.status === 'approved' ? 'bg-green-600' :
                output.status === 'exported' ? 'bg-blue-600' :
                output.status === 'review' ? 'bg-amber-600' :
                'bg-gray-600'
              }`}>
                {output.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : outputs.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <Icon name="file-text" className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No content generated yet</p>
          <p className="text-gray-500 text-sm">Go to the Draft tab to generate content for your channels</p>
          <button
            onClick={onBack}
            className="mt-6 px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium"
          >
            Go to Draft Tab
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleOutputs.map(output => (
            <div key={output.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {/* Card Header */}
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon name={PLATFORM_CONFIGS[output.channel].icon as any} className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="font-bold text-white">{PLATFORM_CONFIGS[output.channel].label}</h3>
                    <p className="text-xs text-gray-500">Version {output.version}</p>
                  </div>
                </div>
                <select
                  value={output.status}
                  onChange={(e) => handleStatusChange(output.id, e.target.value as OutputStatus)}
                  className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${
                    output.status === 'approved' ? 'bg-green-900/50 text-green-300' :
                    output.status === 'exported' ? 'bg-blue-900/50 text-blue-300' :
                    output.status === 'review' ? 'bg-amber-900/50 text-amber-300' :
                    'bg-gray-700 text-gray-300'
                  }`}
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="approved">Approved</option>
                  <option value="exported">Exported</option>
                </select>
              </div>

              {/* Image Carousel */}
              {output.visualAssets && output.visualAssets.length > 0 && (
                <div className="p-4 border-b border-gray-700 bg-gray-900/30">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="image" className="w-3 h-3" />
                    Visual Assets ({output.visualAssets.length})
                  </h4>
                  <ImageCarousel
                    images={output.visualAssets}
                    onImageClick={(img) => window.open(img.url, '_blank')}
                  />
                </div>
              )}

              {/* Content Preview */}
              <div className="p-4 max-h-[300px] overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {output.draftContent}
                </pre>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {output.draftContent.length} chars
                  {output.visualAssets && output.visualAssets.length > 0 && (
                    <span className="ml-2">• {output.visualAssets.length} images</span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyContent(output.draftContent, PLATFORM_CONFIGS[output.channel].label)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compare View - Side by Side */
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleOutputs.length}, 1fr)` }}>
            {/* Headers */}
            {visibleOutputs.map(output => (
              <div key={`header-${output.id}`} className="p-4 border-b border-r border-gray-700 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name={PLATFORM_CONFIGS[output.channel].icon as any} className="w-5 h-5 text-gray-400" />
                  <h3 className="font-bold text-white">{PLATFORM_CONFIGS[output.channel].label}</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">v{output.version}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    output.status === 'approved' ? 'bg-green-900/50 text-green-300' :
                    output.status === 'exported' ? 'bg-blue-900/50 text-blue-300' :
                    output.status === 'review' ? 'bg-amber-900/50 text-amber-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {output.status}
                  </span>
                </div>
              </div>
            ))}

            {/* Image Carousels Row */}
            {visibleOutputs.some(o => o.visualAssets && o.visualAssets.length > 0) && (
              visibleOutputs.map(output => (
                <div key={`images-${output.id}`} className="p-4 border-b border-r border-gray-700 bg-gray-900/20">
                  {output.visualAssets && output.visualAssets.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Icon name="image" className="w-3 h-3" />
                        {output.visualAssets.length} Images
                      </h4>
                      <ImageCarousel
                        images={output.visualAssets}
                        onImageClick={(img) => window.open(img.url, '_blank')}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
                      No images
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Content */}
            {visibleOutputs.map(output => (
              <div key={`content-${output.id}`} className="p-4 border-r border-gray-700 min-h-[400px] max-h-[600px] overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {output.draftContent}
                </pre>
              </div>
            ))}

            {/* Actions */}
            {visibleOutputs.map(output => (
              <div key={`actions-${output.id}`} className="p-4 border-t border-r border-gray-700 bg-gray-900/30">
                <button
                  onClick={() => handleCopyContent(output.draftContent, PLATFORM_CONFIGS[output.channel].label)}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium"
                >
                  Copy {PLATFORM_CONFIGS[output.channel].label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {outputs.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <p className="text-2xl font-bold text-white">{outputs.length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Outputs</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <p className="text-2xl font-bold text-amber-400">{outputs.filter(o => o.status === 'review').length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">In Review</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <p className="text-2xl font-bold text-green-400">{outputs.filter(o => o.status === 'approved').length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Approved</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <p className="text-2xl font-bold text-blue-400">{outputs.filter(o => o.status === 'exported').length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Exported</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Icon name="chevron-left" className="w-5 h-5" />
          Back to Draft
        </button>
      </div>
    </div>
  );
};

export default ContentFlowExportTab;
