import { $isLinkNode } from '@lexical/link';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { $getRoot, createEditor, type ElementNode, type LexicalNode } from 'lexical';
import { describe, expect, it } from 'vitest';
import { $isImageNode } from '../ImageNode';
import { LEXICAL_NODES, MARKDOWN_TRANSFORMERS } from '../lexicalConfig';

function collectNodes(node: LexicalNode, acc: LexicalNode[] = []): LexicalNode[] {
  acc.push(node);
  if ('getChildren' in node && typeof (node as ElementNode).getChildren === 'function') {
    for (const child of (node as ElementNode).getChildren()) {
      collectNodes(child, acc);
    }
  }
  return acc;
}

describe('Markdown image parsing in Lexical', () => {
  it('parses Trello markdown image syntax into ImageNode and round-trips cleanly', () => {
    const editor = createEditor({
      namespace: 'ImageMarkdownTest',
      nodes: LEXICAL_NODES,
      onError(err) {
        throw err;
      },
    });

    const md =
      '![image.webp](https://trello.com/1/cards/6af791e1af862edcb1300fd4/attachments/6b05f10b87e333de5e72757e/previews/6b05f10c87e333de5e727588/download/image.webp)';

    editor.update(
      () => {
        $convertFromMarkdownString(md, MARKDOWN_TRANSFORMERS);
      },
      { discrete: true },
    );

    editor.getEditorState().read(() => {
      const nodes = collectNodes($getRoot());
      const imageNodes = nodes.filter($isImageNode);
      const linkNodes = nodes.filter($isLinkNode);

      expect(imageNodes).toHaveLength(1);
      expect(linkNodes).toHaveLength(0);
      expect(imageNodes[0].getAltText()).toBe('image.webp');
      expect(imageNodes[0].getSrc()).toBe(
        'https://trello.com/1/cards/6af791e1af862edcb1300fd4/attachments/6b05f10b87e333de5e72757e/previews/6b05f10c87e333de5e727588/download/image.webp',
      );
      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe(md);
    });
  });

  it('still parses regular markdown links as LinkNode alongside images', () => {
    const editor = createEditor({
      namespace: 'ImageAndLinkMarkdownTest',
      nodes: LEXICAL_NODES,
      onError(err) {
        throw err;
      },
    });

    const md = 'See [docs](https://example.com) and ![shot](https://example.com/a.png)';

    editor.update(
      () => {
        $convertFromMarkdownString(md, MARKDOWN_TRANSFORMERS);
      },
      { discrete: true },
    );

    editor.getEditorState().read(() => {
      const nodes = collectNodes($getRoot());
      expect(nodes.filter($isLinkNode)).toHaveLength(1);
      expect(nodes.filter($isImageNode)).toHaveLength(1);
    });
  });
});
