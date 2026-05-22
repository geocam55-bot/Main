import { describe, expect, it } from 'vitest';
import { getContrastIssues } from './ThemeEditor';

describe('getContrastIssues', () => {
  it('returns the exact conflicting color keys and values', () => {
    const issues = getContrastIssues({
      text: '#777777',
      background: '#888888',
      textSecondary: '#666666',
      textMuted: '#999999',
      cardText: '#777777',
      card: '#888888',
      primaryText: '#777777',
      primary: '#888888',
      secondaryText: '#777777',
      secondary: '#888888',
      accentText: '#777777',
      accent: '#888888',
      destructiveText: '#777777',
      destructive: '#888888',
      topBarText: '#777777',
      topBarBackground: '#888888',
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatchObject({
      fgKey: 'text',
      bgKey: 'background',
      fgColor: '#777777',
      bgColor: '#888888',
    });
  });
});
