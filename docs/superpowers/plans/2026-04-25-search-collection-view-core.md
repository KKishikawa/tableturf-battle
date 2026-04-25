# SearchCollectionView Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement issue #586: the minimal `<search-collection-view>` custom element host, structure mounting, item rendering, item id validation, and core render/error events.

**Architecture:** Add a focused `src/components/searchCollectionView/` module that exports the element class, registration helper, and public core types. The element owns only reusable collection rendering concerns for #586; selection, actions, view modes, search, and CardList migration stay out of scope.

**Tech Stack:** TypeScript, Web Components, Vite, Vitest, happy-dom for DOM unit tests.

---

## File Structure

- Create `src/components/searchCollectionView/types.ts`
  - Public core types for #586: item, id resolver, renderer, render context, structure renderer, error detail, render-complete detail.
- Create `src/components/searchCollectionView/SearchCollectionViewElement.ts`
  - Custom element class, property setters/getters, structure lifecycle, item id validation, item rendering, `render-complete`, and `component-error`.
- Create `src/components/searchCollectionView/index.ts`
  - Re-export types/class and register the custom element exactly once.
- Modify `src/components/index.ts` only if an existing component barrel exists. If no barrel exists, do not create unrelated exports.
- Modify `src/index.ts`
  - Import `@/components/searchCollectionView` so the custom element is registered in the app bundle.
- Modify `package.json`
  - Add `happy-dom` as a dev dependency if not already present.
- Modify `vite.config.ts`
  - Configure Vitest to use `happy-dom` for tests under `tests/vitest/unit/components/**/*.spec.ts`.
- Create `tests/vitest/unit/components/searchCollectionView/core.spec.ts`
  - DOM unit tests for #586 acceptance criteria.

## Boundary

This plan must not implement:

- `selectedItemIds`, `setSelectedItemIds()`, `selectionAttribute`, `item-action`, or `selection-change` from #593.
- `ViewModePlugin`, mode registration, active mode lifecycle, or styles from #587.
- Search model, Search UI, hidden state, or search events from #588/#594.
- CardList adapter or deck editor integration from #589/#590.

## Task 1: Add DOM Test Environment

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `tests/vitest/unit/components/searchCollectionView/core.spec.ts`

- [ ] **Step 1: Add the first failing DOM test**

Create `tests/vitest/unit/components/searchCollectionView/core.spec.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { SearchCollectionViewElement } from '@/components/searchCollectionView';

describe('SearchCollectionViewElement core rendering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders item elements from plain object data and an element renderer', () => {
    const view = new SearchCollectionViewElement();
    view.renderer = (item, context) => {
      const row = document.createElement('article');
      row.className = 'row';
      row.textContent = `${context.itemId}:${String(item.name)}`;
      return row;
    };

    view.items = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ];
    document.body.append(view);

    const rows = [...view.querySelectorAll<HTMLElement>('.row')];
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.dataset.itemId)).toEqual(['1', '2']);
    expect(rows.map((row) => row.textContent)).toEqual(['1:Alpha', '2:Beta']);
    expect(view.querySelector('.scv__items')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: fail because `@/components/searchCollectionView` does not exist, or because DOM environment is missing.

- [ ] **Step 3: Add happy-dom and Vitest environment config**

Install:

```bash
npm install --save-dev happy-dom
```

Update `vite.config.ts` test config:

```ts
      environment: 'happy-dom',
```

Place `environment` inside the existing `test` object. This project currently has only Node-safe utility tests plus the new DOM component tests, so using `happy-dom` for the Vitest project keeps the setup simple.

- [ ] **Step 4: Run the test again**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: fail only because `@/components/searchCollectionView` does not exist.

## Task 2: Add Public Types and Minimal Element

**Files:**
- Create: `src/components/searchCollectionView/types.ts`
- Create: `src/components/searchCollectionView/SearchCollectionViewElement.ts`
- Create: `src/components/searchCollectionView/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add public core types**

Create `src/components/searchCollectionView/types.ts`:

```ts
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
  code:
    | 'missing-item-id'
    | 'duplicate-item-id'
    | 'invalid-structure'
    | 'renderer-error';
  message: string;
  cause?: unknown;
  itemId?: string;
  mode?: string;
}

export interface SearchCollectionRenderCompleteDetail {
  itemIds: string[];
}
```

- [ ] **Step 2: Add minimal element implementation**

Create `src/components/searchCollectionView/SearchCollectionViewElement.ts` with enough code to mount default structure, render element results, normalize `item.id`, and dispatch `render-complete`.

- [ ] **Step 3: Add the barrel and registration helper**

Create `src/components/searchCollectionView/index.ts`:

```ts
export * from './types';
export { SearchCollectionViewElement, registerSearchCollectionViewElement } from './SearchCollectionViewElement';

registerSearchCollectionViewElement();
```

- [ ] **Step 4: Register in app entrypoint**

Modify `src/index.ts`:

```ts
import '@/components/searchCollectionView';
import '@/global';
import '@/core';
import '@/start';
```

- [ ] **Step 5: Run the first test to verify GREEN**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: the first test passes.

## Task 3: Validate Item IDs Without Mutating Existing DOM

**Files:**
- Modify: `tests/vitest/unit/components/searchCollectionView/core.spec.ts`
- Modify: `src/components/searchCollectionView/SearchCollectionViewElement.ts`

- [ ] **Step 1: Add RED tests for `getItemId`, missing id, and duplicate id**

Append tests that verify:

```ts
it('uses getItemId when item.id is absent', () => {
  const view = new SearchCollectionViewElement<{ key: number; name: string }>();
  view.getItemId = (item) => item.key;
  view.renderer = (item) => {
    const row = document.createElement('article');
    row.textContent = item.name;
    return row;
  };

  view.items = [{ key: 42, name: 'No id' }];
  document.body.append(view);

  expect(view.querySelector<HTMLElement>('article')?.dataset.itemId).toBe('42');
});

it('keeps previous rendered items when an item id is missing', () => {
  const view = new SearchCollectionViewElement();
  const errors: CustomEvent[] = [];
  view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
  view.renderer = (item) => {
    const row = document.createElement('article');
    row.textContent = String(item.name);
    return row;
  };
  view.items = [{ id: 1, name: 'Existing' }];
  document.body.append(view);

  view.items = [{ name: 'Broken' }];

  expect(view.querySelector('article')?.textContent).toBe('Existing');
  expect(errors.at(-1)?.detail.code).toBe('missing-item-id');
});

it('keeps previous rendered items when duplicate item ids are provided', () => {
  const view = new SearchCollectionViewElement();
  const errors: CustomEvent[] = [];
  view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
  view.renderer = (item) => {
    const row = document.createElement('article');
    row.textContent = String(item.name);
    return row;
  };
  view.items = [{ id: 1, name: 'Existing' }];
  document.body.append(view);

  view.items = [
    { id: 2, name: 'First' },
    { id: 2, name: 'Second' },
  ];

  expect(view.querySelector('article')?.textContent).toBe('Existing');
  expect(errors.at(-1)?.detail.code).toBe('duplicate-item-id');
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: new id validation tests fail.

- [ ] **Step 3: Implement id validation**

Update `SearchCollectionViewElement` to:

- Resolve ids with `item.id ?? getItemId?.(item, index)`.
- Normalize ids with `String(id)`.
- Reject `null`, `undefined`, and empty string ids.
- Check duplicates before clearing or appending any item DOM.
- Dispatch `component-error` with `missing-item-id` or `duplicate-item-id`.

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: all current core tests pass.

## Task 4: Validate Custom Structure Lifecycle

**Files:**
- Modify: `tests/vitest/unit/components/searchCollectionView/core.spec.ts`
- Modify: `src/components/searchCollectionView/SearchCollectionViewElement.ts`

- [ ] **Step 1: Add RED tests for custom structure**

Append tests that verify:

```ts
it('mounts a valid custom structure before first render', () => {
  const view = new SearchCollectionViewElement();
  view.structure = () => {
    const toolbarRoot = document.createElement('header');
    toolbarRoot.className = 'toolbar';
    const root = document.createElement('section');
    root.className = 'custom-root';
    const itemsRoot = document.createElement('ol');
    itemsRoot.className = 'custom-items';
    root.append(itemsRoot);
    return { root, itemsRoot, toolbarRoot };
  };
  view.renderer = () => document.createElement('li');
  view.items = [{ id: 'a' }];
  document.body.append(view);

  expect(view.firstElementChild?.className).toBe('toolbar');
  expect(view.children[1]?.className).toBe('custom-root');
  expect(view.querySelector('.custom-items > li')?.getAttribute('data-item-id')).toBe('a');
});

it('rejects structure changes after structure is mounted', () => {
  const view = new SearchCollectionViewElement();
  const errors: CustomEvent[] = [];
  view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
  view.renderer = () => document.createElement('article');
  view.items = [{ id: 1 }];
  document.body.append(view);

  view.structure = () => {
    const root = document.createElement('section');
    const itemsRoot = document.createElement('div');
    root.append(itemsRoot);
    return { root, itemsRoot };
  };

  expect(errors.at(-1)?.detail.code).toBe('invalid-structure');
  expect(view.querySelector('.scv__items')).not.toBeNull();
});

