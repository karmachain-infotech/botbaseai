const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 30;

export function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");
    chunks.push(chunk);
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}
