/**
 * Safely copy text to clipboard with fallback methods
 * Handles cases where Clipboard API is blocked by permissions policy
 * Uses the most reliable method first (execCommand) to avoid errors
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Try execCommand with hidden textarea (most reliable, works in iframes)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    
    // Focus and select
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (successful) {
      return true;
    }
  } catch (err) {
    // execCommand copy failed, trying Clipboard API
  }

  // Method 2: Try modern Clipboard API (might be blocked by permissions policy)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // Silently fail - this is expected in iframes and certain contexts
  }

  // Method 3: iOS Safari fallback
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    textarea.contentEditable = 'true';
    textarea.readOnly = false;
    document.body.appendChild(textarea);
    
    // iOS requires a range
    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      textarea.setSelectionRange(0, text.length);
    }
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (successful) {
      return true;
    }
  } catch (err) {
    // iOS fallback failed
  }

  // All methods failed
  return false;
}