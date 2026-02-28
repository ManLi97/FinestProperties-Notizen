// Purpose: Search and rank NoteDoc descriptions with a tiny scoring model.
// Contract: scoreDocs() is pure and returns a new sorted array.
// Verify: Query terms in descriptions rank higher, then newer createdAt wins.

export function normalizeQuery(query) {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreDocs(docs, query) {
  const terms = normalizeQuery(query);
  if (terms.length === 0) {
    return [];
  }

  const scored = docs.map((doc) => {
    const text = (doc.description || "").toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (text.includes(term)) {
        score += 2;
      }
    }
    return { doc, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.doc.createdAt - a.doc.createdAt)
    .map((item) => item.doc);
}
