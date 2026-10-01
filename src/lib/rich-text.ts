import { StatusCategory } from "@/generated/prisma/enums";
import { z } from "zod";

/**
 * The rich-text document format, and the four operations the server performs on
 * one it did not write.
 *
 * **No `server-only`.** The editor in `src/components/editor/` imports the same
 * schema and the same `parseDocument`, which is the point: one definition of
 * what a document is, so the thing the client builds and the thing the server
 * validates cannot drift. There are no secrets here.
 *
 * ## Why JSON in the column and a second column for the text
 *
 * Phase 2.5 shipped `task.search_vector` as a `GENERATED ALWAYS` tsvector over
 * `title` and `description`. Pointing rich content at that column unchanged
 * would index `paragraph`, `bulletList` and `doc` — the search box would match
 * documents by their node names. So `description` holds the document and
 * `description_text` holds what this module derives from it, and the generated
 * column reads the latter. `Comment` carries the same pair for the same reason,
 * even though comments are not searched yet: the shape is one decision, not two.
 *
 * ## Why the server re-derives everything
 *
 * `extractMentionIds` decides who gets notified and `rewriteMentions` decides
 * what a reader is told a mention says. Both run over a document the client
 * wrote, and neither trusts a word of it: the id is looked up, the label is
 * replaced with the one the database holds, and an id that does not resolve
 * stops being a mention at all. A client that never sends a mentions array
 * cannot forge one — see `comment.service.ts`, which accepts no such field.
 */

/** A ProseMirror node, as TipTap serializes it. */
export type RichTextNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichTextNode[];
};

export type RichTextDocument = {
  type: "doc";
  content?: RichTextNode[];
};

/** The node type TipTap's mention extension emits. */
export const MENTION_NODE = "mention";

/**
 * 50 000 serialized characters — roughly eight pages of prose once the JSON
 * overhead is taken off. Checked **before** `JSON.parse`, so a hostile payload
 * is rejected by its length rather than by the memory it would take to parse.
 */
export const MAX_RICH_TEXT_CHARS = 50_000;

/**
 * 40 levels. Deep enough that no human document reaches it — a blockquote
 * inside a list inside a table is about six — and shallow enough that the
 * recursive walkers below cannot exhaust the stack. Measured iteratively, so
 * checking the depth is not itself a recursion into a hostile document.
 */
const MAX_DEPTH = 40;

const markSchema = z.object({
  type: z.string().min(1).max(64),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

const nodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1).max(64),
    text: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z.array(markSchema).optional(),
    content: z.array(nodeSchema).optional(),
  }),
);

const documentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(nodeSchema).optional(),
});

/**
 * Depth, without recursing.
 *
 * An explicit stack rather than a recursive helper: this function's whole job
 * is to be safe against a document deep enough to overflow one, and a recursive
 * implementation would blow up on exactly the input it exists to reject.
 */
function exceedsMaxDepth(root: RichTextDocument): boolean {
  const stack: { node: RichTextNode; depth: number }[] = (
    root.content ?? []
  ).map((node) => ({ node, depth: 1 }));

  while (stack.length > 0) {
    const { node, depth } = stack.pop() as (typeof stack)[number];
    if (depth > MAX_DEPTH) return true;
    for (const child of node.content ?? []) {
      stack.push({ node: child, depth: depth + 1 });
    }
  }

  return false;
}

/** A document holding one paragraph of the given text, or an empty document. */
export function plainTextDocument(value: string): RichTextDocument {
  const text = value.trim();
  if (!text) return { type: "doc", content: [] };
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

/**
 * A stored value, as a document.
 *
 * Three inputs, one output. A serialized document parses. **Anything else is
 * treated as plain text** — including valid JSON that is not a document —
 * because two of the three cases are real: every `task.description` written
 * before this phase is plain text, and so is anything a fork wrote after
 * branching from a pre-Phase-3 commit. Throwing would make those rows
 * unreadable and unfixable through the UI that renders them.
 */
export function parseDocument(
  value: string | null | undefined,
): RichTextDocument | null {
  if (value === null || value === undefined) return null;
  if (value.trim() === "") return null;

  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return plainTextDocument(value);
  }

  const result = documentSchema.safeParse(raw);
  if (!result.success) return plainTextDocument(value);
  if (exceedsMaxDepth(result.data)) return plainTextDocument(value);

  return result.data;
}

export function serializeDocument(doc: RichTextDocument): string {
  return JSON.stringify(doc);
}

/**
 * What a router accepts for a rich-text field.
 *
 * A bounded string that either is a document or is plain text — both are legal,
 * and a client with no editor (a script, a future API consumer) sends the
 * latter. What it refuses is a payload too large to parse and a document nested
 * past `MAX_DEPTH`; the service parses it again through `parseDocument` and is
 * therefore safe when called directly from a test.
 */
