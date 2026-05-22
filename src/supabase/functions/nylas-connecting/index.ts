import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Intermediate "connecting" page shown while Nylas OAuth is in progress
 * This helps users know what's happening instead of seeing a blank page
 */

serve(async (req) => {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Connecting to Calendar...</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem 2rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 400px;
            text-align: center;
          }
          h1 {
            color: #333;
            margin: 0 0 1rem 0;
            font-size: 1.5rem;
          }
          p {
            color: #666;
            margin: 0 0 2rem 0;
            line-height: 1.5;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .steps {
            text-align: left;
            background: #f9fafb;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-top: 1.5rem;
          }
          .step {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem 0;
            color: #666;
            font-size: 0.875rem;
          }
          .step-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #667eea;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            flex-shrink: 0;
          }
          .troubleshoot {
            margin-top: 1.5rem;
            padding: 1rem;
            background: #fef3c7;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            color: #92400e;
          }
          .troubleshoot strong {
            display: block;
            margin-bottom: 0.5rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h1>Connecting to Your Calendar</h1>
          <p>Please wait while we connect to your calendar provider...</p>
          
          <div class="steps">
            <div class="step">
              <div class="step-icon">1</div>
              <div>Authorize access with your calendar provider</div>
            </div>
            <div class="step">
              <div class="step-icon">2</div>
              <div>Securely store your calendar connection</div>
            </div>
            <div class="step">
              <div class="step-icon">3</div>
              <div>Return to ProSpaces CRM</div>
            </div>
          </div>
          
          <div class="troubleshoot">
            <strong>Taking too long?</strong>
            Make sure you've completed the authorization process in the other window/tab. 
            If you closed it or encountered an error, you can close this window and try again.
          </div>
        </div>
        
        <script>
          console.log('[Nylas] Connecting page loaded');
          console.log('[Nylas] Window opener:', window.opener ? 'exists' : 'none');
          console.log('[Nylas] Current URL:', window.location.href);
          
          // Log every 5 seconds to help debug
          setInterval(() => {
            console.log('[Nylas] Still waiting for callback... Time elapsed:', Math.floor(Date.now() / 1000), 'seconds');
          }, 5000);
        </script>
      </body>
    </html>
    `,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
      },
    }
  );
});
