# Search Collection View Design

Issue: #582

Related design issues: #583, #584, #585

## Purpose

Extract the reusable part of the current CardList UI into a Search Collection View component.

The first version should formalize the current strength of the app: one shared item DOM that can switch between a visual card layout and a list layout through CSS state only. The component should be usable from plain JavaScript first, while keeping its public API friendly to later React and Vue wrappers.

## Scope

In scope:

- Custom element API for a reusable collection view.
- Plain object `items` input.
- Renderer API that creates one shared item DOM per item.
- View mode plugin API based on shared DOM and CSS switching.
- Search model and search UI extension points at the API boundary.
- Mapping from current CardList responsibilities to reusable component or app-specific adapter.

Out of scope for the first extraction:

- Per-mode renderers with different DOM trees.
- Deck code, deck persistence, share URL, or deck information dialogs.
- npm package publishing.
- React or Vue specific implementations.

## Public API

Custom element name:

```html
<search-collection-view></search-collection-view>
```

Primary properties:

```ts
type SearchCollectionItem = Record<string, unknown> & {
  id?: string | number;
};

type SearchCollectionItemIdResolver<TItem extends SearchCollectionItem> = (
  item: TItem,
  index: number,
) => string | number;

type SearchCollectionRenderer<TItem extends SearchCollectionItem> = (
  item: TItem,
  context: SearchCollectionRenderContext<TItem>,
) => Element | DocumentFragment;

interface SearchCollectionStructure {
  root: HTMLElement;
  modeRoot?: HTMLElement;
  itemsRoot: HTMLElement;
  toolbarRoot?: HTMLElement;
}

type SearchCollectionStructureRenderer = () => SearchCollectionStructure;

interface SearchCollectionSelectionAttributeAdapter {
  selected: string;
  unselected: string | null;
}

interface SearchCollectionRenderContext<TItem extends SearchCollectionItem> {
  itemId: string;
  index: number;
  selected: boolean;
  mode: string;
  emitAction(action: string, detail?: Record<string, unknown>): void;
}

interface SearchCollectionViewElement<TItem extends SearchCollectionItem = SearchCollectionItem> extends HTMLElement {
  items: TItem[];
  getItemId: SearchCollectionItemIdResolver<TItem> | null;
  renderer: SearchCollectionRenderer<TItem> | null;
  structure: SearchCollectionStructureRenderer | null;
  mode: string;
  hiddenItemClass: string | null;
  selectionAttribute: SearchCollectionSelectionAttributeAdapter;
  readonly selectedItemIds: ReadonlySet<string>;
  readonly viewModes: readonly ViewModePlugin[];
  searchModel: SearchModelPlugin<TItem> | null;
  searchUi: SearchUiPlugin<TItem> | null;
  setItems(items: TItem[]): void;
  setSelectedItemIds(ids: Iterable<string | number>): void;
  registerViewMode(plugin: ViewModePlugin): void;
}
```

Attributes:

- `mode`: active view mode id. Example: `visual`, `list`.
- `aria-busy`: managed by the component while rendering.

Events:

- `mode-change`: fired after the active mode changes.
- `item-action`: fired when an item renderer reports a domain action.
- `selection-change`: fired when selected item ids change.
- `search-state-change`: fired when search state changes.
- `render-complete`: fired after the current item DOM has been updated.
- `component-error`: fired when the component rejects an operation or catches a recoverable plugin/render error.

`component-error` detail shape:

```ts
interface SearchCollectionErrorDetail {
  code:
    | 'missing-item-id'
    | 'duplicate-item-id'
    | 'unknown-mode'
    | 'duplicate-mode'
    | 'invalid-structure'
    | 'renderer-error'
    | 'search-error'
    | 'search-ui-error';
  message: string;
  cause?: unknown;
  itemId?: string;
  mode?: string;
}
```

Other event detail shapes:

```ts
interface SearchCollectionModeChangeDetail {
  mode: string;
  previousMode: string | null;
}

interface SearchCollectionItemActionDetail<TItem extends SearchCollectionItem> {
  itemId: string;
  item: TItem;
  action: string;
  detail?: Record<string, unknown>;
}

interface SearchCollectionSelectionChangeDetail {
  selectedItemIds: string[];
  previousSelectedItemIds: string[];
}

interface SearchCollectionSearchStateChangeDetail {
  state: SearchState;
  previousState: SearchState;
}

interface SearchCollectionRenderCompleteDetail {
  itemIds: string[];
}
```

