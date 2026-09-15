import type { IBoard, IColumn, ITask } from "@/types";

/**
 * Client-side board search (JAV-35).
 *
 * Pure module — no React. Searches the board already loaded in the store
 * across titles, ticket ids, descriptions, label names and column names,
 * with typo tolerance ("palete" finds "Palette") and best-first ranking.
 */

const MAX_RESULTS = 40;

const FIELD_WEIGHTS = {
  title: 3.2,
  ticket: 2.6,
  description: 1.5,
  labels: 1.1,
  column: 0.7,
} as const;

const PHRASE_IN_TITLE_BONUS = 2.4;
const TITLE_STARTS_WITH_BONUS = 0.8;
const DONE_PENALTY = 0.6;

const DONE_COLUMN_NAMES = new Set(["done", "completed", "complete", "closed", "finished"]);

interface ISearchResult {
  task: ITask;
  column: IColumn;
  score: number;
  /** "description" when the card matched only through its description — drives the excerpt row. */
  matchedField: "title" | "description";
}

interface ISegment {
  text: string;
  hit: boolean;
}

/** The board has no per-task done flag — a card is "completed" when it sits in a done-style column. */
function isDoneColumn(name: string): boolean {
  return DONE_COLUMN_NAMES.has(name.trim().toLowerCase());
}

/**
 * Tiptap descriptions are stored as HTML — reduce to plain text for matching
 * and excerpts. This is not sanitization (segments render as plain text via
 * React); it only needs to be good enough for search.
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
}

/**
 * Score one query token against one word: exact > prefix > substring, else an
 * in-order subsequence contained in the word ("invite" hits "invitation",
 * "palete" hits "palette") — rejected when too loose to be a real near-miss.
 */
function wordScore(token: string, word: string): number {
  if (!token || !word) return 0;
  if (word === token) return 1;
  if (word.startsWith(token)) return 0.92;
  if (word.includes(token)) return 0.8;
  if (word.length < token.length) return 0;

  let tokenIndex = 0;
  let first = -1;
  let last = -1;
  for (let k = 0; k < word.length && tokenIndex < token.length; k++) {
    if (word[k] === token[tokenIndex]) {
      if (first < 0) first = k;
      last = k;
      tokenIndex++;
    }
  }
  if (tokenIndex < token.length) return 0;

  const span = last - first + 1 || 1;
  const tight = token.length / span; // 1 = contiguous
  const covered = token.length / word.length; // how much of the word the token explains
  if (tight < 0.6 || covered < 0.45) return 0; // too loose to be a real near-miss
  return 0.42 + 0.3 * tight;
}

/** Best score for a token across a whole field: phrase hit first, else best single word. */
function tokenScore(token: string, text: string): number {
  if (!token || !text) return 0;
  const at = text.indexOf(token);
  if (at === 0) return 1;
  if (at > 0) return text[at - 1] === " " ? 0.94 : 0.82;
  let best = 0;
  for (const word of text.split(/[^a-z0-9]+/)) {
    if (word) best = Math.max(best, wordScore(token, word));
  }
  return best;
}

interface ISearchDoc {
  task: ITask;
  column: IColumn;
  title: string;
  ticket: string;
  description: string;
  labels: string;
  columnName: string;
  columnIsDone: boolean;
}

// Stripping/lowercasing every card is the expensive part of a query; cache the
// searchable docs per board snapshot. The store replaces `kanbanBoard`
// wholesale on every change (new objects, never mutation), so WeakMap identity
// keying is exact and old snapshots are garbage-collected with their docs.
const searchDocsCache = new WeakMap<IBoard, ISearchDoc[]>();

function getSearchDocs(board: IBoard): ISearchDoc[] {
  const cached = searchDocsCache.get(board);
  if (cached) return cached;

  const docs: ISearchDoc[] = [];
  for (const column of board.columns) {
    const columnName = column.name.toLowerCase();
    const columnIsDone = isDoneColumn(column.name);
    for (const task of column.tasks) {
      docs.push({
        task,
        column,
        title: task.title.toLowerCase(),
        ticket: task.ticket_id.toLowerCase(),
        description: stripHtml(task.description).toLowerCase(),
        labels: task.labels.map((label) => label.name).join(" ").toLowerCase(),
        columnName,
        columnIsDone,
      });
    }
  }
  searchDocsCache.set(board, docs);
  return docs;
}

