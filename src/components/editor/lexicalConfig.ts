import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { type TextMatchTransformer, TRANSFORMERS, type Transformer } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $createImageNode, $isImageNode, ImageNode, isSafeImageSrc } from './ImageNode';
import { MentionNode } from './MentionNode';

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
  link: boolean;
  blockType: string;
}

export const INITIAL_ACTIVE_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
  link: false,
  blockType: 'paragraph',
};

export const LEXICAL_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  MentionNode,
  ImageNode,
];

export const IMAGE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) return null;
    return `![${node.getAltText()}](${node.getSrc()})`;
  },
  importRegExp: /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/,
  regExp: /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/,
  replace: (textNode, match) => {
    const altText = match[1] ?? '';
    const src = match[2] ?? '';
    if (!isSafeImageSrc(src)) return;
    const imageNode = $createImageNode(src, altText);
    textNode.replace(imageNode);
  },
  trigger: ')',
  type: 'text-match',
};

// Place IMAGE_TRANSFORMER before LINK so `![alt](url)` renders as an image instead of a link
export const MARKDOWN_TRANSFORMERS: Transformer[] = [IMAGE_TRANSFORMER, ...TRANSFORMERS];

export const EDITOR_THEME = {
  paragraph: 'lexical-paragraph',
  heading: {
    h1: 'lexical-h1',
    h2: 'lexical-h2',
    h3: 'lexical-h3',
  },
  quote: 'lexical-quote',
  list: {
    ul: 'lexical-ul',
    ol: 'lexical-ol',
    listitem: 'lexical-li',
    listitemChecked: 'lexical-li-checked',
    listitemUnchecked: 'lexical-li-unchecked',
    nested: {
      listitem: 'lexical-nested-li',
    },
  },
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    strikethrough: 'line-through',
    code: 'lexical-inline-code',
  },
  code: 'lexical-code-block',
  link: 'lexical-link',
};
