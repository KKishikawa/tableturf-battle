import { afterEach, describe, expect, it } from 'vitest';
import { SearchCollectionViewElement } from '@/components/searchCollectionView';
import type { SearchModelPlugin, SearchState } from '@/components/searchCollectionView/types';

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

  it('filters and sorts rendered item wrappers from item data without rerunning the renderer', () => {
    const view = new SearchCollectionViewElement<{ id: string; name: string; rank: number }>();
    let renderCount = 0;
    view.hiddenItemClass = 'is-hidden';
    view.renderer = (item) => {
      renderCount += 1;
      const row = document.createElement('article');
      row.className = 'row';
      row.textContent = item.name;
      return row;
    };
    view.searchModel = {
      initialState: { query: 'a', sort: 'rank' },
      match: (item, state) => item.name.toLowerCase().includes(state.query ?? ''),
      compare: (a, b, state) => (state.sort === 'rank' ? a.rank - b.rank : 0),
    };

    view.items = [
      { id: 'beta', name: 'Beta', rank: 2 },
      { id: 'alpha', name: 'Alpha', rank: 1 },
      { id: 'echo', name: 'Echo', rank: 3 },
    ];
    document.body.append(view);

    const rows = [...view.querySelectorAll<HTMLElement>('.row')];
    expect(renderCount).toBe(3);
    expect(rows.map((row) => row.dataset.itemId)).toEqual(['alpha', 'beta', 'echo']);
    expect(rows.map((row) => row.hidden)).toEqual([false, false, true]);
    expect(rows.map((row) => row.dataset.hidden)).toEqual(['false', 'false', 'true']);
    expect(rows.map((row) => row.classList.contains('is-hidden'))).toEqual([false, false, true]);

    view.hiddenItemClass = 'is-hidden';

    expect(renderCount).toBe(3);
    expect([...view.querySelectorAll<HTMLElement>('.row')]).toEqual(rows);
    expect(rows.map((row) => row.classList.contains('is-hidden'))).toEqual([false, false, true]);
    expect(rows.map((row) => row.classList.contains('visually-hidden'))).toEqual([false, false, false]);

    view.hiddenItemClass = '  visually-hidden extra-hidden  ';

    expect(renderCount).toBe(3);
    expect([...view.querySelectorAll<HTMLElement>('.row')]).toEqual(rows);
    expect(rows.map((row) => row.classList.contains('is-hidden'))).toEqual([false, false, false]);
    expect(rows.map((row) => row.classList.contains('visually-hidden'))).toEqual([false, false, true]);
    expect(rows.map((row) => row.classList.contains('extra-hidden'))).toEqual([false, false, true]);

    view.hiddenItemClass = null;

    expect(renderCount).toBe(3);
    expect([...view.querySelectorAll<HTMLElement>('.row')]).toEqual(rows);
    expect(rows.map((row) => row.classList.contains('is-hidden'))).toEqual([false, false, false]);
    expect(rows.map((row) => row.classList.contains('visually-hidden'))).toEqual([false, false, false]);
    expect(rows.map((row) => row.classList.contains('extra-hidden'))).toEqual([false, false, false]);
  });

  it('keeps the previous hidden class when a hidden item class update hits a search error', () => {
    const view = new SearchCollectionViewElement<{ id: string; name: string; rank: number }>();
    const errors: CustomEvent[] = [];
    let shouldThrow = false;
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.hiddenItemClass = 'is-hidden';
    view.renderer = (item) => {
      const row = document.createElement('article');
      row.className = 'row';
      row.textContent = item.name;
      return row;
    };
    view.searchModel = {
      initialState: { query: 'a', sort: 'rank' },
      match: (item) => {
        if (shouldThrow) throw new Error('match failed');
        return item.name !== 'Echo';
      },
      compare: () => 0,
    };
    view.items = [
      { id: 'alpha', name: 'Alpha', rank: 1 },
      { id: 'echo', name: 'Echo', rank: 2 },
    ];
    document.body.append(view);

    const rows = [...view.querySelectorAll<HTMLElement>('.row')];
    expect(errors).toHaveLength(0);
    expect(rows.map((row) => row.classList.contains('is-hidden'))).toEqual([false, true]);

    shouldThrow = true;

    view.hiddenItemClass = 'visually-hidden';

    expect(view.hiddenItemClass).toBe('is-hidden');
    expect(errors[errors.length - 1]?.detail.code).toBe('search-error');
    expect(rows.map((row) => row.classList.contains('is-hidden'))).toEqual([false, true]);
    expect(rows.map((row) => row.classList.contains('visually-hidden'))).toEqual([false, false]);
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

  it('registers view mode plugins and exposes a read-only snapshot', () => {
    const view = new SearchCollectionViewElement();
    const visualMode = { id: 'visual', label: 'Visual' };
    const listMode = { id: 'list', label: 'List' };

    view.registerViewMode(visualMode);
    view.registerViewMode(listMode);

    expect(view.viewModes).toEqual([visualMode, listMode]);
    expect(Object.isFrozen(view.viewModes)).toBe(true);

    const snapshot = view.viewModes;
    view.registerViewMode({ id: 'compact', label: 'Compact' });

    expect(snapshot).toEqual([visualMode, listMode]);
    expect(view.viewModes.map((mode) => mode.id)).toEqual(['visual', 'list', 'compact']);
  });

  it('keeps registered view mode definitions immutable from caller mutations', () => {
    const view = new SearchCollectionViewElement();
    const visualMode = {
      id: 'visual',
      label: 'Visual',
      containerClass: 'is-visual',
      itemClass: 'item-visual',
    };

    view.registerViewMode(visualMode);
    visualMode.id = 'list';
    visualMode.containerClass = 'is-mutated';
    visualMode.itemClass = 'item-mutated';
    view.registerViewMode({ id: 'list', label: 'List' });

    expect(view.viewModes.map((mode) => mode.id)).toEqual(['visual', 'list']);
    expect(view.viewModes[0]).not.toBe(visualMode);
    expect(Object.isFrozen(view.viewModes[0])).toBe(true);

    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    root.append(itemsRoot);
    view.structure = () => ({ root, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.items = [{ id: 'a' }];
    document.body.append(view);

    view.mode = 'visual';

    expect(view.mode).toBe('visual');
    expect(root.classList.contains('is-visual')).toBe(true);
    expect(root.classList.contains('is-mutated')).toBe(false);
    expect(view.querySelector('li')?.classList.contains('item-visual')).toBe(true);
    expect(view.querySelector('li')?.classList.contains('item-mutated')).toBe(false);
  });

  it('rejects duplicate view mode ids without replacing the existing plugin', () => {
    const view = new SearchCollectionViewElement();
    const errors: CustomEvent[] = [];
    const visualMode = { id: 'visual', label: 'Visual' };
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));

    view.registerViewMode(visualMode);
    view.registerViewMode({ id: 'visual', label: 'Duplicate Visual' });

    expect(view.viewModes).toEqual([visualMode]);
    expect(errors[errors.length - 1]?.detail).toMatchObject({
      code: 'duplicate-mode',
      mode: 'visual',
    });
  });

  it('synchronizes the active mode to the host attribute and mode target dataset', () => {
    const view = new SearchCollectionViewElement();
    const modeRoot = document.createElement('section');
    const root = document.createElement('div');
    const itemsRoot = document.createElement('ol');
    root.append(modeRoot);
    modeRoot.append(itemsRoot);
    view.structure = () => ({ root, modeRoot, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.registerViewMode({ id: 'visual', label: 'Visual' });
    view.registerViewMode({ id: 'list', label: 'List' });
    view.items = [{ id: 'a' }];
    document.body.append(view);

    view.mode = 'visual';

    expect(view.mode).toBe('visual');
    expect(view.getAttribute('mode')).toBe('visual');
    expect(modeRoot.dataset.mode).toBe('visual');

    view.setAttribute('mode', 'list');

    expect(view.mode).toBe('list');
    expect(modeRoot.dataset.mode).toBe('list');
  });

  it('synchronizes the active mode to the root dataset when modeRoot is omitted', () => {
    const view = new SearchCollectionViewElement();
    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    root.append(itemsRoot);
    view.structure = () => ({ root, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.registerViewMode({ id: 'visual', label: 'Visual' });
    view.items = [{ id: 'a' }];
    document.body.append(view);

    view.mode = 'visual';

    expect(view.mode).toBe('visual');
    expect(view.getAttribute('mode')).toBe('visual');
    expect(root.dataset.mode).toBe('visual');
  });

  it('preserves a pre-existing mode attribute until the matching mode is registered', () => {
    const view = new SearchCollectionViewElement();
    const modeRoot = document.createElement('section');
    const root = document.createElement('div');
    const itemsRoot = document.createElement('ol');
    root.append(modeRoot);
    modeRoot.append(itemsRoot);
    view.structure = () => ({ root, modeRoot, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.setAttribute('mode', 'visual');

    view.registerViewMode({ id: 'visual', label: 'Visual' });
    view.items = [{ id: 'a' }];
    document.body.append(view);

    expect(view.mode).toBe('visual');
    expect(view.getAttribute('mode')).toBe('visual');
    expect(modeRoot.dataset.mode).toBe('visual');
  });

  it('does not activate a stale pending mode after the host mode attribute is removed', () => {
    const view = new SearchCollectionViewElement();
    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    root.append(itemsRoot);
    view.structure = () => ({ root, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.setAttribute('mode', 'visual');
    view.registerViewMode({ id: 'list', label: 'List' });

    view.removeAttribute('mode');
    view.registerViewMode({ id: 'visual', label: 'Visual' });
    view.items = [{ id: 'a' }];
    document.body.append(view);

    expect(view.mode).toBe('');
    expect(view.getAttribute('mode')).toBeNull();
    expect(root.dataset.mode).toBeUndefined();
  });

  it('rejects an unknown mode and keeps the previous active mode', () => {
    const view = new SearchCollectionViewElement();
    const errors: CustomEvent[] = [];
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.registerViewMode({ id: 'visual', label: 'Visual' });
    view.mode = 'visual';

    view.mode = 'missing';

    expect(view.mode).toBe('visual');
    expect(view.getAttribute('mode')).toBe('visual');
    expect(errors[errors.length - 1]?.detail).toMatchObject({
      code: 'unknown-mode',
      mode: 'missing',
    });
  });

  it('switches container and item classes across visual list visual modes', () => {
    const view = new SearchCollectionViewElement();
    const modeRoot = document.createElement('section');
    const root = document.createElement('div');
    const itemsRoot = document.createElement('ol');
    root.append(modeRoot);
    modeRoot.append(itemsRoot);
    view.structure = () => ({ root, modeRoot, itemsRoot });
    view.renderer = () => {
      const row = document.createElement('li');
      row.className = 'row';
      return row;
    };
    view.registerViewMode({
      id: 'visual',
      label: 'Visual',
      containerClass: 'is-visual',
      itemClass: 'item-visual',
    });
    view.registerViewMode({
      id: 'list',
      label: 'List',
      containerClass: 'is-list',
      itemClass: 'item-list',
    });
    view.items = [{ id: 'a' }];
    document.body.append(view);
    const rowBefore = view.querySelector<HTMLElement>('.row');
    expect(rowBefore).not.toBeNull();

    view.mode = 'visual';
    const visualRow = view.querySelector<HTMLElement>('.row');
    expect(modeRoot.classList.contains('is-visual')).toBe(true);
    expect(modeRoot.classList.contains('is-list')).toBe(false);
    expect(visualRow?.classList.contains('item-visual')).toBe(true);
    expect(visualRow?.classList.contains('item-list')).toBe(false);

    view.mode = 'list';
    const listRow = view.querySelector<HTMLElement>('.row');
    expect(modeRoot.classList.contains('is-list')).toBe(true);
    expect(modeRoot.classList.contains('is-visual')).toBe(false);
    expect(listRow?.classList.contains('item-list')).toBe(true);
    expect(listRow?.classList.contains('item-visual')).toBe(false);

    view.mode = 'visual';

    const finalVisualRow = view.querySelector<HTMLElement>('.row');
    expect(modeRoot.classList.contains('is-visual')).toBe(true);
    expect(modeRoot.classList.contains('is-list')).toBe(false);
    expect(finalVisualRow?.classList.contains('item-visual')).toBe(true);
    expect(finalVisualRow?.classList.contains('item-list')).toBe(false);
  });

  it('installs view mode styles once in registration order', () => {
    const view = new SearchCollectionViewElement();
    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    root.append(itemsRoot);
    view.structure = () => ({ root, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.registerViewMode({
      id: 'visual',
      label: 'Visual',
      styles: '.is-visual { display: grid; }',
    });
    view.registerViewMode({
      id: 'list',
      label: 'List',
      styles: '.is-list { display: block; }',
    });
    view.items = [{ id: 'a' }];
    document.body.append(view);

    view.mode = 'list';
    view.mode = 'visual';
    view.mode = 'list';

    expect([...view.querySelectorAll('style')].map((style) => style.textContent)).toEqual([
      '.is-visual { display: grid; }',
      '.is-list { display: block; }',
    ]);
  });

  it('runs view mode lifecycle hooks in activation order', () => {
    const view = new SearchCollectionViewElement();
    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    root.append(itemsRoot);
    const calls: string[] = [];
    view.structure = () => ({ root, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.registerViewMode({
      id: 'visual',
      label: 'Visual',
      activate: () => calls.push('activate:visual'),
      deactivate: () => calls.push('deactivate:visual'),
    });
    view.registerViewMode({
      id: 'list',
      label: 'List',
      activate: () => calls.push('activate:list'),
      deactivate: () => calls.push('deactivate:list'),
    });
    view.items = [{ id: 'a' }];
    document.body.append(view);

    view.mode = 'visual';
    view.mode = 'list';
    view.mode = 'visual';

    expect(calls).toEqual([
      'activate:visual',
      'deactivate:visual',
      'activate:list',
      'deactivate:list',
      'activate:visual',
    ]);
  });

  it('reports activate hook errors without rejecting the active visual mode', () => {
    const view = new SearchCollectionViewElement();
    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    const errors: CustomEvent[] = [];
    const cause = new Error('activate failed');
    root.append(itemsRoot);
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.structure = () => ({ root, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.registerViewMode({
      id: 'visual',
      label: 'Visual',
      containerClass: 'is-visual',
      itemClass: 'item-visual',
      activate: () => {
        throw cause;
      },
    });
    view.items = [{ id: 'a' }];
    document.body.append(view);

    expect(() => {
      view.mode = 'visual';
    }).not.toThrow();

    expect(errors[errors.length - 1]?.detail).toMatchObject({
      code: 'view-mode-error',
      mode: 'visual',
      cause,
    });
    expect(view.mode).toBe('visual');
    expect(view.getAttribute('mode')).toBe('visual');
    expect(root.dataset.mode).toBe('visual');
    expect(root.classList.contains('is-visual')).toBe(true);
    expect(view.querySelector('li')?.classList.contains('item-visual')).toBe(true);
  });

  it('reports deactivate hook errors while switching to the new active mode', () => {
    const view = new SearchCollectionViewElement();
    const root = document.createElement('section');
    const itemsRoot = document.createElement('ol');
    const errors: CustomEvent[] = [];
    const cause = new Error('deactivate failed');
    root.append(itemsRoot);
    view.addEventListener('component-error', (event) => errors.push(event as CustomEvent));
    view.structure = () => ({ root, itemsRoot });
    view.renderer = () => document.createElement('li');
    view.registerViewMode({
      id: 'visual',
      label: 'Visual',
      containerClass: 'is-visual',
      itemClass: 'item-visual',
      deactivate: () => {
        throw cause;
      },
    });
    view.registerViewMode({
      id: 'list',
      label: 'List',
      containerClass: 'is-list',
      itemClass: 'item-list',
    });
    view.items = [{ id: 'a' }];
    document.body.append(view);
    view.mode = 'visual';

    expect(() => {
      view.mode = 'list';
    }).not.toThrow();

    expect(errors[errors.length - 1]?.detail).toMatchObject({
      code: 'view-mode-error',
      mode: 'visual',
      cause,
    });
    expect(view.mode).toBe('list');
    expect(view.getAttribute('mode')).toBe('list');
    expect(root.dataset.mode).toBe('list');
    expect(root.classList.contains('is-list')).toBe(true);
    expect(root.classList.contains('is-visual')).toBe(false);
    expect(view.querySelector('li')?.classList.contains('item-list')).toBe(true);
    expect(view.querySelector('li')?.classList.contains('item-visual')).toBe(false);
  });

  it('preserves item DOM and does not rerun renderer during mode switches', () => {
    const view = new SearchCollectionViewElement();
    const modeRoot = document.createElement('section');
    const root = document.createElement('div');
    const itemsRoot = document.createElement('ol');
    root.append(modeRoot);
    modeRoot.append(itemsRoot);
    let renderCount = 0;
    view.structure = () => ({ root, modeRoot, itemsRoot });
    view.renderer = () => {
      renderCount += 1;
      const row = document.createElement('li');
      row.className = 'row';
      return row;
    };
    view.registerViewMode({
      id: 'visual',
      label: 'Visual',
      containerClass: 'is-visual',
      itemClass: 'item-visual',
    });
    view.registerViewMode({
      id: 'list',
      label: 'List',
      containerClass: 'is-list',
      itemClass: 'item-list',
    });
    view.items = [{ id: 'a' }];
    document.body.append(view);
    const rowBefore = view.querySelector<HTMLElement>('.row');
    expect(rowBefore).not.toBeNull();

    view.mode = 'visual';
    const visualRow = view.querySelector<HTMLElement>('.row');
    view.mode = 'list';
    const listRow = view.querySelector<HTMLElement>('.row');
    view.mode = 'visual';

    const rowAfter = view.querySelector<HTMLElement>('.row');
    expect(renderCount).toBe(1);
    expect(visualRow).toBe(rowBefore);
    expect(listRow).toBe(rowBefore);
    expect(rowAfter).toBe(rowBefore);
    expect(modeRoot.classList.contains('is-visual')).toBe(true);
    expect(modeRoot.classList.contains('is-list')).toBe(false);
    expect(rowAfter?.classList.contains('item-visual')).toBe(true);
    expect(rowAfter?.classList.contains('item-list')).toBe(false);
  });

  it('dispatches mode-change with mode and previousMode only when the mode changes', () => {
    const view = new SearchCollectionViewElement();
    const events: CustomEvent[] = [];
    view.addEventListener('mode-change', (event) => events.push(event as CustomEvent));
    view.registerViewMode({ id: 'visual', label: 'Visual' });
    view.registerViewMode({ id: 'list', label: 'List' });

    view.mode = 'visual';
    view.mode = 'visual';
    view.mode = 'list';

    expect(events.map((event) => event.detail)).toEqual([
      { mode: 'visual', previousMode: null },
      { mode: 'list', previousMode: 'visual' },
    ]);
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

  it('accepts a typed search model plugin API', () => {
    type Item = { id: string; name: string; rank: number };
    const initialState: SearchState = {
      query: 'a',
      filters: { minRank: 2 },
      sort: 'rank',
    };
    const plugin: SearchModelPlugin<Item> = {
      initialState,
      match: (item, state) => item.name.includes(state.query ?? ''),
      compare: (a, b, state) => (state.sort === 'rank' ? a.rank - b.rank : 0),
    };
    const view = new SearchCollectionViewElement<Item>();

    view.searchModel = plugin;

    expect(view.searchModel).toBe(plugin);
  });
});
