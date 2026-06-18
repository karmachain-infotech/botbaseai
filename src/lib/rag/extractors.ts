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

function normalizeUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    let path = u.pathname;
    if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
    if (path === "") path = "/";
    return `${u.protocol}//${u.hostname}${path}${u.search}`;
  } catch {
    return urlStr;
  }
}

const COMMON_PATHS = [
  "/about", "/about-us", "/about-us/",
  "/contact", "/contact-us", "/contact-us/",
  "/services", "/services/",
  "/team", "/our-team", "/team/",
  "/portfolio", "/work", "/portfolio/",
  "/projects", "/projects/",
  "/products", "/products/",
  "/pricing", "/pricing/",
  "/faq", "/faq/",
  "/blog", "/blog/",
  "/careers", "/careers/",
  "/testimonials", "/testimonials/",
  "/features", "/features/",
  "/solutions", "/solutions/",
];

export async function extractFromUrl(
  chatbotId: string,
  sourceId: string,
  url: string,
): Promise<void> {
  try {
    const cheerio = await import("cheerio");
    const baseUrl = new URL(url);
    const baseOrigin = baseUrl.origin;

    const visited = new Set<string>();
    const toVisit = new Set<string>();
    const pageContents: { url: string; title: string; content: string }[] = [];
    const maxPages = 15;

    toVisit.add(normalizeUrl(url));

    async function tryFetch(pageUrl: string): Promise<{ html: string; $: cheerio.CheerioAPI } | null> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(pageUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; BotbaseAI/1.0)" },
        });
        if (!response.ok) return null;
        const html = await response.text();
        return { html, $: cheerio.load(html) };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }

    // Try sitemap.xml first
    try {
      const sitemapResult = await tryFetch(`${baseOrigin}/sitemap.xml`);
      if (sitemapResult) {
        const urls: string[] = [];
        sitemapResult.$("url loc").each((_: number, el: cheerio.AnyNode) => {
          const loc = sitemapResult.$(el).text().trim();
          if (loc) urls.push(normalizeUrl(loc));
        });
        for (const u of urls) {
          if (visited.size + toVisit.size < maxPages * 2) {
            toVisit.add(u);
          }
        }
      }
    } catch {}

    // Add common paths as fallback
    for (const path of COMMON_PATHS) {
      if (visited.size + toVisit.size >= maxPages * 2) break;
      const pageUrl = normalizeUrl(`${baseOrigin}${path}`);
      toVisit.add(pageUrl);
    }

    while (toVisit.size > 0 && visited.size < maxPages) {
      const currentUrl = normalizeUrl(toVisit.values().next().value);
      toVisit.delete(currentUrl);
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      const result = await tryFetch(currentUrl);
      if (!result) continue;

      const { $ } = result;
      const title =
        $("title").first().text().trim() ||
        $("h1").first().text().trim() ||
        new URL(currentUrl).pathname;

      $("script, style, iframe, svg").remove();
      $("[hidden], [aria-hidden=true]").remove();
      $("body *").after(" ");
      let content = $("body").text().replace(/\s+/g, " ").trim();

      if (!content || content.length < 50) {
        const metaDesc = $("meta[name=description]").attr("content") || $("meta[property='og:description']").attr("content") || "";
        const keywords = $("meta[name=keywords]").attr("content") || "";
        const fallback = [title, metaDesc, keywords].filter(Boolean).join(" - ");
        if (fallback && (!content || content.length < fallback.length)) {
          content = fallback;
        }
      }

      if (content && content.length >= 10) {
        pageContents.push({ url: currentUrl, title, content });
      }

      // Discover more links if we still have room
      if (visited.size < maxPages) {
        const links: string[] = [];

        function addNormalizedLink(href: string) {
          if (!href) return;
          if (href.startsWith("javascript:") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
          try {
            const resolved = new URL(href, currentUrl);
            const normalized = normalizeUrl(resolved.href);
            if (
              (resolved.origin === baseOrigin || resolved.hostname.replace(/^www\./, "") === baseUrl.hostname.replace(/^www\./, "")) &&
              resolved.protocol.startsWith("http") &&
              !visited.has(normalized) &&
              !toVisit.has(normalized) &&
              !normalized.match(/\.(pdf|zip|png|jpg|jpeg|gif|svg|mp4|mp3|avi|doc|docx|xls|xlsx)$/i) &&
              !normalized.includes("#")
            ) {
              links.push(normalized);
            }
          } catch {}
        }

        // Extract from <a> tags
        $("a").each((_: number, el: cheerio.AnyNode) => {
          addNormalizedLink($(el).attr("href"));
        });

        // Extract from buttons: data-href, data-url, data-link attributes
        $("button, [role=button]").each((_: number, el: cheerio.AnyNode) => {
          const dataHref = $(el).attr("data-href") || $(el).attr("data-url") || $(el).attr("data-link");
          addNormalizedLink(dataHref);
          // Parse onclick for location navigation
          const onclick = $(el).attr("onclick");
          if (onclick) {
            const match = onclick.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
            if (match) addNormalizedLink(match[1]);
          }
        });

        for (const link of links) {
          if (toVisit.size < maxPages * 2) toVisit.add(link);
        }
      }
    }

    if (pageContents.length === 0) {
      throw new ValidationError(
        `No content could be extracted from: ${url}. This usually happens with JavaScript-rendered sites (React, Vue, etc.). Try adding the site content manually using the "Text" source type instead.`
      );
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
