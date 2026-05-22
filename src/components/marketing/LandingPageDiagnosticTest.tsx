export function LandingPageDiagnosticTest() {
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'black' }}>
        Landing Page Diagnostic Test
      </h1>
      <p style={{ fontSize: '18px', color: '#666' }}>
        If you can see this, the routing is working correctly!
      </p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <p>URL: {window.location.href}</p>
        <p>Search params: {window.location.search}</p>
        <p>View param: {new URLSearchParams(window.location.search).get('view')}</p>
      </div>
    </div>
  );
}
