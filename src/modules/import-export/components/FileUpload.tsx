// FileUpload: Handles Excel file selection and preview
import React, { useRef } from 'react';

export interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".xlsx,.xls"
        ref={inputRef}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        Select File
      </button>
    </div>
  );
};
