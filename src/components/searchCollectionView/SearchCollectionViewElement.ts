import type {
  SearchCollectionItem,
  SearchCollectionItemIdResolver,
  SearchCollectionErrorDetail,
  SearchCollectionRenderContext,
  SearchCollectionRenderer,
  SearchCollectionSelectionAttributeAdapter,
  SearchCollectionStructure,
  SearchCollectionStructureRenderer,
} from './types';

export class SearchCollectionViewElement<
  TItem extends SearchCollectionItem = SearchCollectionItem,
> extends HTMLElement {
  private _items: TItem[] = [];
  private _renderer: SearchCollectionRenderer<TItem> | null = null;
  private _getItemId: SearchCollectionItemIdResolver<TItem> | null = null;
  private _structure: SearchCollectionStructureRenderer | null = null;
  private _selectedItemIds = new Set<string>();
  private _selectionAttribute: SearchCollectionSelectionAttributeAdapter = {
    selected: 'true',
    unselected: 'false',
  };
  private renderedItems = new Map<string, { item: TItem; wrapper: Element }>();
  private mountedStructure: SearchCollectionStructure | null = null;
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

  get selectedItemIds(): ReadonlySet<string> {
    return new Set(this._selectedItemIds);
  }

  get selectionAttribute() {
    return { ...this._selectionAttribute };
  }

  set selectionAttribute(selectionAttribute: SearchCollectionSelectionAttributeAdapter) {
    this._selectionAttribute = { ...selectionAttribute };
    this.applySelectionStateToRenderedItems();
  }

  setSelectedItemIds(ids: Iterable<string | number>) {
    const nextSelectedItemIds = new Set([...ids].map((id) => String(id)));
    const previousSelectedItemIds = [...this._selectedItemIds];
    if (this.areSetsEqual(this._selectedItemIds, nextSelectedItemIds)) return;

    this._selectedItemIds = nextSelectedItemIds;
    this.applySelectionStateToRenderedItems();
    this.dispatchSelectionChange([...nextSelectedItemIds], previousSelectedItemIds);
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
      this.attachItemActionDelegation(this.mountedStructure.itemsRoot);
      return this.mountedStructure;
    }

    const mountedStructure = this.createDefaultStructure();
    this.append(mountedStructure.toolbarRoot!, mountedStructure.root);
    this.mountedStructure = mountedStructure;
    this.attachItemActionDelegation(this.mountedStructure.itemsRoot);
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

  private render(validatedItemIds?: string[]) {
    const structure = this.ensureStructure();
    if (!structure) return;
    const itemIds = validatedItemIds ?? this.resolveItemIds(this._items);
    if (!itemIds) return;

    this.setAttribute('aria-busy', 'true');
    structure.itemsRoot.replaceChildren();
    this.renderedItems.clear();

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
          selected: this._selectedItemIds.has(itemId),
          mode: this.getAttribute('mode') ?? '',
          emitAction: (action, detail) => {
            this.dispatchItemAction(itemId, action, detail);
          },
        };

        try {
          const rendered = this._renderer?.(item, context);
          if (!rendered) return;
          const wrapper = rendered instanceof Element ? rendered : this.wrapFragment(rendered);
          this.applyItemWrapperState(wrapper, itemId);
          this.renderedItems.set(itemId, { item, wrapper });
          structure.itemsRoot.append(wrapper);
        } catch (cause) {
          const fallback = document.createElement('div');
          fallback.className = 'scv__item';
          fallback.dataset.renderError = 'true';
          this.applyItemWrapperState(fallback, itemId);
          this.renderedItems.set(itemId, { item, wrapper: fallback });
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
    this.applySelectionState(wrapper, this._selectedItemIds.has(itemId));
  }

  private applySelectionState(wrapper: Element, selected: boolean) {
    const value = selected ? this._selectionAttribute.selected : this._selectionAttribute.unselected;
    if (value === null) {
      wrapper.removeAttribute('data-selected');
    } else {
      wrapper.setAttribute('data-selected', value);
    }
  }

  private applySelectionStateToRenderedItems() {
    for (const [itemId, renderedItem] of this.renderedItems) {
      this.applySelectionState(renderedItem.wrapper, this._selectedItemIds.has(itemId));
    }
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

  private areSetsEqual(left: Set<string>, right: Set<string>) {
    if (left.size !== right.size) return false;
    for (const value of left) {
      if (!right.has(value)) return false;
    }
    return true;
  }

  private dispatchSelectionChange(selectedItemIds: string[], previousSelectedItemIds: string[]) {
    this.dispatchEvent(
      new CustomEvent('selection-change', {
        detail: {
          selectedItemIds,
          previousSelectedItemIds,
        },
      }),
    );
  }

  private attachItemActionDelegation(itemsRoot: HTMLElement) {
    itemsRoot.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const actionElement = target.closest<HTMLElement>('[data-action]');
      if (!actionElement || !itemsRoot.contains(actionElement)) return;

      const itemId = this.findOwningRenderedItemId(actionElement, itemsRoot);
      if (!itemId) return;

      const action = actionElement.dataset.action;
      if (!action) return;

      this.dispatchItemAction(itemId, action);
    });
  }

  private findOwningRenderedItemId(actionElement: Element, itemsRoot: HTMLElement) {
    let current: Element | null = actionElement;
    while (current && current !== itemsRoot) {
      const itemId = current.getAttribute('data-item-id');
      if (itemId && this.renderedItems.get(itemId)?.wrapper === current) {
        return itemId;
      }
      current = current.parentElement;
    }
    return null;
  }

  private dispatchItemAction(itemId: string, action: string, detail?: Record<string, unknown>) {
    const renderedItem = this.renderedItems.get(itemId);
    if (!renderedItem) return;

    this.dispatchEvent(
      new CustomEvent('item-action', {
        detail: {
          itemId,
          item: renderedItem.item,
          action,
          ...(detail === undefined ? {} : { detail }),
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
