/**
 * Preprocess claim text:
 * - Remove excessive whitespace
 * - Normalize newlines
 * - Remove page breaks, headers
 */

export function preprocess(text: string): string {
  let result = text;

  // Remove form feed and page break characters
  result = result.replace(/\f/g, '');

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n');
  result = result.replace(/\r/g, '\n');

  // Remove excessive blank lines (more than 2 consecutive newlines)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Trim each line
  result = result
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  return result.trim();
}
