/**
 * Extract @mentioned users from Tiptap editor HTML. Mentions render as
 * `<span data-mention-id="<userId>" data-mention="<label>">` (see
 * `components/Editor/mention.ts`). Deduped by id; returns [] outside the DOM.
 */
export function parseMentions(html: string): { id: string; label: string }[] {
  if (typeof DOMParser === "undefined" || !html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const seen = new Set<string>();
  const mentions: { id: string; label: string }[] = [];
  doc.querySelectorAll("span[data-mention-id]").forEach((el) => {
    const id = el.getAttribute("data-mention-id");
    if (!id || seen.has(id)) return;
    seen.add(id);
    mentions.push({ id, label: el.getAttribute("data-mention") ?? "" });
  });
  return mentions;
}
