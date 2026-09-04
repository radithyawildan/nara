export interface KnowledgePage {
  pageNumber: number | null;
  text: string;
}

export interface KnowledgeChunkInput {
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
}

function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findSafeEnd(text: string, start: number, proposedEnd: number) {
  if (proposedEnd >= text.length) {
    return text.length;
  }

  const searchStart = Math.max(start + 500, proposedEnd - 260);
  const slice = text.slice(searchStart, proposedEnd);
  const candidates = [
    slice.lastIndexOf("\n\n"),
    slice.lastIndexOf(". "),
    slice.lastIndexOf(" "),
  ];
  const best = Math.max(...candidates);

  return best >= 0 ? searchStart + best + 1 : proposedEnd;
}

export function chunkKnowledgePages(
  pages: KnowledgePage[],
  targetSize = 1400,
  overlap = 220,
) {
  const chunks: KnowledgeChunkInput[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = normalizeText(page.text);

    if (!text) {
      continue;
    }

    let start = 0;

    while (start < text.length) {
      const proposedEnd = Math.min(text.length, start + targetSize);
      const end = findSafeEnd(text, start, proposedEnd);
      const content = text.slice(start, end).trim();

      if (content) {
        chunks.push({
          chunkIndex,
          pageNumber: page.pageNumber,
          content,
        });
        chunkIndex += 1;
      }

      if (end >= text.length) {
        break;
      }

      const nextStart = Math.max(0, end - overlap);
      start = nextStart <= start ? end : nextStart;
    }
  }

  return chunks;
}
