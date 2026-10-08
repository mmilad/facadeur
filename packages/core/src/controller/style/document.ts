import { DocumentError } from '../../document/errors';
import type { StyleBlock, TokenInterface } from '../../schema/document';
import { collectTokenRefs } from './references/collect';
import type { ComponentToken } from './tokens/component/contract';
import type { DocumentStyleCommand, StyleControllerContext } from './types';

/** Live authored style view for one document; all edits use the project command executor. */
export class DocumentStyle {
  constructor(
    readonly id: string,
    private readonly context: StyleControllerContext,
  ) {}

  get styles() {
    return this.context.readDocument(this.id).styles;
  }

  get componentTokens() {
    return this.context.readDocument(this.id).componentTokens;
  }

  get tokenInterface() {
    return this.context.readDocument(this.id).tokenInterface;
  }

  get tokenReferences() {
    return collectTokenRefs(this.context.readDocument(this.id));
  }

  nodeStyle(nodeId: string) {
    const node = this.context.readDocument(this.id).nodes[nodeId];
    if (!node) throw new DocumentError('missing-node', `Node "${nodeId}" is not in the document`);
    return node.type === 'instance' ? undefined : node.style;
  }

  variantStyle(name: string) {
    const preset = this.context
      .readDocument(this.id)
      .variantPresets?.find((item) => item.name === name);
    return preset?.overrides?.styles;
  }

  update(command: DocumentStyleCommand) {
    return this.context.updateDocument(this.id, command);
  }

  setStyleBlock(style: StyleBlock | null) {
    return this.update({ type: 'setStyleBlock', style });
  }

  setNodeStyle(nodeId: string, property: string, value: string | null) {
    return this.update({ type: 'setStyle', nodeId, property, value });
  }

  setVariantStyleBlock(name: string, style: StyleBlock | null) {
    return this.update({ type: 'setVariantStyleBlock', name, style });
  }

  setTokenInterface(tokenInterface: TokenInterface | null) {
    return this.update({ type: 'setTokenInterface', tokenInterface });
  }

  setComponentToken(id: string, path: string, token: Omit<ComponentToken, 'path'>) {
    return this.update({ type: 'setComponentToken', id, path, token });
  }

  removeComponentToken(id: string) {
    return this.update({ type: 'removeComponentToken', id });
  }

  renameComponentTokenPath(id: string, path: string) {
    return this.update({ type: 'renameComponentTokenPath', id, path });
  }
}
