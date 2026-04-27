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

export interface ViewModePlugin {
  id: string;
  label: string;
  containerClass?: string;
  itemClass?: string;
  styles?: string | CSSStyleSheet;
  activate?(modeTarget: HTMLElement): void;
  deactivate?(modeTarget: HTMLElement): void;
}

export interface SearchCollectionModeChangeDetail {
  mode: string;
  previousMode: string | null;
}

export interface SearchState {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: string;
}

export interface SearchModelPlugin<TItem extends SearchCollectionItem> {
  initialState?: SearchState;
  match?(item: TItem, state: SearchState): boolean;
  compare?(a: TItem, b: TItem, state: SearchState): number;
}

export interface SearchUiContext<TItem extends SearchCollectionItem> {
  state: SearchState;
  setState(next: SearchState): void;
  items: TItem[];
}

export interface SearchUiPlugin<TItem extends SearchCollectionItem> {
  render(context: SearchUiContext<TItem>): Element;
  update?(root: Element, context: SearchUiContext<TItem>): void;
  destroy?(root: Element): void;
}

export interface SearchCollectionSearchStateChangeDetail {
  state: SearchState;
  previousState: SearchState;
}

export interface SearchCollectionErrorDetail {
  code:
    | 'missing-item-id'
    | 'duplicate-item-id'
    | 'unknown-mode'
    | 'duplicate-mode'
    | 'view-mode-error'
    | 'invalid-structure'
    | 'renderer-error'
    | 'search-error'
    | 'search-ui-error';
  message: string;
  cause?: unknown;
  itemId?: string;
  mode?: string;
}

export interface SearchCollectionRenderCompleteDetail {
  itemIds: string[];
}

export interface SearchCollectionItemActionDetail<TItem extends SearchCollectionItem> {
  itemId: string;
  item: TItem;
  action: string;
  detail?: Record<string, unknown>;
}

export interface SearchCollectionSelectionAttributeAdapter {
  selected: string;
  unselected: string | null;
}

export interface SearchCollectionSelectionChangeDetail {
  selectedItemIds: string[];
  previousSelectedItemIds: string[];
}
