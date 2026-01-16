// ContentFlow Airtable Service
// CRUD operations for CF_Projects, CF_Sources, CF_TalkingPoints, CF_Outputs

import { AirtableConfig } from './airtableService';
import {
  CFProject,
  CFSource,
  CFTalkingPoint,
  CFOutput,
  ProjectStatus,
  TargetChannel,
  SourceType,
  DiscoveryMethod,
  TalkingPointCategory,
  VisualPotential,
  OutputStatus,
  ScopingAnswers,
  VisualAsset
} from '../types/contentFlow';

// =============================================================================
// Table Names
// =============================================================================

const TABLES = {
  PROJECTS: 'Projects',
  SOURCES: 'Sources',
  TALKING_POINTS: 'TalkingPoints',
  OUTPUTS: 'Outputs'
};

// =============================================================================
// Helper Functions
// =============================================================================

const airtableRequest = async (
  config: AirtableConfig,
  table: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  recordId?: string,
  body?: any,
  queryParams?: string
): Promise<any> => {
  let url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}`;
  if (recordId) url += `/${recordId}`;
  if (queryParams) url += `?${queryParams}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Airtable error: ${response.statusText}`);
  }

  if (method === 'DELETE') return { success: true };
  return response.json();
};

// =============================================================================
// CF_Projects CRUD
// =============================================================================

export const fetchProjects = async (config: AirtableConfig): Promise<CFProject[]> => {
  // Simple fetch without sorting - Airtable will return in creation order by default
  const data = await airtableRequest(config, TABLES.PROJECTS, 'GET', undefined, undefined, 'maxRecords=50');

  return data.records.map((r: any) => mapRecordToProject(r)).reverse(); // Reverse to show newest first
};

export const fetchProject = async (config: AirtableConfig, projectId: string): Promise<CFProject> => {
  const data = await airtableRequest(config, TABLES.PROJECTS, 'GET', projectId);
  return mapRecordToProject(data);
};

export const createProject = async (
  config: AirtableConfig,
  topic: string,
  targetChannels: TargetChannel[]
): Promise<CFProject> => {
  const payload = {
    fields: {
      'topic': topic,
      'status': 'discovery',
      'target_channels': targetChannels
    },
    typecast: true
  };

  const data = await airtableRequest(config, TABLES.PROJECTS, 'POST', undefined, payload);
  return mapRecordToProject(data);
};

export const updateProjectStatus = async (
  config: AirtableConfig,
  projectId: string,
  status: ProjectStatus
): Promise<CFProject> => {
  const payload = {
    fields: { 'status': status },
    typecast: true
  };

  const data = await airtableRequest(config, TABLES.PROJECTS, 'PATCH', projectId, payload);
  return mapRecordToProject(data);
};

export const updateProjectScoping = async (
  config: AirtableConfig,
  projectId: string,
  scopingAnswers: ScopingAnswers
): Promise<CFProject> => {
  const payload = {
    fields: {
      'scoping_answers': JSON.stringify(scopingAnswers),
      'status': 'drafting'
    },
    typecast: true
  };

  const data = await airtableRequest(config, TABLES.PROJECTS, 'PATCH', projectId, payload);
  return mapRecordToProject(data);
};

export const deleteProject = async (config: AirtableConfig, projectId: string): Promise<void> => {
  await airtableRequest(config, TABLES.PROJECTS, 'DELETE', projectId);
};

// =============================================================================
// CF_Sources CRUD
// =============================================================================

export const fetchSourcesForProject = async (
  config: AirtableConfig,
  projectId: string
): Promise<CFSource[]> => {
  // Fetch all sources and filter client-side (more reliable than formula with linked records)
  const data = await airtableRequest(
    config,
    TABLES.SOURCES,
    'GET',
    undefined,
    undefined,
    'maxRecords=100'
  );

  return data.records
    .map((r: any) => mapRecordToSource(r))
    .filter((s: CFSource) => s.projectId === projectId);
};

export const createSource = async (
  config: AirtableConfig,
  projectId: string,
  url: string,
  title: string,
  sourceType: SourceType,
  discoveryMethod: DiscoveryMethod,
  scrapedContent?: string,
  summary?: string
): Promise<CFSource> => {
  const payload = {
    fields: {
      'project': [projectId], // Airtable linked records are arrays
      'url': url,
      'title': title,
      'source_type': sourceType,
      'weight': 3,
      'selected': true,
      'discovery_method': discoveryMethod,
      'scraped_content': scrapedContent || '',
      'summary': summary || ''
    },
    typecast: true
  };

  const data = await airtableRequest(config, TABLES.SOURCES, 'POST', undefined, payload);
  return mapRecordToSource(data);
};

export const updateSource = async (
  config: AirtableConfig,
  sourceId: string,
  updates: Partial<{ weight: number; selected: boolean; scrapedContent: string; summary: string }>
): Promise<CFSource> => {
  const fields: any = {};
  if (updates.weight !== undefined) fields['weight'] = updates.weight;
  if (updates.selected !== undefined) fields['selected'] = updates.selected;
  if (updates.scrapedContent !== undefined) fields['scraped_content'] = updates.scrapedContent;
  if (updates.summary !== undefined) fields['summary'] = updates.summary;

  const payload = { fields, typecast: true };
  const data = await airtableRequest(config, TABLES.SOURCES, 'PATCH', sourceId, payload);
  return mapRecordToSource(data);
};

export const deleteSource = async (config: AirtableConfig, sourceId: string): Promise<void> => {
  await airtableRequest(config, TABLES.SOURCES, 'DELETE', sourceId);
};

// Batch create sources (for discovery results)
export const createSourcesBatch = async (
  config: AirtableConfig,
  projectId: string,
  sources: Array<{
    url: string;
    title: string;
    sourceType: SourceType;
    discoveryMethod: DiscoveryMethod;
    scrapedContent?: string;
    summary?: string;
  }>
): Promise<CFSource[]> => {
  const results: CFSource[] = [];

  // Airtable batch limit is 10 records
  for (let i = 0; i < sources.length; i += 10) {
    const batch = sources.slice(i, i + 10);

    const payload = {
      records: batch.map(s => ({
        fields: {
          'project': [projectId],
          'url': s.url,
          'title': s.title,
          'source_type': s.sourceType,
          'weight': 3,
          'selected': true,
          'discovery_method': s.discoveryMethod,
          'scraped_content': s.scrapedContent || '',
          'summary': s.summary || ''
        }
      })),
      typecast: true
    };

    const data = await airtableRequest(config, TABLES.SOURCES, 'POST', undefined, payload);
    results.push(...data.records.map((r: any) => mapRecordToSource(r)));

    // Rate limit: wait 200ms between batches
    if (i + 10 < sources.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
};

// =============================================================================
// CF_TalkingPoints CRUD
// =============================================================================

export const fetchTalkingPointsForProject = async (
  config: AirtableConfig,
  projectId: string
): Promise<CFTalkingPoint[]> => {
  // Fetch all and filter client-side
  const data = await airtableRequest(
    config,
    TABLES.TALKING_POINTS,
    'GET',
    undefined,
    undefined,
    'maxRecords=200'
  );

  return data.records
    .map((r: any) => mapRecordToTalkingPoint(r))
    .filter((tp: CFTalkingPoint) => tp.projectId === projectId);
};

export const createTalkingPoint = async (
  config: AirtableConfig,
  projectId: string,
  sourceId: string,
  content: string,
  category: TalkingPointCategory,
  visualPotential: VisualPotential
): Promise<CFTalkingPoint> => {
  const payload = {
    fields: {
      'project': [projectId],
      'source': [sourceId],
      'content': content,
      'category': category,
      'visual_potential': visualPotential,
      'selected': true,
      'use_for_visual': visualPotential !== 'none'
    },
    typecast: true
  };

  const data = await airtableRequest(config, TABLES.TALKING_POINTS, 'POST', undefined, payload);
  return mapRecordToTalkingPoint(data);
};

export const updateTalkingPoint = async (
  config: AirtableConfig,
  pointId: string,
  updates: Partial<{ selected: boolean; useForVisual: boolean; content: string }>
): Promise<CFTalkingPoint> => {
  const fields: any = {};
  if (updates.selected !== undefined) fields['selected'] = updates.selected;
  if (updates.useForVisual !== undefined) fields['use_for_visual'] = updates.useForVisual;
  if (updates.content !== undefined) fields['content'] = updates.content;

  const payload = { fields, typecast: true };
  const data = await airtableRequest(config, TABLES.TALKING_POINTS, 'PATCH', pointId, payload);
  return mapRecordToTalkingPoint(data);
};

export const deleteTalkingPoint = async (config: AirtableConfig, pointId: string): Promise<void> => {
  await airtableRequest(config, TABLES.TALKING_POINTS, 'DELETE', pointId);
};

// Batch create talking points (for extraction results)
export const createTalkingPointsBatch = async (
  config: AirtableConfig,
  projectId: string,
  sourceId: string,
  points: Array<{
    content: string;
    category: TalkingPointCategory;
    visualPotential: VisualPotential;
  }>
): Promise<CFTalkingPoint[]> => {
  const results: CFTalkingPoint[] = [];

  for (let i = 0; i < points.length; i += 10) {
    const batch = points.slice(i, i + 10);

    const payload = {
      records: batch.map(p => ({
        fields: {
          'project': [projectId],
          'source': [sourceId],
          'content': p.content,
          'category': p.category,
          'visual_potential': p.visualPotential,
          'selected': true,
          'use_for_visual': p.visualPotential !== 'none'
        }
      })),
      typecast: true
    };

    const data = await airtableRequest(config, TABLES.TALKING_POINTS, 'POST', undefined, payload);
    results.push(...data.records.map((r: any) => mapRecordToTalkingPoint(r)));

    if (i + 10 < points.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
};

// =============================================================================
// CF_Outputs CRUD
// =============================================================================

export const fetchOutputsForProject = async (
  config: AirtableConfig,
  projectId: string
): Promise<CFOutput[]> => {
  // Fetch all and filter client-side
  const data = await airtableRequest(
    config,
    TABLES.OUTPUTS,
    'GET',
    undefined,
    undefined,
    'maxRecords=50'
  );

  return data.records
    .map((r: any) => mapRecordToOutput(r))
    .filter((o: CFOutput) => o.projectId === projectId);
};

export const createOutput = async (
  config: AirtableConfig,
  projectId: string,
  channel: TargetChannel,
  draftContent: string,
  visualPrompts?: string[]
): Promise<CFOutput> => {
  const payload = {
    fields: {
      'project': [projectId],
      'channel': channel,
      'draft_content': draftContent,
      'version': 1,
      'visual_prompts': visualPrompts ? JSON.stringify(visualPrompts) : '',
      'status': 'draft'
    },
    typecast: true
  };

  const data = await airtableRequest(config, TABLES.OUTPUTS, 'POST', undefined, payload);
  return mapRecordToOutput(data);
};

export const updateOutput = async (
  config: AirtableConfig,
  outputId: string,
  updates: Partial<{
    draftContent: string;
    status: OutputStatus;
    userFeedback: string;
    version: number;
  }>
): Promise<CFOutput> => {
  const fields: any = {};
  if (updates.draftContent !== undefined) fields['draft_content'] = updates.draftContent;
  if (updates.status !== undefined) fields['status'] = updates.status;
  if (updates.userFeedback !== undefined) fields['user_feedback'] = updates.userFeedback;
  if (updates.version !== undefined) fields['version'] = updates.version;

  const payload = { fields, typecast: true };
  const data = await airtableRequest(config, TABLES.OUTPUTS, 'PATCH', outputId, payload);
  return mapRecordToOutput(data);
};

export const deleteOutput = async (config: AirtableConfig, outputId: string): Promise<void> => {
  await airtableRequest(config, TABLES.OUTPUTS, 'DELETE', outputId);
};

// =============================================================================
// Record Mappers
// =============================================================================

const mapRecordToProject = (record: any): CFProject => {
  const f = record.fields;
  let scopingAnswers: ScopingAnswers | undefined;

  if (f.scoping_answers) {
    try {
      scopingAnswers = JSON.parse(f.scoping_answers);
    } catch (e) {
      scopingAnswers = undefined;
    }
  }

  // Generate name from topic if not present
  const topic = f.topic || '';
  const name = topic ? generateProjectName(topic) : `project-${record.id?.substring(0, 8) || 'unknown'}`;

  return {
    id: record.id,
    name: name,
    topic: topic,
    status: (f.status || 'discovery') as ProjectStatus,
    targetChannels: f.target_channels || [],
    scopingAnswers,
    createdAt: f.created_at || record.createdTime || new Date().toISOString()
  };
};

const mapRecordToSource = (record: any): CFSource => {
  const f = record.fields;
  return {
    id: record.id,
    projectId: Array.isArray(f.project) ? f.project[0] : f.project || '',
    url: f.url || '',
    title: f.title || '',
    sourceType: (f.source_type || 'article') as SourceType,
    weight: f.weight || 3,
    selected: f.selected ?? true,
    scrapedContent: f.scraped_content || '',
    summary: f.summary || '',
    discoveryMethod: (f.discovery_method || 'manual_add') as DiscoveryMethod,
    scrapedAt: f.created_at || ''
  };
};

const mapRecordToTalkingPoint = (record: any): CFTalkingPoint => {
  const f = record.fields;
  return {
    id: record.id,
    projectId: Array.isArray(f.project) ? f.project[0] : f.project || '',
    sourceId: Array.isArray(f.source) ? f.source[0] : f.source || '',
    content: f.content || '',
    category: (f.category || 'quote') as TalkingPointCategory,
    visualPotential: (f.visual_potential || 'none') as VisualPotential,
    selected: f.selected ?? true,
    useForVisual: f.use_for_visual ?? false
  };
};

const mapRecordToOutput = (record: any): CFOutput => {
  const f = record.fields;

  let visualAssets: VisualAsset[] = [];
  if (f.visual_assets && Array.isArray(f.visual_assets)) {
    visualAssets = f.visual_assets.map((a: any) => ({
      id: a.id,
      url: a.url,
      filename: a.filename,
      thumbnailUrl: a.thumbnails?.large?.url
    }));
  }

  let visualPrompts: string[] = [];
  if (f.visual_prompts) {
    try {
      visualPrompts = JSON.parse(f.visual_prompts);
    } catch (e) {
      visualPrompts = [];
    }
  }

  return {
    id: record.id,
    projectId: Array.isArray(f.project) ? f.project[0] : f.project || '',
    channel: (f.channel || 'blog') as TargetChannel,
    draftContent: f.draft_content || '',
    version: f.version || 1,
    visualAssets,
    visualPrompts,
    userFeedback: f.user_feedback || '',
    status: (f.status || 'draft') as OutputStatus
  };
};

// =============================================================================
// Utility Functions
// =============================================================================

const generateProjectName = (topic: string): string => {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);

  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${slug}-${date}`;
};

// Fetch all data for a project in one call (for initial load)
export const fetchProjectWithRelations = async (
  config: AirtableConfig,
  projectId: string
): Promise<{
  project: CFProject;
  sources: CFSource[];
  talkingPoints: CFTalkingPoint[];
  outputs: CFOutput[];
}> => {
  const [project, sources, talkingPoints, outputs] = await Promise.all([
    fetchProject(config, projectId),
    fetchSourcesForProject(config, projectId),
    fetchTalkingPointsForProject(config, projectId),
    fetchOutputsForProject(config, projectId)
  ]);

  return { project, sources, talkingPoints, outputs };
};