export const richTextInput = z
  .string()
  .max(
    MAX_RICH_TEXT_CHARS,
    `That is longer than ${MAX_RICH_TEXT_CHARS.toLocaleString()} characters`,
  )
  .refine((value) => {
    if (value.trim() === "") return true;
    let raw: unknown;
    try {
      raw = JSON.parse(value);
    } catch {
      return true; // Plain text.
    }
    const result = documentSchema.safeParse(raw);
    if (!result.success) return true; // Not a document; plain text.
    return !exceedsMaxDepth(result.data);
  }, "That document is nested too deeply");

/**
 * Block-level node types, for the one thing plain text needs to know about
 * structure: where a line ends.
 *
 * A allow-list rather than "anything with children", because a `paragraph`
 * containing three `text` runs is one line and a `bulletList` containing three
 * `listItem`s is three. Anything unknown is treated as inline, which merges
 * rather than splits — the safer failure for a search index.
 */
const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "tableRow",
]);

function nodeText(node: RichTextNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === MENTION_NODE) {
    const label = node.attrs?.label;
    return typeof label === "string" ? `@${label}` : "";
  }
  if (node.type === "hardBreak") return "\n";

  const inner = (node.content ?? []).map(nodeText).join("");
  return BLOCK_NODES.has(node.type) ? `${inner}\n` : inner;
}

/**
 * The plain text a document says.
 *
 * Feeds the `tsvector`, the notification excerpt, and the email body. Empty
 * blocks collapse: a document with three blank paragraphs between two sentences
 * is two lines, not five, and an index that carried the blanks would rank on
 * whitespace.
 */
export function toPlainText(doc: RichTextDocument | null): string {
  if (!doc) return "";
  return (doc.content ?? [])
    .map(nodeText)
    .join("")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
}

export function isEmptyDocument(doc: RichTextDocument | null): boolean {
  return toPlainText(doc) === "";
}

/**
 * Every distinct member id the document mentions, in the order they appear.
 *
 * A mention node with no string id is skipped rather than rejected: it is
 * malformed content, not an attack, and refusing the whole save would lose a
 * comment someone typed over one broken pill.
 */
export function extractMentionIds(doc: RichTextDocument | null): string[] {
  if (!doc) return [];

  const found: string[] = [];
  const seen = new Set<string>();

  const walk = (nodes: RichTextNode[]) => {
    for (const node of nodes) {
      if (node.type === MENTION_NODE) {
        const id = node.attrs?.id;
        if (typeof id === "string" && id !== "" && !seen.has(id)) {
          seen.add(id);
          found.push(id);
        }
      }
      if (node.content) walk(node.content);
    }
  };

  walk(doc.content ?? []);
  return found;
}

/**
 * Make every mention in the document agree with the database.
 *
 * `resolved` maps member id → the name that member actually has, and is built
 * by `mention.service.ts` from rows it read under `ctx.orgId` and the project
 * visibility rule. Two things happen here, and both are security properties
 * rather than formatting:
 *
 * - A **resolved** mention has its label overwritten. A document claiming
 *   `{ id: <someone>, label: "Ada" }` renders as whoever `<someone>` is, so the
 *   name a reader sees is always the person who was notified.
 * - An **unresolved** mention is demoted to plain text. Unresolved means the id
 *   was foreign, deleted, or belongs to someone who cannot see this task — and
 *   in the last case leaving a live pill would tell the room that a person who
 *   was deliberately not notified had been.
 *
 * Returns a new document; the input is not mutated, so a caller can compare.
 */
export function rewriteMentions(
  doc: RichTextDocument,
  resolved: Map<string, string>,
): RichTextDocument {
  const mapNode = (node: RichTextNode): RichTextNode => {
    if (node.type === MENTION_NODE) {
      const id = node.attrs?.id;
      const label = typeof id === "string" ? resolved.get(id) : undefined;

      if (label === undefined) {
        const claimed = node.attrs?.label;
        const shown = typeof claimed === "string" ? claimed : "unknown";
        return { type: "text", text: `@${shown}` };
      }

      return { ...node, attrs: { ...node.attrs, id, label } };
    }

    if (!node.content) return node;
    return { ...node, content: node.content.map(mapNode) };
  };

  return { ...doc, content: (doc.content ?? []).map(mapNode) };
}

/**
 * A one-line summary for a notification row or an email subject.
 *
 * Cuts on a word boundary where there is one within the limit, because a cut
 * mid-word reads as a rendering bug. Newlines are flattened to spaces: this
 * renders on one line, and a raw newline would show as a gap.
 */
export function excerpt(value: string, max: number): string {
  const flat = value.replace(/\s+/gu, " ").trim();
  if (flat.length <= max) return flat;

  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${body.trimEnd()}…`;
}

export function isDoneCategory(category: StatusCategory): boolean {
  return category === StatusCategory.DONE;
}