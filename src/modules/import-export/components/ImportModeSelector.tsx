// ImportModeSelector: Lets user choose between immediate and background import
import React from 'react';

export interface ImportModeSelectorProps {
  mode: 'immediate' | 'background';
  onChange: (mode: 'immediate' | 'background') => void;
}

export const ImportModeSelector: React.FC<ImportModeSelectorProps> = ({ mode, onChange }) => (
  <div>
    <label>
      <input
        type="radio"
        checked={mode === 'immediate'}
        onChange={() => onChange('immediate')}
      />
      Immediate Import
    </label>
    <label>
      <input
        type="radio"
        checked={mode === 'background'}
        onChange={() => onChange('background')}
      />
      Background Import
    </label>
  </div>
);