/** Search every card on the board. Every token must match somewhere; results come back best first. */
function searchTasks(board: IBoard, query: string): ISearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = tokenize(q);

  const scored: ISearchResult[] = [];
  for (const doc of getSearchDocs(board)) {
    let total = 0;
    let everyTokenMatched = true;
    let matchedField: ISearchResult["matchedField"] = "title";

    for (const token of tokens) {
      const titleScore = tokenScore(token, doc.title) * FIELD_WEIGHTS.title;
      const ticketScore = tokenScore(token, doc.ticket) * FIELD_WEIGHTS.ticket;
      const descriptionScore = tokenScore(token, doc.description) * FIELD_WEIGHTS.description;
      const labelScore = tokenScore(token, doc.labels) * FIELD_WEIGHTS.labels;
      const columnScore = tokenScore(token, doc.columnName) * FIELD_WEIGHTS.column;
      const best = Math.max(titleScore, ticketScore, descriptionScore, labelScore, columnScore);
      if (best <= 0) {
        everyTokenMatched = false;
        break;
      }
      if (best === descriptionScore && titleScore <= 0) matchedField = "description";
      total += best;
    }
    if (!everyTokenMatched) continue;

    if (doc.title.includes(q)) total += PHRASE_IN_TITLE_BONUS;
    if (tokens[0] && doc.title.startsWith(tokens[0])) total += TITLE_STARTS_WITH_BONUS;
    if (doc.columnIsDone) total -= DONE_PENALTY;

    scored.push({ task: doc.task, column: doc.column, score: total, matchedField });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
}

/** Split text into segments for highlighting. Near-miss tokens highlight the whole matched word, never scattered letters. */
function segments(text: string, query: string): ISegment[] {
  const q = query.trim().toLowerCase();
  const tokens = tokenize(q);
  if (!tokens.length) return [{ text, hit: false }];

  const low = text.toLowerCase();
  const marks = new Array<boolean>(text.length).fill(false);
  const mark = (from: number, to: number) => {
    for (let i = from; i < to; i++) marks[i] = true;
  };

  const phraseAt = low.indexOf(q);
  if (phraseAt >= 0) mark(phraseAt, phraseAt + q.length);

  for (const token of tokens) {
    let from = 0;
    let at = low.indexOf(token, from);
    while (at >= 0) {
      mark(at, at + token.length);
      from = at + token.length;
      at = low.indexOf(token, from);
    }
    if (low.indexOf(token) < 0) {
      const wordRe = /[a-z0-9]+/g;
      let match = wordRe.exec(low);
      while (match !== null) {
        if (wordScore(token, match[0]) > 0) mark(match.index, match.index + match[0].length);
        match = wordRe.exec(low);
      }
    }
  }

  const result: ISegment[] = [];
  let current: ISegment | null = null;
  for (let i = 0; i < text.length; i++) {
    if (!current || current.hit !== marks[i]) {
      current = { text: text[i], hit: marks[i] };
      result.push(current);
    } else {
      current.text += text[i];
    }
  }
  return result;
}

type SearchPhase = "idle" | "searching" | "error" | "results" | "empty";

interface ISearchPhaseInput {
  query: string;
  deferredQuery: string;
  resultCount: number;
  failed: boolean;
}

/**
 * Which body the search overlay shows. While the deferred query lags the typed
 * query, whichever settled body is on screen stays there — results, the
 * no-match message (it names the deferred query it actually searched), or the
 * error card. Swapping bodies per keystroke flashes the panel; the input-row
 * spinner is what signals the catch-up. Only the first keystroke coming from
 * idle shows the "Searching…" body, because there is nothing settled to keep.
 */
function searchPhase({ query, deferredQuery, resultCount, failed }: ISearchPhaseInput): SearchPhase {
  const trimmed = query.trim();
  if (!trimmed) return "idle";
  const deferredTrimmed = deferredQuery.trim();
  if (trimmed !== deferredTrimmed && !deferredTrimmed) return "searching";
  if (failed) return "error";
  return resultCount > 0 ? "results" : "empty";
}

/** Short plain-text excerpt of the description around the first matching token. */
function snippet(descriptionHtml: string, query: string): string {
  const plain = stripHtml(descriptionHtml);
  if (!plain) return "";

  const tokens = tokenize(query);
  const low = plain.toLowerCase();
  let at = -1;
  for (const token of tokens) {
    if (at < 0) at = low.indexOf(token);
  }
  if (at < 0) return plain.length > 128 ? `${plain.slice(0, 128)}…` : plain;

  const start = Math.max(0, at - 42);
  const end = Math.min(plain.length, at + 96);
  return (start > 0 ? "…" : "") + plain.slice(start, end).trim() + (end < plain.length ? "…" : "");
}

export { isDoneColumn, searchPhase, searchTasks, segments, snippet, stripHtml };
export type { ISearchPhaseInput, ISearchResult, ISegment, SearchPhase };
