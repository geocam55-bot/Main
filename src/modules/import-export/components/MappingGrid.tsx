// MappingGrid: UI for manual/auto field mapping
import React from 'react';

export interface MappingGridProps {
  columns: string[];
  crmFields: string[];
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
}

export const MappingGrid: React.FC<MappingGridProps> = ({ columns, crmFields, mapping, onChange }) => {
  // Handler for changing mapping
  const handleChange = (crmField: string, newColumn: string) => {
    const newMapping = { ...mapping, [crmField]: newColumn };
    onChange(newMapping);
  };

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Map Fields</h3>
      <table className="min-w-full border text-sm bg-white">
        <thead>
          <tr>
            <th className="border px-2 py-1">CRM Field</th>
            <th className="border px-2 py-1">Import File Column</th>
          </tr>
        </thead>
        <tbody>
          {crmFields.map((crmField) => (
            <tr key={crmField}>
              <td className="border px-2 py-1 font-medium">{crmField}</td>
              <td className="border px-2 py-1">
                <select
                  className="border rounded px-2 py-1"
                  value={mapping[crmField] || ''}
                  onChange={(e) => handleChange(crmField, e.target.value)}
                >
                  <option value="">-- Select column --</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
