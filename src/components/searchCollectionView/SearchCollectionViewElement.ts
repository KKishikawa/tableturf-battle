import type {
  SearchCollectionItem,
  SearchCollectionItemIdResolver,
  SearchCollectionErrorDetail,
  SearchCollectionRenderContext,
  SearchCollectionRenderer,
  SearchCollectionStructure,
  SearchCollectionStructureRenderer,
  ViewModePlugin,
} from './types';

export class SearchCollectionViewElement<
  TItem extends SearchCollectionItem = SearchCollectionItem,
> extends HTMLElement {
  static get observedAttributes() {
    return ['mode'];
  }

  private _items: TItem[] = [];
  private _renderer: SearchCollectionRenderer<TItem> | null = null;
  private _getItemId: SearchCollectionItemIdResolver<TItem> | null = null;
  private _structure: SearchCollectionStructureRenderer | null = null;
  private mountedStructure: SearchCollectionStructure | null = null;
  private registeredViewModes: ViewModePlugin[] = [];
  private activeMode: string | null = null;
  private syncingModeAttribute = false;
  private hasReceivedItems = false;

  get items() {
    return this._items;
  }

  set items(items: TItem[]) {
    this.setItems(items);
  }

  get renderer() {
    return this._renderer;
  }

  set renderer(renderer: SearchCollectionRenderer<TItem> | null) {
    this._renderer = renderer;
    if (this.hasReceivedItems || this.mountedStructure) this.render();
  }

  get getItemId() {
    return this._getItemId;
  }

  set getItemId(getItemId: SearchCollectionItemIdResolver<TItem> | null) {
    this._getItemId = getItemId;
    if (this.hasReceivedItems || this.mountedStructure) this.render();
  }

  get structure() {
    return this._structure;
  }

  set structure(structure: SearchCollectionStructureRenderer | null) {
    if (this.mountedStructure) {
      this.dispatchComponentError({
        code: 'invalid-structure',
        message: 'Cannot change structure after it has been mounted.',
      });
      return;
    }
    this._structure = structure;
  }

  get viewModes(): readonly ViewModePlugin[] {
    return Object.freeze([...this.registeredViewModes]);
  }

  get mode() {
    return this.activeMode ?? '';
  }

  set mode(mode: string) {
    this.setMode(mode);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name !== 'mode' || oldValue === newValue || this.syncingModeAttribute) return;
    this.setMode(newValue ?? '');
  }

  registerViewMode(plugin: ViewModePlugin) {
    if (this.registeredViewModes.some((viewMode) => viewMode.id === plugin.id)) {
      this.dispatchComponentError({
        code: 'duplicate-mode',
        message: `Duplicate view mode "${plugin.id}".`,
        mode: plugin.id,
      });
      return;
    }

    this.registeredViewModes.push(plugin);
  }

  setItems(items: TItem[]) {
    const itemIds = this.resolveItemIds(items);
    if (!itemIds) return;
    this.hasReceivedItems = true;
    this._items = items;
    this.render(itemIds);
  }

  private ensureStructure() {
    if (this.mountedStructure) return this.mountedStructure;

    if (this._structure) {
      let customStructure: unknown;
      try {
        customStructure = this._structure();
      } catch (cause) {
        this.dispatchComponentError({
          code: 'invalid-structure',
          message: 'Custom structure renderer failed.',
          cause,
        });
        return null;
      }

      if (!this.isValidStructure(customStructure)) {
        this.dispatchComponentError({
          code: 'invalid-structure',
          message: 'Custom structure must contain valid HTMLElement roots.',
        });
        return null;
      }

      const toolbarRoot = customStructure.toolbarRoot ?? this.createDefaultToolbarRoot();
      this.append(toolbarRoot, customStructure.root);
      this.mountedStructure = {
        ...customStructure,
        toolbarRoot,
      };
      if (this.activeMode) this.syncModeTarget(this.activeMode);
      return this.mountedStructure;
    }

    const mountedStructure = this.createDefaultStructure();
    this.append(mountedStructure.toolbarRoot!, mountedStructure.root);
    this.mountedStructure = mountedStructure;
    if (this.activeMode) this.syncModeTarget(this.activeMode);
    return this.mountedStructure;
  }

  private createDefaultStructure() {
    const toolbarRoot = this.createDefaultToolbarRoot();
    const root = document.createElement('section');
    root.className = 'scv';

    const itemsRoot = document.createElement('div');
    itemsRoot.className = 'scv__items';
    itemsRoot.setAttribute('role', 'list');

    root.append(itemsRoot);

    return { root, itemsRoot, toolbarRoot };
  }

  private createDefaultToolbarRoot() {
    const toolbarRoot = document.createElement('div');
    toolbarRoot.className = 'scv__toolbar';
    return toolbarRoot;
  }

  private isValidStructure(structure: unknown): structure is SearchCollectionStructure {
    if (!structure || typeof structure !== 'object') return false;
    const maybeStructure = structure as Partial<SearchCollectionStructure>;
    if (!(maybeStructure.root instanceof HTMLElement)) return false;
    if (!(maybeStructure.itemsRoot instanceof HTMLElement)) return false;
    if (maybeStructure.modeRoot && !(maybeStructure.modeRoot instanceof HTMLElement)) return false;
    if (maybeStructure.toolbarRoot && !(maybeStructure.toolbarRoot instanceof HTMLElement)) return false;
    if (maybeStructure.itemsRoot === maybeStructure.root) return false;
    if (
      maybeStructure.toolbarRoot &&
      (maybeStructure.toolbarRoot === maybeStructure.root ||
        maybeStructure.toolbarRoot === maybeStructure.itemsRoot ||
        maybeStructure.toolbarRoot === maybeStructure.modeRoot)
    ) {
      return false;
    }
    if (maybeStructure.root.isConnected || maybeStructure.itemsRoot.isConnected) return false;
    if (maybeStructure.modeRoot?.isConnected || maybeStructure.toolbarRoot?.isConnected) return false;
    if (maybeStructure.root.parentElement) return false;
    if (maybeStructure.toolbarRoot?.parentElement) return false;

    const modeTarget = maybeStructure.modeRoot ?? maybeStructure.root;
    if (
      maybeStructure.modeRoot &&
      maybeStructure.modeRoot !== maybeStructure.root &&
      !maybeStructure.root.contains(maybeStructure.modeRoot)
    ) {
      return false;
    }

    return modeTarget.contains(maybeStructure.itemsRoot);
  }

  private setMode(mode: string) {
    const plugin = this.registeredViewModes.find((viewMode) => viewMode.id === mode);
    if (!plugin) {
      this.dispatchComponentError({
        code: 'unknown-mode',
        message: `Unknown view mode "${mode}".`,
        mode,
      });
      this.syncHostModeAttribute(this.activeMode);
      return;
    }

    if (this.activeMode === mode) {
      this.syncHostModeAttribute(mode);
      this.syncModeTarget(mode);
      return;
    }

    const previousMode = this.activeMode;
    this.activeMode = mode;
    this.syncHostModeAttribute(mode);
    this.syncModeTarget(mode);
    this.dispatchModeChange(mode, previousMode);
  }

  private syncHostModeAttribute(mode: string | null) {
    this.syncingModeAttribute = true;
    try {
      if (mode === null || mode === '') {
        this.removeAttribute('mode');
      } else if (this.getAttribute('mode') !== mode) {
        this.setAttribute('mode', mode);
      }
    } finally {
      this.syncingModeAttribute = false;
    }
  }

  private syncModeTarget(mode: string) {
    const modeTarget = this.getModeTarget();
    if (modeTarget) modeTarget.dataset.mode = mode;
  }

  private getModeTarget() {
    const structure = this.mountedStructure;
    if (!structure) return null;
    return structure.modeRoot ?? structure.root;
  }

  private render(validatedItemIds?: string[]) {
    const structure = this.ensureStructure();
    if (!structure) return;
    const itemIds = validatedItemIds ?? this.resolveItemIds(this._items);
    if (!itemIds) return;

    this.setAttribute('aria-busy', 'true');
    structure.itemsRoot.replaceChildren();

    try {
      if (!this._renderer) {
        this.dispatchRenderComplete([]);
        return;
      }

      this._items.forEach((item, index) => {
        const itemId = itemIds[index];

        const context: SearchCollectionRenderContext<TItem> = {
          itemId,
          index,
          selected: false,
          mode: this.mode,
          emitAction: () => {},
        };

        try {
          const rendered = this._renderer?.(item, context);
          if (!rendered) return;
          const wrapper = rendered instanceof Element ? rendered : this.wrapFragment(rendered);
          this.applyItemWrapperState(wrapper, itemId);
          structure.itemsRoot.append(wrapper);
        } catch (cause) {
          const fallback = document.createElement('div');
          fallback.className = 'scv__item';
          fallback.dataset.renderError = 'true';
          this.applyItemWrapperState(fallback, itemId);
          structure.itemsRoot.append(fallback);
          this.dispatchComponentError({
            code: 'renderer-error',
            message: `Renderer failed for item "${itemId}".`,
            cause,
            itemId,
          });
        }
      });

      this.dispatchRenderComplete(itemIds);
    } finally {
      this.setAttribute('aria-busy', 'false');
    }
  }

  private wrapFragment(fragment: DocumentFragment) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scv__item';
    wrapper.append(fragment);
    return wrapper;
  }

  private applyItemWrapperState(wrapper: Element, itemId: string) {
    wrapper.setAttribute('data-item-id', itemId);
    wrapper.setAttribute('role', 'listitem');
  }

  private resolveItemIds(items: TItem[]) {
    const itemIds: string[] = [];
    const seen = new Set<string>();

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const rawItemId = item.id ?? this._getItemId?.(item, index);
      if (rawItemId === undefined || rawItemId === null || String(rawItemId) === '') {
        this.dispatchComponentError({
          code: 'missing-item-id',
          message: `Missing item id at index ${index}.`,
        });
        return null;
      }

      const itemId = String(rawItemId);
      if (seen.has(itemId)) {
        this.dispatchComponentError({
          code: 'duplicate-item-id',
          message: `Duplicate item id "${itemId}".`,
          itemId,
        });
        return null;
      }

      seen.add(itemId);
      itemIds.push(itemId);
    }

    return itemIds;
  }

  private dispatchModeChange(mode: string, previousMode: string | null) {
    this.dispatchEvent(
      new CustomEvent('mode-change', {
        detail: {
          mode,
          previousMode,
        },
      }),
    );
  }

  private dispatchRenderComplete(itemIds: string[]) {
    this.dispatchEvent(
      new CustomEvent('render-complete', {
        detail: { itemIds },
      }),
    );
  }

  private dispatchComponentError(detail: SearchCollectionErrorDetail) {
    this.dispatchEvent(
      new CustomEvent('component-error', {
        detail,
      }),
    );
  }
}

export function registerSearchCollectionViewElement() {
  if (!customElements.get('search-collection-view')) {
    customElements.define('search-collection-view', SearchCollectionViewElement);
  }
}
