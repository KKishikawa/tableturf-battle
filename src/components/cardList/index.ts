import mustache from 'mustache';
import { isValidString, $dom, mesureWidth } from '@/utils';
import { toInt } from '@/utils/convert';
import {
  ICard,
  RARITY,
  inkCount,
  encodeDeckCode,
  availableInkCount,
  availableSP,
} from '@/models/card';
import { createCardGrid } from '@/components/cardGrid';
import { ModalDialog } from '@/components/dialog';
import {
  SearchCollectionViewElement,
  type SearchCollectionStructure,
  type ViewModePlugin,
} from '@/components/searchCollectionView';
import tableHTML from './table.html.mustache?raw';
import tableRowHTML from './row.html.mustache?raw';
import deckInfoHTML from './deckInfoModalBody.html.mustache?raw';
import { showShareMsg } from '../deckShare';

interface IinternalSortRowInfo {
  row: HTMLElement;
  info: ICard;
  gcount: number;
}
type sortJudgeFunc = (a: IinternalSortRowInfo, b: IinternalSortRowInfo) => number;

interface IListOparationOpt {
  name?: string;
  maxg: number;
  ming: number;
  maxsp: number;
  minsp: number;
}

export interface ICardListOption {
  search: boolean;
  title: string;
}

type CardListItem = ICard & { id?: string | number };

interface CardListStructure extends SearchCollectionStructure {
  root: HTMLElement;
  modeRoot: HTMLElement;
  itemsRoot: HTMLUListElement;
  toolbarRoot: HTMLElement;
}

export class CardList {
  readonly wrapper: SearchCollectionViewElement<CardListItem>;
  readonly body: HTMLUListElement;
  protected readonly srch: boolean;
  protected readonly cards: CardListItem[] = [];

  constructor(option: ICardListOption) {
    const template = $dom(mustache.render(tableHTML, { srch: option.search, title: option.title }));
    const wrapper = new SearchCollectionViewElement<CardListItem>();
    wrapper.className = template.className;
    while (template.firstChild) wrapper.append(template.firstChild);
    const tableCaption = wrapper.querySelector('.table-caption-title') as HTMLElement | null;
    const table = this.createCardListStructure(tableCaption);
    this.wrapper = wrapper;
    this.body = table.itemsRoot;
    this.srch = option.search;

    this.wrapper.structure = () => table;
    this.wrapper.getItemId = (card) => card.id ?? card.n;
    this.wrapper.renderer = (card) => createCardRow(card, this.srch);
    this.wrapper.selectionAttribute = { selected: '1', unselected: null };
    this.wrapper.hiddenItemClass = 'card--hidden';
    this.wrapper.registerViewMode(this.createCardListViewMode('grid'));
    this.wrapper.registerViewMode(this.createCardListViewMode('table'));
    this.wrapper.mode = 'grid';

    {
      const layoutButtons = table.toolbarRoot.querySelectorAll<HTMLElement>('[data-button_type]');
      layoutButtons.forEach((el) => {
        el.addEventListener('click', (e) => {
          layoutButtons.forEach((button) => button.classList.remove('button-active'));
          const button = e.currentTarget as HTMLButtonElement;
          button.classList.add('button-active');
          this.wrapper.mode = button.dataset['button_type']!;
        });
      });

      table.toolbarRoot.querySelector<HTMLSelectElement>('.table-sort')?.addEventListener('change', () => {
        this.filterSortRow();
      });
    }

    if (option.search) {
      const form = table.toolbarRoot.querySelector('.cardlist_serch') as HTMLFormElement;
      form.onsubmit = (e) => {
        e.preventDefault();
        this.filterSortRow();
      };
      form.querySelectorAll('.input-clear').forEach((el) =>
        el.addEventListener('click', () => {
          setTimeout(() => {
            this.filterSortRow();
          });
        }),
      );
      form.querySelector('.button_search_clear')!.addEventListener('click', () => {
        form.reset();
        form.querySelectorAll<HTMLElement>('[data-clearable]').forEach((el) => {
          el.dataset['clearable'] = '';
        });
        this.filterSortRow();
      });
    }

    const activeModeButton = table.toolbarRoot.querySelector<HTMLButtonElement>('[data-button_type="grid"]');
    activeModeButton?.classList.add('button-active');

    tableCaption?.remove();
    this.wrapper.items = this.cards;
  }