Item id rules:

- Each item must have a stable id before it can be rendered.
- By default, the component uses `item.id`.
- If `item.id` is absent, the caller must provide `getItemId`.
- Index-based fallback is not allowed because search and sort can reorder items.
- All event details and `selectedItemIds` use normalized string ids.
- If an item id cannot be resolved, the component rejects the render/update operation and dispatches `component-error` with `code: "missing-item-id"`.
- Item ids must be unique within the current `items` set. If duplicate ids are found, the component rejects the render/update operation and dispatches `component-error` with `code: "duplicate-item-id"`.

Minimum vanilla usage:

```ts
const view = document.querySelector('search-collection-view');

view.getItemId = (card) => card.n;
view.renderer = (card, context) => {
  const row = document.createElement('article');
  row.className = 'card-row';

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  const number = document.createElement('div');
  number.className = 'card-no';
  number.textContent = `No.${card.n}`;

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = card.ja;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.action = 'add';
  button.textContent = 'Add';

  row.append(grid, number, name, button);
  return row;
};

view.registerViewMode(cardVisualMode);
view.registerViewMode(cardListMode);
view.mode = 'visual';
view.items = cards;

view.addEventListener('item-action', (event) => {
  const { itemId, action } = event.detail;
  // App-specific deck editing handles this outside the reusable component.
});
```

## DOM Model

The component owns a stable host and internal root:

```html
<search-collection-view class="deck-tab-item table__wrapper" mode="visual">
  <!-- scoped root for the initial CardList migration -->
  <section class="scv" data-mode="visual">
    <div class="scv__toolbar"></div>
    <div class="scv__items" role="list">
      <div class="scv__item" role="listitem" data-item-id="1" data-selected="">
        <!-- renderer output -->
      </div>
    </div>
  </section>
</search-collection-view>
```

The default structure creates `.scv`, `.scv__toolbar`, and `.scv__items`. Adapters can replace that structure through `structure` when migration requires existing DOM:

```ts
view.structure = () => {
  const toolbarRoot = document.createElement('div');
  toolbarRoot.className = 'table-caption-title';

  const modeRoot = document.createElement('div');
  modeRoot.className = 'cardlist_table';
  modeRoot.tabIndex = -1;
  modeRoot.dataset.layout = 'grid';

  const head = document.createElement('div');
  head.className = 'cardlist_table_head';

  const itemsRoot = document.createElement('ul');
  itemsRoot.className = 'cardlist_table_body';

  modeRoot.append(head, itemsRoot);
  return { root: modeRoot, modeRoot, itemsRoot, toolbarRoot };
};
```

Structure rules:

- The custom element host is the outer integration point. For CardList migration, each host must receive the existing wrapper classes that apply to that instance: the card list host uses `.deck-tab-item.table__wrapper.deck-tab-item--active.card-list-container`, and the deck host uses `.deck-tab-item.table__wrapper.deck-container`.
- `root` is the inner structure root inserted into the host after `toolbarRoot` when `toolbarRoot` exists.
- `modeRoot` is the mode state element. The component applies `data-mode` to `modeRoot ?? root`. The CardList view mode plugins also synchronize `data-layout` on this same element.
- `itemsRoot` is the only element the component appends, reorders, or clears item wrappers within.
- `toolbarRoot` is where a Search UI plugin is mounted when the structure provides one. For CardList, this preserves `.table-caption-title` as the location for search UI, sort, layout toggle, and action controls.
- The component appends the Search UI plugin root into `toolbarRoot`; it does not replace or clear existing toolbar children. CardList-owned title, `.action-wrapper`, sort, and layout toggle nodes remain under adapter control unless that adapter's Search UI plugin explicitly renders them.
- If a custom structure omits `toolbarRoot`, the component creates and uses a default `.scv__toolbar` before the custom `root`.
- The CardList adapter must provide a structure whose `toolbarRoot` is `.table-caption-title`, whose `root` and `modeRoot` are `.cardlist_table`, and whose `itemsRoot` is `ul.cardlist_table_body`, preserving `.cardlist_table_head` as a sibling of `itemsRoot`.
- `structure` is configuration for the next initial render only. It must be set before `items` first creates item DOM.
- After a structure is mounted, changing `structure` is rejected, the current structure and item DOM stay in place, and `component-error` is dispatched with `code: "invalid-structure"`.
- The returned nodes must be fresh `HTMLElement` instances. `itemsRoot` must be contained by `modeRoot ?? root`. `modeRoot`, when present, must either be `root` or be contained by `root`. `toolbarRoot` may be a sibling inserted before `root`. Invalid structures are rejected with `code: "invalid-structure"` before item DOM is changed.

