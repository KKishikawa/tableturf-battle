export type SearchCollectionItem = Record<string, unknown> & {
  id?: string | number;
};

export type SearchCollectionItemIdResolver<TItem extends SearchCollectionItem> = (
  item: TItem,
  index: number,
) => string | number;

export interface SearchCollectionRenderContext<TItem extends SearchCollectionItem> {
  itemId: string;
  index: number;
  selected: boolean;
  mode: string;
  emitAction(action: string, detail?: Record<string, unknown>): void;
}

export type SearchCollectionRenderer<TItem extends SearchCollectionItem> = (
  item: TItem,
  context: SearchCollectionRenderContext<TItem>,
) => Element | DocumentFragment;

export interface SearchCollectionStructure {
  root: HTMLElement;
  modeRoot?: HTMLElement;
  itemsRoot: HTMLElement;
  toolbarRoot?: HTMLElement;
}

export type SearchCollectionStructureRenderer = () => SearchCollectionStructure;

export interface SearchCollectionErrorDetail {
  code: 'missing-item-id' | 'duplicate-item-id' | 'invalid-structure' | 'renderer-error';
  message: string;
  cause?: unknown;
  itemId?: string;
  mode?: string;
}

export interface SearchCollectionRenderCompleteDetail {
  itemIds: string[];
}
