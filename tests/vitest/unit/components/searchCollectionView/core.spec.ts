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
});