  findRowByNo(card_no: number) {
    return this.body.querySelector<HTMLElement>(`[data-card_no="${card_no}"]`);
  }

  addRow(...cards: ICard[]) {
    this.cards.push(...cards);
    this.renderCards();
  }

  findCardByNo(card_no: number) {
    const tr = this.findRowByNo(card_no);
    if (!tr) return null;
    return getCardRowInfo(tr);
  }

  removeRowByNo(card_no: number) {
    const index = this.cards.findIndex((card) => card.n === card_no);
    if (index >= 0) this.cards.splice(index, 1);
    this.renderCards();
  }

  clearRows() {
    this.cards.length = 0;
    this.renderCards();
  }

  setSelectedCardNos(cardNos: Iterable<string | number>) {
    this.wrapper.setSelectedItemIds(cardNos);
  }

  setCardSelected(cardNo: string | number, selected: boolean) {
    const selectedNos = new Set(this.wrapper.selectedItemIds);
    const key = String(cardNo);
    if (selected) {
      selectedNos.add(key);
    } else {
      selectedNos.delete(key);
    }
    this.wrapper.setSelectedItemIds(selectedNos);
  }

  checkRow(tr?: HTMLElement) {
    this.wrapper.setSelectedItemIds(tr ? [tr.dataset['card_no'] ?? ''] : []);
  }

  filterSortRow() {
    const sortVal = (this.wrapper.querySelector('.table-sort') as HTMLSelectElement).value;
    const text = this.srch ? (this.wrapper.querySelector('.input_cardlist_serch') as HTMLInputElement).value : '';
    const inputs = this.srch
      ? ['min-grid', 'max-grid', 'min-sp', 'max-sp'].map((idName, idx) => {
          const e = this.wrapper.querySelector(`#${idName}`) as HTMLInputElement;
          return toInt(e.value, idx & 1 ? Number.MAX_SAFE_INTEGER : 0);
        })
      : [0, Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER];

    const cards = [...this.cards];
    const infoR = generateSortRowInfo(cards.map((card) => this.findRowByNo(card.n)!).filter(Boolean));
    if (this.srch) {
      filerRow(infoR, {
        name: text,
        ming: inputs[0],
        maxg: inputs[1],
        minsp: inputs[2],
        maxsp: inputs[3],
      });
    }

    infoR.sort(getSortRow(sortVal));
    this.body.replaceChildren(...infoR.map((info) => info.row));
  }

  protected renderCards() {
    this.wrapper.items = [...this.cards];
    this.filterSortRow();
  }

  protected createCardListStructure(tableCaption: HTMLElement | null): CardListStructure {
    const root = document.createElement('div');
    root.className = 'cardlist_table';
    root.tabIndex = -1;
    root.dataset.layout = 'grid';

    const modeRoot = root;
    modeRoot.dataset.mode = 'grid';

    const head = document.createElement('div');
    head.className = 'cardlist_table_head';
    head.innerHTML = `
      <div class="col-no text-center">
        <span class="xl:hidden">No.</span><span class="hidden xl:inline">ナンバー</span>
      </div>
      <div class="col-gridcount flex items-center justify-center">
        <div class="gridcount mr-3 after:h-3 after:w-3"></div>
        <span>マス</span>
      </div>
      <div class="col-sp flex items-center justify-center">
        <div class="sp-fill mr-px h-2 w-2"></div>
        <span>SP</span>
      </div>
      <div class="col-rarity text-center">
        <span class="hidden sm:inline md:hidden lg:inline">レア度</span>
      </div>
      <div class="col-name">名前</div>
      <div class="col-action"></div>
    `;

    const itemsRoot = document.createElement('ul');
    itemsRoot.className = 'cardlist_table_body';
    itemsRoot.setAttribute('role', 'list');
    modeRoot.append(head, itemsRoot);

    const toolbarRoot = document.createElement('div');
    if (tableCaption) {
      toolbarRoot.className = tableCaption.className;
      toolbarRoot.innerHTML = tableCaption.innerHTML;
    } else {
      toolbarRoot.className = 'cardlist_table_toolbar';
    }

    return { root, modeRoot, itemsRoot, toolbarRoot };
  }

