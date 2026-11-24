/**
 * Strips common Markdown formatting into clean single-line plain text for previews and tooltips.
 */
export function stripMarkdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?/g, '').replace(/```/g, ''))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/(^|[^\w])(\*|_)(?=\S)(.*?)(?<=\S)\2(?=$|[^\w])/g, '$1$3')
    .replace(/\s+/g, ' ')
    .trim();
}
