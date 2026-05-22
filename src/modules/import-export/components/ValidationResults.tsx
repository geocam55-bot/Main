// ValidationResults: Shows validation errors/warnings
import React from 'react';

export interface ValidationResultsProps {
  errors: { row: number; error: string }[];
  warnings?: { row: number; warning: string }[];
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({ errors, warnings }) => {
  // TODO: Implement validation results UI
  return (
    <div>
      <h3>Validation Results</h3>
      {/* List errors and warnings */}
    </div>
  );
};
