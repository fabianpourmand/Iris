export type LLMCategory = 'general' | 'coding' | 'medical' | 'mathematics' | 'chemistry' | 'uncensored' | 'survival' | 'planting' | 'building';

export interface SystemInfo {
  cpu_name: string;
  cpu_cores: number;
  ram_total_gb: number;
  ram_available_gb: number;
  os: string;
  arch: string;
  gpu: string | null;
}

export interface DiagnosticsResponse {
  status: string;
  server: DiagnosticsServer;
  system: SystemInfo;
  llm: DiagnosticsLlm;
  models: DiagnosticsModels;
  paths: DiagnosticsPath[];
}

export interface DiagnosticsServer {
  version: string;
  pid: number;
  uptime_seconds: number;
  time_utc: string;
}

export interface DiagnosticsLlm {
  running: boolean;
  model_id: string | null;
  port: number;
}

export interface DiagnosticsModels {
  manifest_total: number;
  available: number;
}

export interface DiagnosticsPath {
  name: string;
  path: string;
  exists: boolean;
}

export interface ModelInfo {
  id: string;
  display_name: string;
  filename: string;
  min_ram_gb: number;
  min_vram_gb?: number;
  recommended_ctx: number;
  notes: string;
  category: LLMCategory;
  uncensored: boolean;
  available?: boolean;
  tier?: string;
  metadata?: ModelMetadataSummary | null;
  file?: ModelFileInfo | null;
  compatibility?: ModelCompatibility | null;
}

export interface ModelMetadataSummary {
  version: number;
  tensor_count: number;
  kv_count: number;
  architecture?: string | null;
  name?: string | null;
  quantization_version?: number | null;
  context_length?: number | null;
  embedding_length?: number | null;
  block_count?: number | null;
  head_count?: number | null;
  head_count_kv?: number | null;
  rope_freq_base?: number | null;
  rope_freq_scale?: number | null;
  tokenizer_model?: string | null;
  vocab_size?: number | null;
}

export interface ModelFileInfo {
  path: string;
  size_bytes: number;
  modified_unix: number;
}

export interface ModelCompatibility {
  available: boolean;
  compatible: boolean;
  ram_ok: boolean;
  vram_ok: boolean;
  ctx_ok: boolean;
  ram_required_gb: number;
  ram_available_gb: number;
  vram_required_gb?: number | null;
  ctx_required: number;
  ctx_limit?: number | null;
  reasons: string[];
}

export interface LLMStatus {
  running: boolean;
  model_id: string | null;
  port: number | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  category?: LLMCategory;
}

export interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  category_lock?: LLMCategory | null;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  category_lock?: LLMCategory | null;
  model_id?: string | null;
}

export interface Profile {
  id: string;
  name?: string;
  preferred_categories: LLMCategory[];
  experience_level: 'novice' | 'intermediate' | 'advanced';
  response_style: 'concise' | 'step-by-step';
  units: 'metric' | 'imperial';
  language?: string;
  created_at: string;
  updated_at: string;
}

export interface LanguagePackResource {
  id: string;
  path: string;
  kind: string;
  checksum_sha256?: string | null;
}

export interface LanguagePackManifest {
  schema_version: number;
  id: string;
  name: string;
  locale: string;
  version: string;
  description?: string | null;
  author?: string | null;
  license?: string | null;
  fallback_locale?: string | null;
  resources: LanguagePackResource[];
}

export interface LanguagePackEntry {
  id: string;
  path: string;
  manifest?: LanguagePackManifest | null;
  modified_unix: number;
  valid: boolean;
  errors: string[];
}

export interface LanguagePackListResponse {
  active_id?: string | null;
  packs: LanguagePackEntry[];
}

export interface FirmwareUpdateFile {
  path: string;
  checksum_sha256: string;
}

export interface FirmwareUpdateDelete {
  path: string;
  checksum_sha256?: string | null;
}

export interface FirmwareUpdateManifest {
  schema_version: number;
  id: string;
  name: string;
  version: string;
  created_at: string;
  description?: string | null;
  files: FirmwareUpdateFile[];
  delete: FirmwareUpdateDelete[];
}

export interface FirmwareUpdateRecord {
  id: string;
  name: string;
  version: string;
  applied_at: string;
  status: string;
  files_applied: number;
  files_deleted: number;
  error?: string | null;
}

export interface FirmwareUpdateStatusResponse {
  last_update?: FirmwareUpdateRecord | null;
}

export interface BenchmarkResult {
  tokens_per_second: number;
  time_to_first_token_ms: number;
  total_time_ms: number;
}

export interface Settings {
  threads: number;
  ctx_size: number;
  temperature: number;
  max_tokens: number;
  uncensored_mode: boolean;
  dark_mode: boolean;
  tts_enabled: boolean;
  survival_mode: boolean;
  advanced_mode: boolean;
  sandbox_root: string;
}
