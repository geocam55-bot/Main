import React from "react";


function ImportExportPlaceholder() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Import/Export Module</h1>
      <p style={{ fontSize: 18, color: '#888' }}>
        This module is temporarily unavailable.<br />
        A new Import/Export experience is coming soon.
      </p>
    </div>
  );
}

export default ImportExportPlaceholder;
export const ImportExport = ImportExportPlaceholder;
