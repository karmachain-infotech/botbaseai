import type { Source } from "../../types/database";
import { getAdminClient } from "../supabase/admin";
import { extractFromFile, extractFromUrl, extractFromText, extractFromQa } from "./extractors";
import { handleServerError, NotFoundError, DatabaseError, ValidationError } from "../errors";

export async function trainSource(sourceId: string): Promise<void> {
  try {
    const supabase = getAdminClient();

    const { data: source, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (error) throw new DatabaseError(error.message);
    if (!source) throw new NotFoundError("Source");

    const s = source as unknown as Source;

    switch (s.type) {
      case "text":
        await extractFromText(s.chatbot_id, s.id, s.content);
        break;
      case "url":
        await extractFromUrl(s.chatbot_id, s.id, s.name);
        break;
      case "file":
        await handleFileSource(s);
        break;
      case "qa":
        let pairs: { question: string; answer: string }[];
        try {
          pairs = JSON.parse(s.content) as { question: string; answer: string }[];
        } catch {
          throw new ValidationError("QA content is not valid JSON");
        }
        await extractFromQa(s.chatbot_id, s.id, pairs);
        break;
    }
  } catch (error) {
    // Mark source as failed if training errors
    try {
      const supabase = getAdminClient();
      await supabase.from("sources").update({ status: "failed" }).eq("id", sourceId);
    } catch {}
    throw handleServerError(error, "trainSource");
  }
}

async function handleFileSource(source: Source): Promise<void> {
  const supabase = getAdminClient();

  const { data: fileData, error: dlError } = await supabase.storage
    .from("sources")
    .download(`${source.chatbot_id}/${source.id}/${source.name}`);

  if (dlError) throw new DatabaseError(`File download failed: ${dlError.message}`);
  if (!fileData) throw new NotFoundError("File");

  const buffer = await fileData.arrayBuffer();
  const ext = source.name.split(".").pop()?.toLowerCase() ?? "";

  let fileType = "text/plain";
  if (ext === "pdf") fileType = "application/pdf";
  else if (ext === "docx") fileType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  await extractFromFile(source.chatbot_id, source.id, source.name, buffer, fileType);
}