it('rejects invalid custom structures before item DOM changes', () => {
  const view = new SearchCollectionViewElement();
  const errors: CustomEvent[] = [];
  view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
  view.structure = () => {
    const root = document.createElement('section');
    const itemsRoot = document.createElement('div');
    return { root, itemsRoot };
  };
  view.renderer = () => document.createElement('article');
  view.items = [{ id: 1 }];
  document.body.append(view);

  expect(errors.at(-1)?.detail.code).toBe('invalid-structure');
  expect(view.querySelector('article')).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: structure tests fail.

- [ ] **Step 3: Implement structure validation and mounting**

Update `SearchCollectionViewElement` to:

- Lazily mount default or custom structure on first render.
- Insert `toolbarRoot` before `root` when provided.
- Create default `.scv__toolbar` when custom structure omits `toolbarRoot`.
- Require fresh `HTMLElement` nodes.
- Require `itemsRoot` to be contained by `modeRoot ?? root`.
- Require `modeRoot`, when present, to be `root` or contained by `root`.
- Reject `structure` changes after mount with `invalid-structure`.

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: all current core tests pass.

## Task 5: Handle Renderer Fragments and Renderer Errors

**Files:**
- Modify: `tests/vitest/unit/components/searchCollectionView/core.spec.ts`
- Modify: `src/components/searchCollectionView/SearchCollectionViewElement.ts`

- [ ] **Step 1: Add RED tests for fragment wrapping and renderer errors**

Append tests that verify:

```ts
it('wraps DocumentFragment renderer output in a default item wrapper', () => {
  const view = new SearchCollectionViewElement();
  view.renderer = () => {
    const fragment = document.createDocumentFragment();
    const label = document.createElement('span');
    label.textContent = 'Fragment child';
    fragment.append(label);
    return fragment;
  };
  view.items = [{ id: 'fragment' }];
  document.body.append(view);

  const wrapper = view.querySelector<HTMLElement>('.scv__item');
  expect(wrapper?.dataset.itemId).toBe('fragment');
  expect(wrapper?.textContent).toBe('Fragment child');
});

it('continues rendering other items when a renderer throws', () => {
  const view = new SearchCollectionViewElement();
  const errors: CustomEvent[] = [];
  view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
  view.renderer = (item) => {
    if (item.id === 'bad') throw new Error('boom');
    const row = document.createElement('article');
    row.textContent = String(item.id);
    return row;
  };
  view.items = [{ id: 'ok' }, { id: 'bad' }, { id: 'after' }];
  document.body.append(view);

  expect([...view.querySelectorAll('article')].map((row) => row.textContent)).toEqual(['ok', 'after']);
  expect(view.querySelector<HTMLElement>('[data-render-error="true"]')?.dataset.itemId).toBe('bad');
  expect(errors.at(-1)?.detail.code).toBe('renderer-error');
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: fragment/error tests fail.

- [ ] **Step 3: Implement fragment wrapping and renderer fallback**

Update rendering to:

- Adopt single `Element` renderer output as the item wrapper.
- Wrap `DocumentFragment` output in `.scv__item`.
- Apply `data-item-id` and `role="listitem"` to both adopted and default wrappers.
- Catch renderer errors per item.
- Create fallback `.scv__item[data-render-error="true"]` for failed items.
- Dispatch `component-error` with `renderer-error`, `itemId`, and `cause`.

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: all current core tests pass.

## Task 6: Final Verification for #586

**Files:**
- Modify only if verification finds a #586-scoped issue.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
npm test -- tests/vitest/unit/components/searchCollectionView/core.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run all unit tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run type check**

Run:

```bash
npm run check:types
```

Expected: PASS.

- [ ] **Step 4: Check diff for scope creep**

Run:

```bash
git diff --stat
```

Expected: changes are limited to SearchCollectionView core, DOM test environment, plan doc, and entrypoint registration.

## Self-Review

- Spec coverage for #586:
  - Custom element registration: Task 2.
  - `items`, `setItems`, `getItemId`, `renderer`, `structure`: Tasks 2-4.
  - Default structure and custom structure validation: Task 4.
  - Scoped light DOM: Tasks 2 and 4.
  - Item id validation: Task 3.
  - Element adoption / DocumentFragment wrapping: Tasks 2 and 5.
  - `aria-busy`, `render-complete`, `component-error`: Tasks 2, 3, and 5.
- Intentional gaps:
  - Selection, actions, mode plugins, search, CardList migration, and deck integration are explicitly left for later child issues.
- Placeholder scan:
  - No `TBD` or open-ended implementation placeholders remain.
