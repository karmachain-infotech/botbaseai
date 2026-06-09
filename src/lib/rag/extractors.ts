import { getAdminClient } from "../supabase/admin";
import { chunkText } from "./chunker";
import { createEmbeddings } from "./embeddings";
import { handleServerError, DatabaseError, ExternalServiceError, ValidationError } from "../errors";

export async function extractFromFile(
  chatbotId: string,
  sourceId: string,
  fileName: string,
  buffer: ArrayBuffer,
  fileType: string,
): Promise<void> {
  try {
    let content = "";

    if (fileType === "application/pdf") {
      const pdfParse = await import("pdf-parse");
      const pdfData = await pdfParse.default(Buffer.from(buffer));
      content = pdfData.text;
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      content = result.value;
    } else {
      content = new TextDecoder().decode(buffer);
    }

    await processContent(chatbotId, sourceId, content, { fileName });
  } catch (error) {
    throw handleServerError(error, "extractFromFile");
  }
}

export async function extractFromUrl(
  chatbotId: string,
  sourceId: string,
  url: string,
): Promise<void> {
  try {
    const cheerio = await import("cheerio");
    const baseUrl = new URL(url);

    const visited = new Set<string>();
    const toVisit = [url];
    const pageContents: { url: string; title: string; content: string }[] = [];
    const maxPages = 15;

    while (toVisit.length > 0 && visited.size < maxPages) {
      const currentUrl = toVisit.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let response;
      try {
        response = await fetch(currentUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; BotbaseAI/1.0)" },
        });
      } catch {
        clearTimeout(timeout);
        continue;
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      const title =
        $("title").first().text().trim() ||
        $("h1").first().text().trim() ||
        new URL(currentUrl).pathname;

      $("script, style, noscript, iframe, svg").remove();
      $("[hidden], [aria-hidden=true]").remove();
      $("body *").after(" ");
      const content = $("body").text().replace(/\s+/g, " ").trim();

      if (content) {
        pageContents.push({ url: currentUrl, title, content });
      }

      if (visited.size < maxPages) {
        const links: string[] = [];
        $("a[href]").each((_: number, el: cheerio.AnyNode) => {
          const href = $(el).attr("href");
          if (!href) return;
          try {
            const resolved = new URL(href, currentUrl);
            if (
              resolved.origin === baseUrl.origin &&
              resolved.protocol.startsWith("http") &&
              !visited.has(resolved.href) &&
              !toVisit.includes(resolved.href) &&
              !resolved.href.match(/\.(pdf|zip|png|jpg|jpeg|gif|svg|mp4|mp3|avi)$/i) &&
              !resolved.href.includes("#")
            ) {
              links.push(resolved.href);
            }
          } catch {}
        });
        toVisit.push(...links);
      }
    }

    if (pageContents.length === 0) {
      throw new ValidationError(`No content could be extracted from: ${url}`);
    }

    const combined = pageContents
      .map(
        (p, i) =>
          `--- PAGE ${i + 1}: ${p.title} ---\nURL: ${p.url}\n\n${p.content}`,
      )
      .join("\n\n");

    await processContent(chatbotId, sourceId, combined, {
      url,
      pagesCrawled: pageContents.length,
      urls: pageContents.map((p) => p.url),
    });
  } catch (error) {
    throw handleServerError(error, "extractFromUrl");
  }
}

export async function extractFromText(
  chatbotId: string,
  sourceId: string,
  text: string,
): Promise<void> {
  try {
    if (!text.trim()) {
      throw new ValidationError("Text content is empty");
    }
    await processContent(chatbotId, sourceId, text, { source: "manual" });
  } catch (error) {
    throw handleServerError(error, "extractFromText");
  }
}

export async function extractFromQa(
  chatbotId: string,
  sourceId: string,
  pairs: { question: string; answer: string }[],
): Promise<void> {
  try {
    if (pairs.length === 0) {
      throw new ValidationError("QA content must have at least one Q&A pair");
    }
    const content = pairs.map((p) => `Q: ${p.question}\nA: ${p.answer}`).join("\n\n");
    await processContent(chatbotId, sourceId, content, { source: "qa" });
  } catch (error) {
    throw handleServerError(error, "extractFromQa");
  }
}

async function processContent(
  chatbotId: string,
  sourceId: string,
  content: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const supabase = getAdminClient();

  const { error: updateErr } = await supabase
    .from("sources")
    .update({ content, status: "processing" })
    .eq("id", sourceId);

  if (updateErr) throw new DatabaseError(updateErr.message);

  const chunks = chunkText(content);

  let embeddings: number[][];
  try {
    embeddings = await createEmbeddings(chunks);
  } catch (error) {
    console.error("[processContent] Embedding failed:", error);
    throw error;
  }

  const rows = chunks.map((chunk, i) => ({
    chatbot_id: chatbotId,
    source_id: sourceId,
    content: chunk,
    embedding: embeddings[i],
    metadata: { ...metadata, chunkIndex: i },
  }));

  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const { error: insertErr } = await supabase.from("embeddings").insert(batch);
    if (insertErr) {
      console.error(`[processContent] Batch insert failed at index ${i}:`, insertErr.message);
      throw new DatabaseError(insertErr.message);
    }
  }

  const { error: trainedErr } = await supabase
    .from("sources")
    .update({ status: "trained" })
    .eq("id", sourceId);

  if (trainedErr) {
    console.error("[processContent] Failed to mark source as trained:", trainedErr.message);
  }
}