  protected createCardListViewMode(id: 'grid' | 'table'): ViewModePlugin {
    return {
      id,
      label: id,
      activate(modeTarget) {
        modeTarget.dataset.layout = id;
        modeTarget.dataset.mode = id;
      },
    };
  }
}

function generateDeckInfoTitle(count: number) {
  return `デッキ (${count}/15)`;
}

export class DeckInfo extends CardList {
  constructor() {
    super({ search: false, title: generateDeckInfoTitle(0) });
    const btnDeckInfo = this.wrapper.querySelector('#button-deck-info') as HTMLElement;
    btnDeckInfo?.addEventListener('click', () => {
      const allInfo = [...(this.body.children as HTMLCollectionOf<HTMLElement>)].map((tr) => {
        const c = getCardRowInfo(tr);
        const gcount = inkCount(c.g, c.sg);
        return { ...c, gcount };
      });
      const gcountr = allInfo.reduce<[0, Map<number, number>, Map<number, number>]>(
        (a, b) => {
          a[0] += b.gcount;
          a[1].set(b.gcount, (a[1].get(b.gcount) ?? 0) + 1);
          a[2].set(b.sp, (a[2].get(b.sp) ?? 0) + 1);
          return a;
        },
        [0, new Map(availableInkCount.map((c) => [c, 0])), new Map(availableSP.map((c) => [c, 0]))],
      );
      const toStyleHeightLiteral = (n: number) => (isFinite(n) ? `style="height:${n}%"` : undefined);
      const _gcs = [...gcountr[1]];
      const gMaxCount = Math.max(..._gcs.map((v) => v[1]));
      const gcs = _gcs
        .map((g) => ({
          k: g[0],
          v: toStyleHeightLiteral((g[1] * 100) / gMaxCount),
        }))
        .sort((a, b) => a.k - b.k);
      const _sp = [...gcountr[2]];
      const spMax = Math.max(..._sp.map((v) => v[1]));
      const sps = _sp
        .map((g) => ({
          k: g[0],
          v: toStyleHeightLiteral((g[1] * 100) / spMax),
        }))
        .sort((a, b) => a.k - b.k);
      const modal = new ModalDialog({
        title: 'デッキ情報',
        bodyHTML: mustache.render(deckInfoHTML, {
          count: allInfo.length,
          gcount: gcountr[0],
          gcs,
          sps,
        }),
      });
      modal.element.querySelector(`[data-action="share"]`)?.addEventListener('click', function () {
        showShareMsg(encodeDeckCode(allInfo.map((info) => info.n)));
      });
    });
  }

  removeRowByNo(card_no: number) {
    const row = super.findRowByNo(card_no);
    if (row) this.removeRow(row);
  }

  removeRow(row: HTMLElement) {
    const cardNo = toInt(row.dataset['card_no']);
    const index = this.cards.findIndex((card) => card.n === cardNo);
    if (index >= 0) {
      this.cards.splice(index, 1);
      this.renderCards();
    } else {
      row.remove();
    }
    this.showCount();
  }

  addRow(...cards: ICard[]): void {
    const existingCardNos = new Set(this.cards.map((card) => card.n));
    const uniqueCards = cards.filter((card) => {
      if (existingCardNos.has(card.n)) return false;
      existingCardNos.add(card.n);
      return true;
    });
    if (uniqueCards.length > 0) super.addRow(...uniqueCards);
    this.showCount();
  }

  clearRows() {
    super.clearRows();
    this.showCount();
  }

  getCount() {
    return this.body.childElementCount;
  }

  showCount() {
    const count = this.getCount();
    let icon = '';
    if (count > 15) {
      icon = `<i title="カードが多すぎます" class="fa-solid fa-triangle-exclamation text-yellow-700 dark:text-yellow-800 mr-2"></i>`;
    } else if (count == 15) {
      icon = `<i class="fa-regular fa-circle-check text-green-600 dark:text-green-500 mr-2"></i>`;
    }
    this.wrapper.querySelector('.table-title-text')!.innerHTML = icon + generateDeckInfoTitle(count);
  }

