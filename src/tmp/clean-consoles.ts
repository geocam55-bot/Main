import { promises as fs } from 'fs';
import * as path from 'path';

async function removeConsoleLogs(dir: string) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.supabase', 'tmp', 'supabase/migrations'].includes(file)) {
        await removeConsoleLogs(fullPath);
      }
    } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      const content = await fs.readFile(fullPath, 'utf-8');
      if (content.includes('console.log') || content.includes('console.error') || content.includes('console.info') || content.includes('console.warn')) {
        const lines = content.split('\n');
        const newLines = lines.filter(line => !line.trim().startsWith('console.log') && !line.trim().startsWith('console.error') && !line.trim().startsWith('console.warn') && !line.trim().startsWith('console.info'));
        
        // Also strip inline consoles roughly
        const newContent = newLines.map(line => {
          if (line.includes('console.log') || line.includes('console.error') || line.includes('console.warn') || line.includes('console.info')) {
             return line.replace(/console\.(log|error|warn|info)\(.*?\);?/g, '');
          }
          return line;
        }).join('\n');

        if (content !== newContent) {
          await fs.writeFile(fullPath, newContent, 'utf-8');
        }
      }
    }
  }
}

removeConsoleLogs('.').catch(console.error);