Initial implementation should use a scoped light DOM root for the CardList migration. Existing e2e tests and CSS query `li.cardlist_table_row` directly, so moving CardList rows into Shadow DOM would intentionally break compatibility. Shadow DOM remains a later packaging option for non-CardList consumers after the adapter is stable.

The default component shape wraps multi-root renderer output in `.scv__item`, and always adopts single-root `Element` output as the item wrapper:

- If renderer output is an `Element`, the component adopts that element as the item wrapper.
- The adopted root receives `data-item-id`, `data-selected`, `data-hidden`, role, `hidden`, and render error attributes.
- This is the migration path for CardList because `li.cardlist_table_row` must remain the state-bearing item element.
- If renderer output is a `DocumentFragment`, the component wraps its child nodes in `.scv__item`.
- The CardList adapter must return a single root element so root adoption is required rather than optional for that adapter.

Item DOM lifecycle:

- Items render once when `items` or `renderer` changes.
- Mode changes update host/root mode attributes and plugin-owned mode classes without recreating item DOM.
- Mode changes must not recreate item wrapper DOM or renderer output.
- Search and selection changes update wrapper attributes/classes, then reorder or hide existing item wrappers when possible.
- Hidden state always sets both the `hidden` attribute and `data-hidden`. If `hiddenItemClass` is set, the same state is also synchronized to that class. The CardList adapter uses `hiddenItemClass = "card--hidden"` to preserve current CSS.
- Selected state uses `selectionAttribute` to write `data-selected`. The default is `{ selected: "true", unselected: "false" }`. The CardList adapter must set `{ selected: "1", unselected: "" }` or `{ selected: "1", unselected: null }` for legacy compatibility.
- `selectionAttribute` may be changed after render; when it changes, the component reapplies `data-selected` to every existing item wrapper from the current `selectedItemIds` without rerunning the renderer.
- The component delegates clicks from item wrappers. If the clicked element or one of its ancestors has `data-action`, the component dispatches `item-action` with that action and the owning item. Renderers may also call `context.emitAction()` directly for non-DOM-triggered actions.
- `context.selected` and `context.mode` are snapshots for labels, ARIA attributes, and non-structural metadata only. Renderers must not branch their DOM structure on those values because selection and mode updates do not rerun the renderer.

## View Mode Plugin API

```ts
interface ViewModePlugin {
  id: string;
  label: string;
  containerClass?: string;
  itemClass?: string;
  styles?: string | CSSStyleSheet;
  activate?(modeTarget: HTMLElement): void;
  deactivate?(modeTarget: HTMLElement): void;
}
```

Rules:

- `id` becomes the allowed `mode` value.
- Active mode is mirrored to host `mode` and `(modeRoot ?? root).dataset.mode`.
- View mode plugin `activate()` and `deactivate()` receive `modeRoot ?? root`, not the outer structure root.
- `containerClass` and `itemClass` are additive mode-specific classes.
- `styles` are installed once and reused.
- `viewModes` is a read-only snapshot; consumers must use `registerViewMode()` so style installation and duplicate id checks cannot be bypassed.
- `registerViewMode()` rejects duplicate ids and dispatches `component-error` with `code: "duplicate-mode"`.
- Plugins cannot replace the renderer output for the initial version.

Current CardList mapping:

| Current state               | New mode plugin                           |
| --------------------------- | ----------------------------------------- |
| `data-layout="grid"`        | `id: "visual"`                            |
| `data-layout="table"`       | `id: "list"`                              |
| `[data-layout='grid']` CSS  | visual mode styles                        |
| `[data-layout='table']` CSS | list mode styles                          |
| layout toggle buttons       | app or default toolbar controlling `mode` |

## Search Plugin Boundary

Search must operate on item data, not DOM text.

