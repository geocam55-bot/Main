// ImportHistory: Shows a list of previous import jobs
import React from 'react';
import { ImportJob } from '../types';

export interface ImportHistoryProps {
  jobs: ImportJob[];
  onSelectJob: (jobId: string) => void;
}

export const ImportHistory: React.FC<ImportHistoryProps> = ({ jobs, onSelectJob }) => (
  <div>
    <h4>Import History</h4>
    <ul>
      {jobs.map((job) => (
        <li key={job.job_id}>
          <button onClick={() => onSelectJob(job.job_id)}>
            {job.module} — {job.status} — {job.progress}%
          </button>
        </li>
      ))}
    </ul>
  </div>
);
