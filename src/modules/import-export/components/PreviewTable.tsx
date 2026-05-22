// PreviewTable: Shows a preview of the uploaded Excel data
import React from 'react';

export interface PreviewTableProps {
  rows: any[];
  maxRows?: number;
}

export const PreviewTable: React.FC<PreviewTableProps> = ({ rows, maxRows = 50 }) => {
  if (!rows.length) return <div>No data to preview.</div>;
  const columns = Object.keys(rows[0]);
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, maxRows).map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col}>{row[col]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
