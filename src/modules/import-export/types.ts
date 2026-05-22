// Core TypeScript types for Import/Export module

export interface ModuleSchemaField {
  name: string;
  type: 'string' | 'number' | 'email' | 'date' | 'boolean';
  required: boolean;
}

export interface ModuleSchema {
  module: string;
  fields: ModuleSchemaField[];
}

export interface MappingConfig {
  [crmField: string]: string[]; // e.g. { email: ["email", "email address"] }
}

export interface ImportJob {
  job_id: string;
  module: string;
  file_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  results?: {
    success: number;
    failed: number;
    errors?: ImportError[];
  };
}

export interface ImportError {
  row: number;
  error: string;
}

export interface ExportConfig {
  module: string;
  filters?: Record<string, any>;
  fields: { label: string; field: string }[];
}
