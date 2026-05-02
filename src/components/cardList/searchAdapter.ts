import { isValidString } from '@/utils';
import { toInt } from '@/utils/convert';
import { inkCount, type ICard } from '@/models/card';
import {
  SearchCollectionViewElement,
  type SearchCollectionItem,
  type SearchModelPlugin,
  type SearchState,
  type SearchUiPlugin,
} from '@/components/searchCollectionView';

export interface CardListSearchFilters {
  minGrid: number;
  maxGrid: number;
  minSp: number;
  maxSp: number;
}

export type CardListSearchState = SearchState & {
  query?: string;
  sort?: string;
  filters?: CardListSearchFilters;
};

export type CardListSearchItem = ICard & SearchCollectionItem;

const DEFAULT_FILTERS: CardListSearchFilters = {
  minGrid: 0,
  maxGrid: Number.MAX_SAFE_INTEGER,
  minSp: 0,
  maxSp: Number.MAX_SAFE_INTEGER,
};

export function createDefaultCardListSearchState(sort = '0'): CardListSearchState {
  return {
    query: '',
    sort,
    filters: { ...DEFAULT_FILTERS },
  };
}

export function createCardListSearchModel(): SearchModelPlugin<CardListSearchItem> {
  return {
    initialState: createDefaultCardListSearchState(),
    match(card, state) {
      const cardState = normalizeCardListSearchState(state);
      if (!matchesCardListQuery(card, cardState)) return false;
      if (!matchesCardListFilters(card, cardState.filters)) return false;
      return true;
    },
    compare(a, b, state) {
      return compareCardsBySort(a, b, normalizeCardListSearchState(state).sort);
    },
  };
}

export function readCardListSearchState(root: ParentNode, searchEnabled: boolean): CardListSearchState {
  const sort = root.querySelector<HTMLSelectElement>('.table-sort')?.value ?? '0';
  if (!searchEnabled) {
    return createDefaultCardListSearchState(sort);
  }

  return {
    query: root.querySelector<HTMLInputElement>('.input_cardlist_serch')?.value ?? '',
    sort,
    filters: {
      minGrid: toInt(root.querySelector<HTMLInputElement>('#min-grid')?.value, 0),
      maxGrid: toInt(root.querySelector<HTMLInputElement>('#max-grid')?.value, Number.MAX_SAFE_INTEGER),
      minSp: toInt(root.querySelector<HTMLInputElement>('#min-sp')?.value, 0),
      maxSp: toInt(root.querySelector<HTMLInputElement>('#max-sp')?.value, Number.MAX_SAFE_INTEGER),
    },
  };
}

export function createCardListSearchUi(
  view: SearchCollectionViewElement<CardListSearchItem>,
  searchEnabled: boolean,
): SearchUiPlugin<CardListSearchItem> {
  let controller: AbortController | null = null;
  return {
    render(context) {
      controller?.abort();
      const root = document.createElement('span');
      root.className = 'cardlist-search-adapter';
      root.hidden = true;

      const nextController = new AbortController();
      controller = nextController;
      const syncState = () => context.setState(readCardListSearchState(view, searchEnabled));

      view.querySelector<HTMLSelectElement>('.table-sort')?.addEventListener('change', syncState, {
        signal: nextController.signal,
      });

      const form = view.querySelector<HTMLFormElement>('.cardlist_serch');
      form?.addEventListener(
        'submit',
        (event) => {
          event.preventDefault();
          syncState();
        },
        { signal: nextController.signal },
      );

      form?.querySelectorAll('.input-clear').forEach((el) =>
        el.addEventListener(
          'click',
          () => {
            setTimeout(syncState);
          },
          { signal: nextController.signal },
        ),
      );

      form?.querySelector('.button_search_clear')?.addEventListener(
        'click',
        () => {
          form.reset();
          form.querySelectorAll<HTMLElement>('[data-clearable]').forEach((el) => {
            el.dataset['clearable'] = '';
          });
          syncState();
        },
        { signal: nextController.signal },
      );
      return root;
    },
    update() {
      // Visible controls live in CardList; keep this sentinel stable.
    },
    destroy() {
      controller?.abort();
      controller = null;
    },
  };
}

function matchesCardListQuery(card: ICard, state: Required<CardListSearchState>) {
  return !isValidString(state.query) || card.ja.includes(state.query);
}

function matchesCardListFilters(card: ICard, filters: CardListSearchFilters) {
  const gridCount = inkCount(card.g, card.sg);
  if (gridCount < filters.minGrid || gridCount > filters.maxGrid) return false;
  if (card.sp < filters.minSp || card.sp > filters.maxSp) return false;
  return true;
}

export function normalizeCardListSearchState(state: SearchState): Required<CardListSearchState> {
  const filters = state.filters ?? {};
  return {
    query: state.query ?? '',
    sort: state.sort ?? '0',
    filters: {
      minGrid: toFiniteNumber(filters.minGrid, DEFAULT_FILTERS.minGrid),
      maxGrid: toFiniteNumber(filters.maxGrid, DEFAULT_FILTERS.maxGrid),
      minSp: toFiniteNumber(filters.minSp, DEFAULT_FILTERS.minSp),
      maxSp: toFiniteNumber(filters.maxSp, DEFAULT_FILTERS.maxSp),
    },
  };
}

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function compareCardsBySort(a: ICard, b: ICard, sort: string) {
  switch (sort) {
    case '1':
      return noAsc(b, a);
    case '2':
      return gcountAsc(a, b);
    case '3':
      return gcountAsc(b, a);
    case '4':
      return spAsc(a, b);
    case '5':
      return spAsc(b, a);
    case '6':
      return rarityAsc(a, b);
    case '7':
      return rarityAsc(b, a);
    default:
      return noAsc(a, b);
  }
}

const noAsc = (a: ICard, b: ICard) => a.n - b.n;
const gJudge = (a: ICard, b: ICard) => inkCount(a.g, a.sg) - inkCount(b.g, b.sg);
const spJudge = (a: ICard, b: ICard) => a.sp - b.sp;
const rarityJudge = (a: ICard, b: ICard) => a.r - b.r;

function gcountAsc(a: ICard, b: ICard) {
  const gridCompared = gJudge(a, b);
  if (gridCompared !== 0) return gridCompared;
  const spCompared = spJudge(a, b);
  if (spCompared !== 0) return spCompared;
  return noAsc(a, b);
}

function spAsc(a: ICard, b: ICard) {
  const spCompared = spJudge(a, b);
  if (spCompared !== 0) return spCompared;
  const gridCompared = gJudge(a, b);
  if (gridCompared !== 0) return gridCompared;
  return noAsc(a, b);
}

function rarityAsc(a: ICard, b: ICard) {
  const rarityCompared = rarityJudge(a, b);
  if (rarityCompared !== 0) return rarityCompared;
  return gcountAsc(a, b);
}
