import { isValidString } from '@/utils';
import { inkCount, type ICard } from '@/models/card';
import type { SearchCollectionItem, SearchModelPlugin, SearchState } from '@/components/searchCollectionView';

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
