// Utilities for chunking large files for background jobs

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  // Split array into chunks
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}
