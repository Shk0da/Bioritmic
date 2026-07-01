import { linkifyText } from './linkify-text.util';

describe('linkifyText', () => {
  it('should return plain text when no links', () => {
    expect(linkifyText('Привет, как дела?')).toEqual([
      { type: 'text', text: 'Привет, как дела?' },
    ]);
  });

  it('should linkify https URL', () => {
    expect(linkifyText('Смотри https://example.com/path')).toEqual([
      { type: 'text', text: 'Смотри ' },
      { type: 'link', text: 'https://example.com/path', href: 'https://example.com/path' },
    ]);
  });

  it('should linkify http URL', () => {
    expect(linkifyText('http://test.org')).toEqual([
      { type: 'link', text: 'http://test.org', href: 'http://test.org' },
    ]);
  });

  it('should keep trailing punctuation outside link', () => {
    expect(linkifyText('Сайт https://example.com.')).toEqual([
      { type: 'text', text: 'Сайт ' },
      { type: 'link', text: 'https://example.com', href: 'https://example.com' },
      { type: 'text', text: '.' },
    ]);
  });

  it('should handle multiple links', () => {
    expect(linkifyText('a https://one.com b http://two.org c')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'link', text: 'https://one.com', href: 'https://one.com' },
      { type: 'text', text: ' b ' },
      { type: 'link', text: 'http://two.org', href: 'http://two.org' },
      { type: 'text', text: ' c' },
    ]);
  });

  it('should return empty array for empty input', () => {
    expect(linkifyText('')).toEqual([]);
    expect(linkifyText(null)).toEqual([]);
  });

  it('should not linkify non-http schemes', () => {
    expect(linkifyText('ftp://example.com')).toEqual([
      { type: 'text', text: 'ftp://example.com' },
    ]);
  });
});
