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
    expect(errors[errors.length - 1]?.detail.code).toBe('missing-item-id');
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
    expect(errors[errors.length - 1]?.detail.code).toBe('duplicate-item-id');
  });

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

  it('allows custom structure after renderer is set but before items create DOM', () => {
    const view = new SearchCollectionViewElement();
    view.renderer = () => document.createElement('li');
    view.structure = () => {
      const root = document.createElement('section');
      root.className = 'late-root';
      const itemsRoot = document.createElement('ol');
      root.append(itemsRoot);
      return { root, itemsRoot };
    };

    view.items = [{ id: 'late' }];
    document.body.append(view);

    expect(view.querySelector('.late-root li')?.getAttribute('data-item-id')).toBe('late');
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

    expect(errors[errors.length - 1]?.detail.code).toBe('invalid-structure');
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

    expect(errors[errors.length - 1]?.detail.code).toBe('invalid-structure');
    expect(view.querySelector('article')).toBeNull();
  });

  it('rejects custom structure callbacks that return nullish values', () => {
    const view = new SearchCollectionViewElement();
    const errors: CustomEvent[] = [];
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.structure = (() => null) as never;
    view.renderer = () => document.createElement('article');

    expect(() => {
      view.items = [{ id: 1 }];
    }).not.toThrow();

    expect(errors[errors.length - 1]?.detail.code).toBe('invalid-structure');
    expect(view.querySelector('article')).toBeNull();
  });

  it('reports invalid-structure when a custom structure callback throws', () => {
    const view = new SearchCollectionViewElement();
    const errors: CustomEvent[] = [];
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.structure = (() => {
      throw new Error('bad structure');
    }) as never;
    view.renderer = () => document.createElement('article');

    expect(() => {
      view.items = [{ id: 1 }];
    }).not.toThrow();

    expect(errors[errors.length - 1]?.detail.code).toBe('invalid-structure');
    expect(errors[errors.length - 1]?.detail.cause).toBeInstanceOf(Error);
    expect(view.querySelector('article')).toBeNull();
  });

  it('rejects custom structures that reuse connected nodes', () => {
    const connectedRoot = document.createElement('section');
    const connectedItemsRoot = document.createElement('ol');
    connectedRoot.append(connectedItemsRoot);
    document.body.append(connectedRoot);

    const view = new SearchCollectionViewElement();
    const errors: CustomEvent[] = [];
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.structure = () => ({ root: connectedRoot, itemsRoot: connectedItemsRoot });
    view.renderer = () => document.createElement('li');

    view.items = [{ id: 'connected' }];

    expect(errors[errors.length - 1]?.detail.code).toBe('invalid-structure');
    expect(view.querySelector('li')).toBeNull();
    expect(document.body.firstElementChild).toBe(connectedRoot);
  });

  it('rejects custom structure roots already parented outside the returned structure', () => {
    const externalParent = document.createElement('div');
    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    root.append(itemsRoot);
    externalParent.append(root);

    const view = new SearchCollectionViewElement();
    const errors: CustomEvent[] = [];
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.structure = () => ({ root, itemsRoot });
    view.renderer = () => document.createElement('li');

    view.items = [{ id: 'parented' }];

    expect(errors[errors.length - 1]?.detail.code).toBe('invalid-structure');
    expect(view.querySelector('li')).toBeNull();
    expect(root.parentElement).toBe(externalParent);
  });

  it('rejects custom structures that reuse the same node for multiple roots', () => {
    const root = document.createElement('section');

    const view = new SearchCollectionViewElement();
    const errors: CustomEvent[] = [];
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.structure = () => ({ root, itemsRoot: root });
    view.renderer = () => document.createElement('li');

    view.items = [{ id: 'same-node' }];

    expect(errors[errors.length - 1]?.detail.code).toBe('invalid-structure');
    expect(view.querySelector('li')).toBeNull();
  });

  it('allows modeRoot to be the same node as itemsRoot', () => {
    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    root.append(itemsRoot);

    const view = new SearchCollectionViewElement();
    const errors: CustomEvent[] = [];
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.structure = () => ({ root, modeRoot: itemsRoot, itemsRoot });
    view.renderer = () => document.createElement('li');

    view.items = [{ id: 'mode-items-root' }];
    document.body.append(view);

    expect(errors).toHaveLength(0);
    expect(view.querySelector('ol > li')?.getAttribute('data-item-id')).toBe('mode-items-root');
  });

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
    expect(errors[errors.length - 1]?.detail.code).toBe('renderer-error');
  });

  it('updates selected item wrapper attributes without rerendering items', () => {
    const view = new SearchCollectionViewElement();
    let renderCount = 0;
    const selectionChanges: CustomEvent[] = [];
    view.addEventListener('selection-change', (event) => selectionChanges.push(event as CustomEvent));
    view.renderer = (item, context) => {
      renderCount += 1;
      const row = document.createElement('article');
      row.className = 'row';
      row.textContent = `${context.itemId}:${context.selected ? 'selected' : 'unselected'}`;
      return row;
    };
    view.items = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ];
    document.body.append(view);

    const rowsBefore = [...view.querySelectorAll<HTMLElement>('.row')];

    view.setSelectedItemIds(['b']);

    const rowsAfter = [...view.querySelectorAll<HTMLElement>('.row')];
    expect(renderCount).toBe(2);
    expect(rowsAfter).toEqual(rowsBefore);
    expect(rowsAfter.map((row) => row.getAttribute('data-selected'))).toEqual(['false', 'true']);
    expect([...view.selectedItemIds]).toEqual(['b']);
    expect(selectionChanges).toHaveLength(1);
    expect(selectionChanges[0]?.detail).toEqual({
      selectedItemIds: ['b'],
      previousSelectedItemIds: [],
    });
  });

  it('passes selected snapshot to the renderer during item rendering', () => {
    const view = new SearchCollectionViewElement();
    const renderedSelectionStates: boolean[] = [];
    view.setSelectedItemIds(['b']);
    view.renderer = (_item, context) => {
      renderedSelectionStates.push(context.selected);
      const row = document.createElement('article');
      row.className = 'row';
      return row;
    };

    view.items = [{ id: 'a' }, { id: 'b' }];

    expect(renderedSelectionStates).toEqual([false, true]);
  });

  it('dispatches item-action for data-action clicks inside the owning item wrapper', () => {
    const view = new SearchCollectionViewElement<{ id: string; name: string }>();
    const actions: CustomEvent[] = [];
    view.addEventListener('item-action', (event) => actions.push(event as CustomEvent));
    view.renderer = (item) => {
      const row = document.createElement('article');
      row.className = 'row';
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'add';
      button.textContent = item.name;
      row.append(button);
      return row;
    };
    view.items = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ];
    document.body.append(view);

    view.querySelector<HTMLButtonElement>('[data-item-id="b"] [data-action="add"]')?.click();

    expect(actions).toHaveLength(1);
    expect(actions[0]?.detail).toEqual({
      itemId: 'b',
      item: { id: 'b', name: 'Beta' },
      action: 'add',
    });
  });

  it('dispatches item-action with the same detail shape from renderer context emitAction', () => {
    const view = new SearchCollectionViewElement<{ id: string; name: string }>();
    const actions: CustomEvent[] = [];
    let emitFromItemB: () => void = () => {
      throw new Error('emitAction was not captured');
    };
    view.addEventListener('item-action', (event) => actions.push(event as CustomEvent));
    view.renderer = (item, context) => {
      if (item.id === 'b') {
        emitFromItemB = () => context.emitAction('delete', { source: 'keyboard' });
      }
      return document.createElement('article');
    };
    view.items = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ];
    document.body.append(view);

    emitFromItemB();

    expect(actions).toHaveLength(1);
    expect(actions[0]?.detail).toEqual({
      itemId: 'b',
      item: { id: 'b', name: 'Beta' },
      action: 'delete',
      detail: { source: 'keyboard' },
    });
  });

  it('ignores nested renderer-owned data-item-id when resolving delegated item actions', () => {
    const view = new SearchCollectionViewElement<{ id: string; name: string }>();
    const actions: CustomEvent[] = [];
    view.addEventListener('item-action', (event) => actions.push(event as CustomEvent));
    view.renderer = (item) => {
      const row = document.createElement('article');
      row.className = 'row';

      if (item.id === 'b') {
        const nested = document.createElement('span');
        nested.dataset.itemId = 'a';
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.action = 'inspect';
        button.textContent = item.name;
        nested.append(button);
        row.append(nested);
      }

      return row;
    };
    view.items = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ];
    document.body.append(view);

    view.querySelector<HTMLButtonElement>('[data-item-id="b"] [data-action="inspect"]')?.click();

    expect(actions).toHaveLength(1);
    expect(actions[0]?.detail).toEqual({
      itemId: 'b',
      item: { id: 'b', name: 'Beta' },
      action: 'inspect',
    });
  });

  it('reapplies selected state to existing wrappers when selectionAttribute changes', () => {
    const view = new SearchCollectionViewElement();
    let renderCount = 0;
    view.renderer = () => {
      renderCount += 1;
      const row = document.createElement('article');
      row.className = 'row';
      return row;
    };
    view.items = [{ id: 'a' }, { id: 'b' }];
    document.body.append(view);
    const rowsBefore = [...view.querySelectorAll<HTMLElement>('.row')];

    view.setSelectedItemIds(['a']);
    view.selectionAttribute = { selected: '1', unselected: null };

    const rowsAfter = [...view.querySelectorAll<HTMLElement>('.row')];
    expect(renderCount).toBe(2);
    expect(rowsAfter).toEqual(rowsBefore);
    expect(rowsAfter[0]?.getAttribute('data-selected')).toBe('1');
    expect(rowsAfter[1]?.hasAttribute('data-selected')).toBe(false);
  });

  it('returns a selectionAttribute snapshot so external mutation cannot bypass the setter', () => {
    const view = new SearchCollectionViewElement();
    view.renderer = () => {
      const row = document.createElement('article');
      row.className = 'row';
      return row;
    };
    view.items = [{ id: 'a' }];
    document.body.append(view);

    const attributeSnapshot = view.selectionAttribute;
    attributeSnapshot.selected = '1';
    view.setSelectedItemIds(['a']);

    expect(view.querySelector<HTMLElement>('.row')?.getAttribute('data-selected')).toBe('true');
  });

  it('copies assigned selectionAttribute so external mutation cannot bypass the setter', () => {
    const view = new SearchCollectionViewElement();
    view.renderer = () => {
      const row = document.createElement('article');
      row.className = 'row';
      return row;
    };
    view.items = [{ id: 'a' }];
    document.body.append(view);

    const adapter = { selected: '1', unselected: null };
    view.selectionAttribute = adapter;
    adapter.selected = '2';
    view.setSelectedItemIds(['a']);

    expect(view.querySelector<HTMLElement>('.row')?.getAttribute('data-selected')).toBe('1');
  });
});
