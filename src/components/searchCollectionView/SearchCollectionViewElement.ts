import type {
  SearchCollectionItem,
  SearchCollectionItemIdResolver,
  SearchCollectionErrorDetail,
  SearchCollectionModeChangeDetail,
  SearchCollectionRenderContext,
  SearchCollectionRenderer,
  SearchModelPlugin,
  SearchState,
  SearchCollectionSelectionAttributeAdapter,
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
  private _selectedItemIds = new Set<string>();
  private _selectionAttribute: SearchCollectionSelectionAttributeAdapter = {
    selected: 'true',
    unselected: 'false',
  };
  private _hiddenItemClass: string | null = null;
  private renderedItems = new Map<string, { item: TItem; wrapper: Element }>();
  private mountedStructure: SearchCollectionStructure | null = null;
  private registeredViewModes: ViewModePlugin[] = [];
  private activeViewModePlugin: ViewModePlugin | null = null;
  private installedStyleModes = new Set<string>();
  private installedModeStyles = new Map<string, HTMLStyleElement>();
  private activeMode: string | null = null;
  private pendingMode: string | null = null;
  private syncingModeAttribute = false;
  private hasReceivedItems = false;
  private _searchModel: SearchModelPlugin<TItem> | null = null;
  private _searchState: SearchState = {};

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

    const registeredPlugin = Object.freeze({ ...plugin });
    this.registeredViewModes.push(registeredPlugin);
    this.installModeStyles(registeredPlugin);
    if (this.pendingMode === registeredPlugin.id && this.getAttribute('mode') === registeredPlugin.id) {
      this.setMode(registeredPlugin.id);
    }
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

  get searchModel() {
    return this._searchModel;
  }

  set searchModel(searchModel: SearchModelPlugin<TItem> | null) {
    this._searchModel = searchModel;
    this._searchState = this.cloneSearchState(searchModel?.initialState ?? {});
    this.applyCurrentSearchStateToRenderedItems();
  }

  get hiddenItemClass() {
    return this._hiddenItemClass;
  }

  set hiddenItemClass(hiddenItemClass: string | null) {
    const previousHiddenItemClass = this._hiddenItemClass;
    this._hiddenItemClass = hiddenItemClass;
    this.removeHiddenStateClassTokens(previousHiddenItemClass);
    this.applyCurrentSearchStateToRenderedItems();
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
      if (this.activeViewModePlugin) this.applyViewModePlugin(this.activeViewModePlugin, null);
      return this.mountedStructure;
    }

    const mountedStructure = this.createDefaultStructure();
    this.append(mountedStructure.toolbarRoot!, mountedStructure.root);
    this.mountedStructure = mountedStructure;
    this.attachItemActionDelegation(this.mountedStructure.itemsRoot);
    if (this.activeViewModePlugin) this.applyViewModePlugin(this.activeViewModePlugin, null);
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
      if (this.registeredViewModes.length === 0) {
        this.pendingMode = mode;
        this.syncHostModeAttribute(mode);
        return;
      }

      this.pendingMode = null;
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
      this.applyViewModePlugin(plugin, plugin);
      return;
    }

    const previousMode = this.activeMode;
    const previousPlugin = this.activeViewModePlugin;
    this.activeMode = mode;
    this.activeViewModePlugin = plugin;
    this.pendingMode = null;
    this.syncHostModeAttribute(mode);
    this.applyViewModePlugin(plugin, previousPlugin);
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

  private applyViewModePlugin(plugin: ViewModePlugin, previousPlugin: ViewModePlugin | null) {
    const modeTarget = this.getModeTarget();
    const structure = this.mountedStructure;
    if (!modeTarget || !structure) return;

    const pluginChanged = previousPlugin?.id !== plugin.id;
    if (pluginChanged && previousPlugin) {
      this.removePluginClasses(previousPlugin, modeTarget);
      try {
        previousPlugin.deactivate?.(modeTarget);
      } catch (cause) {
        this.dispatchComponentError({
          code: 'view-mode-error',
          message: `View mode "${previousPlugin.id}" deactivate hook failed.`,
          cause,
          mode: previousPlugin.id,
        });
      }
    }

    modeTarget.dataset.mode = plugin.id;
    this.addClassTokens(modeTarget, plugin.containerClass);
    [...structure.itemsRoot.children].forEach((child) => this.applyItemModeClass(child, plugin));

    if (pluginChanged) {
      try {
        plugin.activate?.(modeTarget);
      } catch (cause) {
        this.dispatchComponentError({
          code: 'view-mode-error',
          message: `View mode "${plugin.id}" activate hook failed.`,
          cause,
          mode: plugin.id,
        });
      }
    }
  }

  private removePluginClasses(plugin: ViewModePlugin, modeTarget: HTMLElement) {
    this.removeClassTokens(modeTarget, plugin.containerClass);
    const structure = this.mountedStructure;
    if (!structure) return;
    [...structure.itemsRoot.children].forEach((child) => this.removeClassTokens(child, plugin.itemClass));
  }

  private applyItemModeClass(wrapper: Element, plugin = this.activeViewModePlugin) {
    if (!plugin) return;
    this.addClassTokens(wrapper, plugin.itemClass);
  }

  private addClassTokens(element: Element, className: string | undefined) {
    const tokens = this.getClassTokens(className);
    if (tokens.length > 0) element.classList.add(...tokens);
  }

  private removeClassTokens(element: Element, className: string | undefined) {
    const tokens = this.getClassTokens(className);
    if (tokens.length > 0) element.classList.remove(...tokens);
  }

  private getClassTokens(className: string | undefined) {
    return className?.split(/\s+/).filter(Boolean) ?? [];
  }

  private cloneSearchState(state: SearchState): SearchState {
    return {
      ...state,
      filters: state.filters ? { ...state.filters } : undefined,
    };
  }

  private installModeStyles(plugin: ViewModePlugin) {
    if (!plugin.styles || this.installedStyleModes.has(plugin.id)) return;
    const style = document.createElement('style');
    style.dataset.viewMode = plugin.id;
    style.textContent =
      typeof plugin.styles === 'string'
        ? plugin.styles
        : [...plugin.styles.cssRules].map((rule) => rule.cssText).join('\n');
    this.append(style);
    this.installedStyleModes.add(plugin.id);
    this.installedModeStyles.set(plugin.id, style);
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
          mode: this.mode,
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

      this.applyCurrentSearchStateToRenderedItems();
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
    this.applyItemModeClass(wrapper);
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

  private applyCurrentSearchStateToRenderedItems() {
    const result = this.computeSearchResult(this._searchState);
    if (!result) return;
    this.applySearchResult(result);
  }

  private computeSearchResult(state: SearchState) {
    const entries = [...this.renderedItems.entries()].map(([itemId, renderedItem], renderedIndex) => ({
      itemId,
      item: renderedItem.item,
      wrapper: renderedItem.wrapper,
      renderedIndex,
      matched: true,
    }));

    try {
      for (const entry of entries) {
        entry.matched = this._searchModel?.match?.(entry.item, state) ?? true;
      }

      if (this._searchModel?.compare) {
        entries.sort((left, right) => {
          const compared = this._searchModel?.compare?.(left.item, right.item, state) ?? 0;
          return compared === 0 ? left.renderedIndex - right.renderedIndex : compared;
        });
      }

      return entries;
    } catch (cause) {
      this.dispatchComponentError({
        code: 'search-error',
        message: 'Search model callback failed.',
        cause,
      });
      return null;
    }
  }

  private applySearchResult(
    entries: { itemId: string; item: TItem; wrapper: Element; renderedIndex: number; matched: boolean }[],
  ) {
    const structure = this.mountedStructure;
    if (!structure) return;

    for (const entry of entries) {
      this.applyHiddenState(entry.wrapper, !entry.matched);
      structure.itemsRoot.append(entry.wrapper);
    }

    this.renderedItems = new Map(entries.map((entry) => [entry.itemId, { item: entry.item, wrapper: entry.wrapper }]));
  }

  private applyHiddenState(wrapper: Element, hidden: boolean) {
    if (wrapper instanceof HTMLElement) {
      wrapper.hidden = hidden;
    } else if (hidden) {
      wrapper.setAttribute('hidden', '');
    } else {
      wrapper.removeAttribute('hidden');
    }

    wrapper.setAttribute('data-hidden', String(hidden));

    const hiddenItemClassTokens = this.getClassTokens(this._hiddenItemClass ?? undefined);
    if (hiddenItemClassTokens.length > 0) {
      wrapper.classList.toggle(hiddenItemClassTokens[0], hidden);
      for (let index = 1; index < hiddenItemClassTokens.length; index += 1) {
        wrapper.classList.toggle(hiddenItemClassTokens[index], hidden);
      }
    }
  }

  private removeHiddenStateClassTokens(hiddenItemClass: string | null) {
    const classTokens = this.getClassTokens(hiddenItemClass ?? undefined);
    if (classTokens.length === 0) return;

    for (const renderedItem of this.renderedItems.values()) {
      renderedItem.wrapper.classList.remove(...classTokens);
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

  private dispatchModeChange(mode: string, previousMode: string | null) {
    const detail: SearchCollectionModeChangeDetail = {
      mode,
      previousMode,
    };

    this.dispatchEvent(
      new CustomEvent('mode-change', {
        detail,
      }),
    );
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
