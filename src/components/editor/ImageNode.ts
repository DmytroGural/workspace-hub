import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';

export type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
  },
  SerializedLexicalNode
>;

const SAFE_IMAGE_SRC_RE = /^(https?:\/\/|blob:|data:image\/)/i;

export function isSafeImageSrc(src: string): boolean {
  return SAFE_IMAGE_SRC_RE.test(src.trim());
}

function convertImageElement(domNode: Node): DOMConversionOutput | null {
  if (domNode instanceof HTMLImageElement && isSafeImageSrc(domNode.src)) {
    return { node: $createImageNode(domNode.src, domNode.alt || '') };
  }
  return null;
}

export class ImageNode extends DecoratorNode<null> {
  __src: string;
  __altText: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode(serializedNode.src, serializedNode.altText);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(src: string, altText = '', key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      src: this.__src,
      altText: this.__altText,
      type: 'image',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement('img');
    img.setAttribute('src', this.__src);
    img.setAttribute('alt', this.__altText);
    return { element: img };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'lexical-image-wrap';
    wrapper.contentEditable = 'false';

    const img = document.createElement('img');
    img.src = this.__src;
    img.alt = this.__altText;
    img.title = this.__altText || 'Open image in new tab';
    img.loading = 'lazy';
    img.className = 'lexical-image';
    img.dataset.imageSrc = this.__src;

    wrapper.appendChild(img);
    return wrapper;
  }

  updateDOM(prevNode: ImageNode, dom: HTMLElement): boolean {
    if (prevNode.__src !== this.__src || prevNode.__altText !== this.__altText) {
      const img = dom.querySelector('img');
      if (img) {
        img.src = this.__src;
        img.alt = this.__altText;
        img.title = this.__altText || 'Open image in new tab';
        img.dataset.imageSrc = this.__src;
      }
    }
    return false;
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return `![${this.__altText}](${this.__src})`;
  }

  decorate(): null {
    return null;
  }
}

export function $createImageNode(src: string, altText = ''): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
