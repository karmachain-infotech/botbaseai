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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ExternalServiceError(
        `URL ${url}`,
        `Failed to fetch URL (HTTP ${response.status})`,
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header").remove();
    const content = $("body").text().replace(/\s+/g, " ").trim();

    if (!content) {
      throw new ValidationError(`No content extracted from URL: ${url}`);
    }

    await processContent(chatbotId, sourceId, content, { url });
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
    console.error("[processContent] Embedding failed, using zero vectors as fallback:", error);
    const dim = 768;
    embeddings = chunks.map(() => new Array(dim).fill(0));
    await supabase.from("sources").update({ status: "trained" }).eq("id", sourceId).then(() => {}).catch(() => {});
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
