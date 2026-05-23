import React from 'react';

/**
 * Walks an assistant message body, finds any date reference that resolves to
 * an existing diary id, and replaces it with a tappable button. Everything
 * else is left as-is so paragraph spacing / line breaks survive.
 *
 * Patterns recognized (same set as extractCitedDates):
 *   - YYYY-M-D / YYYY-MM-DD
 *   - YYYY.M.D / YYYY.MM.DD
 *   - "YYYY년 M월 D일"
 *   - "M월 D일" (year inferred — uses any year present in the entry map)
 */
const DATE_PATTERN =
  /\d{4}-\d{1,2}-\d{1,2}|\d{4}\.\d{1,2}\.\d{1,2}|\d{4}년\s*\d{1,2}월\s*\d{1,2}일|(?<![\d년])\d{1,2}월\s*\d{1,2}일/g;

function toIso(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function matchToCandidates(matched: string, yearsInMap: Set<string>): string[] {
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(matched))) {
    return [toIso(m[1], m[2], m[3])];
  }
  if ((m = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(matched))) {
    return [toIso(m[1], m[2], m[3])];
  }
  if ((m = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/.exec(matched))) {
    return [toIso(m[1], m[2], m[3])];
  }
  if ((m = /^(\d{1,2})월\s*(\d{1,2})일$/.exec(matched))) {
    return [...yearsInMap].map((y) => toIso(y, m![1], m![2]));
  }
  return [];
}

export function renderContentWithDateLinks(
  content: string,
  dateToDiaryId: Map<string, string>,
  onTap: (diaryId: string) => void,
): React.ReactNode {
  if (dateToDiaryId.size === 0) return content;

  const yearsInMap = new Set<string>();
  for (const date of dateToDiaryId.keys()) yearsInMap.add(date.slice(0, 4));

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(DATE_PATTERN.source, DATE_PATTERN.flags);
  let m: RegExpExecArray | null;
  let keyCounter = 0;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) parts.push(content.slice(lastIndex, m.index));
    const matched = m[0];
    const candidates = matchToCandidates(matched, yearsInMap);
    const id = candidates.map((c) => dateToDiaryId.get(c)).find((x): x is string => !!x);
    if (id) {
      parts.push(
        <button
          key={`link-${keyCounter++}`}
          type="button"
          onClick={() => onTap(id)}
          className="text-peach-dark underline underline-offset-2 font-medium"
        >
          {matched}
        </button>,
      );
    } else {
      parts.push(matched);
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts;
}
