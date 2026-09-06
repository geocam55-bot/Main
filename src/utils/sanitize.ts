export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  let text = String(str);
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      if (doc && doc.documentElement && doc.documentElement.textContent !== null) {
        text = doc.documentElement.textContent;
      }
    } catch (e) {
      // fallback
    }
  }
  return text
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, ' ');
}

export function sanitizeItem(item: any): any {
  if (!item) return item;
  return {
    ...item,
    description: decodeHtmlEntities(item.description),
    name: decodeHtmlEntities(item.name),
    category: decodeHtmlEntities(item.category),
    mfgPartNumber: decodeHtmlEntities(item.mfgPartNumber),
  };
}
