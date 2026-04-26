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
    view.registerViewMode({ id: 'visual', label: 'Visual' });
    view.registerViewMode({ id: 'list', label: 'List' });
    view.items = [{ id: 'a' }];
    document.body.append(view);
    const rowBefore = view.querySelector<HTMLElement>('.row');
    expect(rowBefore).not.toBeNull();

    view.mode = 'visual';
    view.mode = 'list';
    view.mode = 'visual';

    const rowAfter = view.querySelector<HTMLElement>('.row');
    expect(renderCount).toBe(1);
    expect(rowAfter).toBe(rowBefore);
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
});
