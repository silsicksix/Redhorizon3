
export type AIModel = 'gemini-3.7-flash' | 'gemini-3.6-flash' | 'gemini-3.1-flash-lite' | 'gemini-flash-latest' | 'gemini-3-flash-preview' | 'deepseek-chat' | 'deepseek-reasoner' | 'nvidia/nemotron-3-super-120b-a12b' | 'nvidia/llama-3.1-nemotron-70b-instruct' | 'nvidia/nemotron-4-340b-instruct' | 'nvidia/llama-3.3-70b-instruct' | 'local-model' | string;
export type AIProvider = 'google' | 'openrouter' | 'deepseek' | 'custom';

export interface VisualSettings {
    themeColor: string; // '#ff0033' | '#00ccff' | '#10b981'
    nodeSize: number;
    linkDistance: number;
    showParticles: boolean;
    gridOpacity: number;
    wallpaperUrl?: string; // New field for background image
    wallpaperOpacity?: number; // New field for background opacity
    wallpaperMode?: 'cover' | 'contain'; // New field for background mode
    graphRenderer: 'svg' | 'canvas';
    nodeRenderMode?: 'classic' | 'schematic'; // 'classic' = tactical circle reticle, 'schematic' = Flowsint/React Flow style tech cards
    lowPowerMode?: boolean; // Pause animations, blur effects & physics to save battery/reduce heat
}

export type ProvenanceCategory = 'CORRELATION' | 'ATTRIBUTION' | 'TIMELINE_INFERENCE' | 'THREAT_ASSESSMENT' | 'ANOMALY_RESOLUTION';

export interface DecisionProvenance {
  id: string;
  title: string;
  verdict: string;
  confidence: number; // 0 - 100
  rationale: string;
  timestamp?: string;
  supportingNodeIds: string[];
  contradictingNodeIds?: string[];
  ruleOrModelUsed?: string;
  category: ProvenanceCategory;
  suggestedAction?: string;
}

export type ConflictCategory = 'SPATIO_TEMPORAL' | 'IDENTITY' | 'NETWORK' | 'RELATIONAL' | 'VERIFICATION';
export type ConflictSeverity = 'CRITICAL' | 'WARNING' | 'ADVISORY';

export interface GraphConflict {
  id: string;
  title: string;
  category: ConflictCategory;
  severity: ConflictSeverity;
  description: string;
  nodeIds: string[];
  conflictingProperties: {
    nodeId: string;
    nodeLabel: string;
    property: string;
    value: string;
  }[];
  recommendation: string;
  resolved?: boolean;
  detectedAt?: string;
}