```ts
interface SearchState {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: string;
}

interface SearchModelPlugin<TItem extends SearchCollectionItem> {
  initialState?: SearchState;
  match?(item: TItem, state: SearchState): boolean;
  compare?(a: TItem, b: TItem, state: SearchState): number;
}

interface SearchUiPlugin<TItem extends SearchCollectionItem> {
  render(context: SearchUiContext<TItem>): Element;
  update?(root: Element, context: SearchUiContext<TItem>): void;
  destroy?(root: Element): void;
}

interface SearchUiContext<TItem extends SearchCollectionItem> {
  state: SearchState;
  setState(next: SearchState): void;
  items: TItem[];
}
```

Search UI lifecycle:

- `render()` is called when the search UI plugin is attached or replaced.
- `setState()` is the only supported way for Search UI plugins to request a search state change.
- `setState(next)` is a complete replacement, not a partial merge. Search UI plugins must pass the full next state, such as `{ ...state, query: nextQuery }`, when preserving existing filters or sort.
- `setState(next)` commits atomically: compute the matched ids and sorted order first, then update internal search state, DOM order/visibility, dispatch `search-state-change`, and finally call `searchUi.update()`. If `match()` or `compare()` throws, the previous component-owned search state, DOM order, and visibility state remain unchanged; `searchUi.update()` and `search-state-change` are not called.
- If `update()` is not provided, the component may replace the search UI by calling `render()` again.
- Before replacing or removing a Search UI root, the component calls `searchUi.destroy(root)` when provided, then removes that root from the DOM. Search UI plugins must keep their event listeners scoped to the rendered root or clean them up in `destroy()`.
- `render()` must return one stable `Element` root. `DocumentFragment` is not accepted because inserted fragments cannot be passed back to `update()` reliably.
- Search UI plugins should keep DOM event listeners inside their rendered root element and call `setState()` rather than mutating item DOM directly.
- `search-state-change` reports committed state after filtering and sorting are applied.

Current CardList mapping:

| Current behavior     | New responsibility                                      |
| -------------------- | ------------------------------------------------------- |
| Card name text input | CardList search UI plugin                               |
| min/max grid count   | CardList search UI plugin + search model filter         |
| min/max SP           | CardList search UI plugin + search model filter         |
| sort select          | Search UI plugin updates `state.sort`                   |
| `filerRow()`         | Search model `match()`                                  |
| `getSortRow()`       | Search model `compare()`                                |
| `.card--hidden`      | Component-controlled hidden state via `hiddenItemClass` |

## CardList Migration Boundary

Reusable component responsibilities:

- Render collection host, toolbar slots, and item wrappers.
- Accept a custom structure so adapters can preserve existing outer DOM and choose the item container.
- Store `items`, `renderer`, active `mode`, selected ids, and search state.
- Register and apply view mode plugins.
- Apply search filtering and sorting to item data.
- Emit generic item, mode, selection, and search events.

CardList adapter responsibilities:

- Convert `ICard` to Search Collection items.
- Provide `getItemId = (card) => card.n`.
- Provide `hiddenItemClass = "card--hidden"`.
- Provide `selectionAttribute = { selected: "1", unselected: "" }`.
- Put existing tab and container classes on each custom element host:
  - Card list host: `.deck-tab-item.table__wrapper.deck-tab-item--active.card-list-container`.
  - Deck host: `.deck-tab-item.table__wrapper.deck-container`.
- Provide a custom structure equivalent to `.table-caption-title`, `.cardlist_table`, `.cardlist_table_head`, and `ul.cardlist_table_body`.
- Provide card renderer output equivalent to `row.html.mustache`, with `data-action="add"` on `.button-add` and `data-action="delete"` on `.button-delete`.
- Provide visual/list mode styles equivalent to current `[data-layout]` CSS.
- Provide card-specific search model for name, grid count, SP, rarity, and card number.
- Provide card-specific search UI equivalent to `table.html.mustache` controls.
- Translate `item-action` events into deck editor behavior.

Deck editor responsibilities:

- Maintain edited deck state.
- Add and remove cards.
- Generate deck code.
- Save, clear, share, and display deck information.
- Synchronize selected card ids back to the Search Collection View through `setSelectedItemIds()`.

## Compatibility Requirements

The initial CardList migration should preserve:

- Card visual layout and list layout.
- Layout switching without item DOM regeneration.
- Existing add and delete button behavior.
- Existing selected card visual state.
- Existing search and sort behavior.
- Existing e2e selectors where practical, especially `.cardlist_table_row` during the migration phase.

The reusable component can add new `scv-*` classes, but the CardList adapter should keep current CardList classes until migration tests are updated intentionally.

During the CardList migration:

- CardList rows must remain in scoped light DOM.
- The custom element host must occupy the same tab item position as the old `CardList.wrapper`, so `.deck-tab-items > *`, `.deck-tab-item + .deck-tab-item`, `.card-list-container`, and `.deck-container` selectors still apply.
- The CardList structure under the host must preserve `.table-caption-title + .cardlist_table[data-layout]`.
- The CardList mode root must preserve `.cardlist_table[data-layout] > .cardlist_table_head + ul.cardlist_table_body`.
- The state-bearing item element must remain `li.cardlist_table_row` through renderer root adoption.
- `data-selected="1"` must be applied to selected `li.cardlist_table_row` elements, and unselected rows must use an empty value or absent attribute.
- `.button-add` and `.button-delete` display switching must continue to work under `.card-list-container [data-selected='1']`.
- Hidden state must apply both `hidden`/`data-hidden` and `.card--hidden` to `li.cardlist_table_row`.
- Layout CSS must continue to target the same row/item classes until the tests and styles are intentionally migrated.

## Error Handling

- If `renderer` is missing, render an empty state and dispatch no item actions.
- If a renderer throws, create a fallback `.scv__item` wrapper for that item, mark it with `data-render-error="true"`, and continue rendering other items.
- If an item id cannot be resolved, keep the previous rendered collection and dispatch `component-error` with `code: "missing-item-id"`.
- If duplicate item ids are found, keep the previous rendered collection and dispatch `component-error` with `code: "duplicate-item-id"`.
- If `structure` is invalid or changed after it is mounted, keep the previous structure and rendered collection, then dispatch `component-error` with `code: "invalid-structure"`.
- If `registerViewMode()` receives a duplicate id, keep the existing plugin and dispatch `component-error` with `code: "duplicate-mode"` and the rejected `mode`.
- If `mode` is set to an unknown id, keep the previous mode and dispatch `component-error` with `code: "unknown-mode"` and the rejected `mode`.
- If search plugin callbacks throw, keep the previous rendered order and visibility state, then dispatch `component-error` with `code: "search-error"` and `cause`.
- If `searchUi.render()` or `searchUi.update()` throws, keep the previous search UI root and dispatch `component-error` with `code: "search-ui-error"` and `cause`.
- If a renderer throws, dispatch `component-error` with `code: "renderer-error"`, `itemId`, and `cause`.

## Testing Strategy

Unit tests:

- Items render from plain object data.
- Mode changes update attributes without recreating item wrapper nodes.
- CardList host/root classes preserve tab layout and `.card-list-container` selectors.
- CardList selected rows preserve `data-selected="1"` and unselected rows use an empty value or absent attribute.
- CardList `.button-add` and `.button-delete` visibility still follows selected state.
- CardList mode switching preserves `data-layout="grid"` and `data-layout="table"` on `.cardlist_table`.
- `item-action`, `mode-change`, `selection-change`, and `search-state-change` events include stable detail payloads.
- `[data-action]` click delegation dispatches `item-action` with the owning item id and action.
- Search model filters and sorts by item data.
- Unknown mode and renderer errors are handled.

Migration/e2e tests:

- Existing PC and mobile CardList tests still pass.
- Layout toggle preserves selected state and item identity.
- Search and sort results match current CardList behavior.
- Deck add/remove behavior remains outside the reusable component but still works through events.

## Implementation Order

1. Implement the minimal custom element host and renderer flow for #586.
2. Add view mode plugin registration and shared DOM CSS switching for #587.
3. Add search model and search UI plugin boundaries for #588.
4. Migrate current CardList renderer, modes, and search UI as the first adapter for #589.
5. Move deck editing coupling to event-based integration for #590.

## Open Decisions

The design chooses scoped light DOM as the first CardList migration target. Shadow DOM remains an option for later package-oriented consumers, but it should not be introduced into the CardList adapter until selectors, CSS, and tests are intentionally migrated.
