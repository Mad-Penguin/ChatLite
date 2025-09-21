export function shapeReactions(raw, myUserId) {
  const counts = {};
  const my = [];
  for (const r of raw || []) {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    if (r.userId === myUserId) my.push(r.emoji);
  }
  return { counts, myReactions: my };
}
