// Mock server logic for Import/Export API endpoints (for local development/testing)

import { ImportJob } from '../types';

let jobs: Record<string, ImportJob> = {};

export async function uploadFile(file: File): Promise<{ fileId: string }> {
  // Simulate file upload and return a mock fileId
  return { fileId: 'mock-file-id' };
}

export async function getMappingPreview(fileId: string): Promise<any> {
  // Simulate mapping preview
  return { mapping: { email: 'Email Address', name: 'Client Name' } };
}

export async function validateData(fileId: string, mapping: any): Promise<{ errors: any[]; warnings: any[] }> {
  // Simulate validation (no errors)
  return { errors: [], warnings: [] };
}

export async function startImportJob(fileId: string, mapping: any, mode: 'immediate' | 'background'): Promise<{ jobId: string }> {
  // Simulate starting an import job
  const jobId = 'job-' + Math.random().toString(36).slice(2, 8);
  jobs[jobId] = {
    job_id: jobId,
    module: 'contacts',
    file_path: fileId,
    status: 'processing',
    progress: 0,
    results: undefined,
  };
  // Simulate progress
  setTimeout(() => {
    jobs[jobId].progress = 100;
    jobs[jobId].status = 'completed';
    jobs[jobId].results = { success: 100, failed: 0 };
  }, 4000);
  return { jobId };
}

export async function getImportJobStatus(jobId: string): Promise<{ status: string; progress: number }> {
  // Simulate job status polling
  const job = jobs[jobId];
  if (!job) return { status: 'not_found', progress: 0 };
  return { status: job.status, progress: job.progress };
}