  generateDeckCode() {
    const numbers = [...(this.body.children as HTMLCollectionOf<HTMLElement>)]
      .map((e) => toInt(e.dataset['card_no']))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    return encodeDeckCode(numbers);
  }
}

function generateSortRowInfo(trs: HTMLElement[]): IinternalSortRowInfo[] {
  return trs.map((row) => {
    const info = getCardRowInfo(row);
    const gcount = toInt(row.querySelector('.card_gridcount')!.textContent?.trim());
    return { row, info, gcount };
  });
}

function filerRow(trs: IinternalSortRowInfo[], opt: IListOparationOpt) {
  const filterCondition = (info: IinternalSortRowInfo) => {
    if (isValidString(opt.name) && !info.info.ja.includes(opt.name)) return false;
    if (info.gcount > opt.maxg || info.gcount < opt.ming) return false;
    if (info.info.sp > opt.maxsp || info.info.sp < opt.minsp) return false;
    return true;
  };
  return trs.map<IinternalSortRowInfo>((t) => {
    if (filterCondition(t)) {
      t.row.classList.remove('card--hidden');
    } else {
      t.row.classList.add('card--hidden');
    }
    return t;
  });
}

const noAsc: sortJudgeFunc = (a, b) => a.info.n - b.info.n;
const gJudge: sortJudgeFunc = (a, b) => a.gcount - b.gcount;
const spJudge: sortJudgeFunc = (a, b) => a.info.sp - b.info.sp;
const rarityJudge: sortJudgeFunc = (a, b) => a.info.r - b.info.r;

const gcountAsc: sortJudgeFunc = (a, b) => {
  let inf = gJudge(a, b);
  if (inf != 0) return inf;
  inf = spJudge(a, b);
  if (inf != 0) return inf;
  return noAsc(a, b);
};

const spAsc: sortJudgeFunc = (a, b) => {
  let inf = spJudge(a, b);
  if (inf != 0) return inf;
  inf = gJudge(a, b);
  if (inf != 0) return inf;
  return noAsc(a, b);
};

const rarityAsc: sortJudgeFunc = (a, b) => {
  const inf = rarityJudge(a, b);
  if (inf != 0) return inf;
  return gcountAsc(a, b);
};

function getSortRow(orderType: string): sortJudgeFunc {
  switch (orderType) {
    case '1':
      return (a, b) => noAsc(b, a);
    case '2':
      return gcountAsc;
    case '3':
      return (a, b) => gcountAsc(b, a);
    case '4':
      return spAsc;
    case '5':
      return (a, b) => spAsc(b, a);
    case '6':
      return rarityAsc;
    case '7':
      return (a, b) => rarityAsc(b, a);
    default:
      return noAsc;
  }
}

export function getCardRowInfo(tr: HTMLElement): ICard {
  const card_no = toInt(tr.dataset['card_no']);
  const card_sp = toInt(tr.querySelector('.card_sp')!.textContent?.trim());
  const card_name = tr.querySelector('.card_name')!.textContent!.trim();
  const rarity = toInt(tr.dataset['card_rarity']);
  const sg = tr.dataset['card_spx'];
  const g = tr.dataset['card_px'];
  return {
    g,
    sg,
    n: card_no,
    ja: card_name,
    sp: card_sp,
    r: rarity,
  };
}

function createCardRow(cardInfo: ICard, notDeck: boolean) {
  const gridCount = inkCount(cardInfo.g, cardInfo.sg);
  const row = $dom(
    mustache.render(tableRowHTML, {
      ...cardInfo,
      gridCount,
      notDeck,
      rarity: RARITY[cardInfo.r],
    }),
  );
  const clientNameWidth = mesureWidth(cardInfo.ja, 'text-sm font-bold');
  if (clientNameWidth > 148) {
    const scale = 148 / clientNameWidth;
    (row.querySelector('.card_name *') as HTMLElement).style.cssText = `--tw-scale-x:${scale};--tw-scale-y:${scale};`;
  }
  const cardGrid = createCardGrid(cardInfo.g, cardInfo.sg);
  row.querySelector('.grid__wrapper')!.prepend(cardGrid);
  return row as HTMLElement;
}