export interface Node {
  id: string;
  label: string;
  type: string;
  brand?: string;
  details?: string;
  imageUrl?: string; // Keep for backward compatibility
  imageUrls?: string[]; // New field for multiple images
  reports?: string;
  htmlReportUrl?: string;
  sourceType?: string;
  url?: string;
  vaultMatch?: boolean; // TRUE if found in offline database
  vaultSource?: string; // Filename of the matched offline DB
  confidenceScore?: number; // 0 - 100%
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'DISPUTED';
  sources?: Array<{ sourceName: string; timestamp: string; url?: string; details?: string }>;
  aliases?: string[];
  tags?: string[];
  isGroundVerified?: boolean;
  timestamp?: string;
  eventDate?: string;
  mergedFromIds?: string[];
  provenanceData?: DecisionProvenance;
  isConflictFlagged?: boolean;
  activeConflicts?: GraphConflict[];
  isConflictState?: boolean;
  conflictCount?: number;
  riskScore?: number;
  lat?: number;
  lng?: number;
  group?: string;
  category?: string;
  metadata?: Record<string, any>;
  val?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link {
  source: string | Node;
  target: string | Node;
  label: string;
  isVault?: boolean;
  timestamp?: string;
  eventDate?: string;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export type EvidenceCategory = 'IDENTIFICATION' | 'LOCATION' | 'DIGITAL_FOOTPRINT' | 'ASSOCIATE' | 'DARK_WEB';

export interface EvidenceItem {
  id: string;
  label: string;
  category: EvidenceCategory;
  points: number;
  notes: string;
}

export interface SynthesisResult {
    verdict: string;
    codename?: string;
    threatLevel?: string;
    confidenceScore: number;
    summary: string;
    reasoning: string[];
    smokingGun: string;
    suggestedNextSteps: string;
    provenanceFindings?: DecisionProvenance[];
    splitSuggestion?: {
      needed?: boolean;
      parts?: number;
      suggestParts?: number;
      reason: string;
    };
}

export type LayoutMode = 'force' | 'schematic' | 'hierarchy' | 'circle' | 'grid' | 'cluster' | 'map' | 'orthogonal' | 'orthogonal_vertical';

export interface Workspace {
    id: string;
    name: string;
    data: GraphData;
    layoutMode: LayoutMode;
    timestamp: number;
    evidence: EvidenceItem[]; 
    synthesisResult?: SynthesisResult | null;
    strategyResult?: StrategyResult | null;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  action?: { url: string; text: string; };
}

export interface SpecialistAgentRole {
    id: 'agent_vision' | 'agent_strategy' | 'agent_recon' | 'agent_security';
    name: string;
    title: string;
    description: string;
    primaryModel: string;
    secondaryModel: string;
    contextLength: number;
    badge: string;
    modalities: string[];
}

export interface AgentMatrixConfig {
    autoDispatch: boolean; // Auto route or ask pre-flight
    promptBeforeRun: boolean; // Prompt pre-flight modal
    consensusMode: boolean; // Run dual-agent parallel consensus
    visionAgentPrimary: string;
    visionAgentSecondary: string;
    strategyAgentPrimary: string;
    strategyAgentSecondary: string;
    reconAgentPrimary: string;
    reconAgentSecondary: string;
    securityAgentPrimary: string;
    securityAgentSecondary: string;
}

export interface ModelConfig {
    provider: AIProvider;
    modelName: string;
    apiKey: string;
    openrouterApiKey?: string;
    openrouterModel?: string;
    agentMatrix?: AgentMatrixConfig;
    tavilyApiKey?: string; // SerpApi removed
    rapidApiKey?: string; // Horizon12 RapidAPI key
    googleCseId?: string; // Google Custom Search Engine ID (SOCINT)
    googleCseApiKey?: string; // Google Custom Search API Key
    thinkingBudget: number;
    useSearch: boolean;
    customBackendUrl?: string; // Originally termux backend
    pcBackendUrl?: string;
    activeBackend?: 'termux' | 'pc';
    customAiEndpoint?: string;
    visual: VisualSettings; 
}

export type CctvResolution = '180p' | '360p' | '480p' | '720p' | '1080p';
export type CctvStatus = 'ACTIVE_LIVE' | 'INTERMITTENT_LAG' | 'LOW_BANDWIDTH' | 'OFFLINE' | 'UNSECURED_OPEN';
export type CctvCategory = 'HIGHWAY_LLM' | 'CITY_DBKL' | 'PENANG_MBPP' | 'JOHOR_CIQ' | 'PORT_AUTHORITY' | 'PRIVATE_UNSECURED' | 'SABAH_SARAWAK';

export interface CctvCamera {
  id: string;
  name: string;
  location: string;
  state: string;
  category: CctvCategory;
  lat: number;
  lng: number;
  bearing: number; // 0 - 360 degrees FOV direction
  fovAngle: number; // e.g. 60 degrees
  resolution: CctvResolution;
  status: CctvStatus;
  fps: number;
  latencyMs: number;
  ipAddress: string;
  port: number;
  rtspUrl?: string;
  streamType: 'mjpeg' | 'h264' | 'snapshot_loop' | 'rtsp_open';
  isUnsecured: boolean;
  securityRiskNotice?: string;
  lastUpdated: string;
  speedLimitKmh?: number;
  currentVehicleCount?: number;
  flaggedPlates?: string[];
  description: string;
}

export interface NodeQueryState {
    loading: boolean;
    answer: string;
}

export interface StrategyStep {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedTool: string;
  title: string;
  targetNodeLabel?: string;
  description: string;
  commandExample?: string;
  rationale: string;
  actionType?: 'ARMORY' | 'RADIAL' | 'CLI' | 'MODAL';
  actionKey?: string;
}

export interface StrategyResult {
  situationReport: string;
  steps: StrategyStep[];
}

export interface LocalEntity {
  id: string;
  label: string;
  type: string;
  details: string;
  location?: string;
  socials?: { platform: string; handle: string; url: string }[];
}

export interface CaseFile {
  id: string;
  caseName: string;
  graph: GraphData;
  timestamp: number;
  version?: string;
  synthesisResult?: SynthesisResult | null;
  strategyResult?: StrategyResult | null;
}

export interface ShodanHost {
  ip_str: string;
  org?: string;
  isp?: string;
  os?: string;
  ports: number[];
  hostnames: string[];
  country_name: string;
  city: string;
  last_update: string;
  vulns?: string[];
  data?: {
    port: number;
    data: string;
    product: string;
  }[];
  isSimulated?: boolean;
}

export interface ForensicResult {
  matchScore: number;
  verdict: 'HIGH_MATCH' | 'POSSIBLE_MATCH' | 'UNLIKELY_MATCH' | 'UNKNOWN';
  reasoning: string;
  sharedPatterns: string[];
  divergentPatterns: string[];
}

export interface ProfilerResult {
    demographics: any;
    psychology: any;
    deceptionScore: number;
    maliceScore: number;
    analysisReport: string;
}

export interface TimelineEvent {
    year: string;
    event: string;
    type: string;
}

export interface SemanticTriple {
  id: string;
  subjectId: string;
  subjectLabel: string;
  predicate: string;
  objectId: string;
  objectLabel: string;
  isLiteral?: boolean;
  confidence?: number;
  timestamp?: string;
  provenance?: string;
  graphUri?: string;
}

export interface TimelineFilterState {
  enabled: boolean;
  minTimestamp: number;
  maxTimestamp: number;
  currentTimestamp: number;
  playbackSpeed: number; // 1, 2, 5, 10
  isPlaying: boolean;
}

export interface SmartSocialResolutionResult {
  inputTarget: string;
  detectedFormat: 'vanity_url' | 'handle' | 'obfuscated_name' | 'phonetic_slang' | 'composite';
  primaryHandle?: string;
  realDisplayName?: string;
  primaryPlatform?: string;
  targetAnalysis: {
    obfuscationTechnique: string;
    tradecraftBreakdown: string;
    phoneticRoots: string[];
    confidenceLevel: number;
  };
  phoneticAliases: Array<{
    alias: string;
    category: 'phonetic' | 'slang' | 'leetspeak' | 'handle_variation' | 'honorific';
    reason: string;
  }>;
  discoveredProfiles: Array<{
    platform: string;
    label: string;
    handle: string;
    displayName: string;
    url: string;
    details: string;
    confidence: number;
    matchReason: string;
    isVanityMismatch: boolean;
    imageUrl?: string;
  }>;
  dorkMatrix: Array<{
    engine: 'Google' | 'Bing' | 'Facebook' | 'Yandex' | 'DuckDuckGo';
    title: string;
    query: string;
    dorkUrl: string;
  }>;
  suggestedGraphNodes?: Node[];
  suggestedGraphLinks?: Array<{ source: string; target: string; label: string }>;
}
