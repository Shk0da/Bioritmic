export interface LinkifiedPart {
  type: 'text' | 'link';
  text: string;
  href?: string;
}

const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

export function linkifyText(input: string | null | undefined): LinkifiedPart[] {
  if (!input) {
    return [];
  }

  const parts: LinkifiedPart[] = [];
  let lastIndex = 0;
  const regex = new RegExp(HTTP_URL_PATTERN.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const rawUrl = match[0];
    const start = match.index;

    if (start > lastIndex) {
      parts.push({ type: 'text', text: input.slice(lastIndex, start) });
    }

    const { url, trailing } = splitTrailingPunctuation(rawUrl);
    if (url && isSafeHttpUrl(url)) {
      parts.push({ type: 'link', text: url, href: url });
    } else {
      parts.push({ type: 'text', text: rawUrl });
    }
    if (trailing) {
      parts.push({ type: 'text', text: trailing });
    }

    lastIndex = start + rawUrl.length;
  }

  if (lastIndex < input.length) {
    parts.push({ type: 'text', text: input.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', text: input }];
}

function splitTrailingPunctuation(url: string): { url: string; trailing: string } {
  let trimmed = url;
  let trailing = '';

  while (trimmed.length > 0) {
    const last = trimmed[trimmed.length - 1];
    if (last === ')' && countChar(trimmed, '(') < countChar(trimmed, ')')) {
      trailing = last + trailing;
      trimmed = trimmed.slice(0, -1);
      continue;
    }
    if ('.,;:!?'.includes(last)) {
      trailing = last + trailing;
      trimmed = trimmed.slice(0, -1);
      continue;
    }
    break;
  }

  return { url: trimmed, trailing };
}

function countChar(value: string, char: string): number {
  return value.split(char).length - 1;
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
