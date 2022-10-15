import { CardList, DeckInfo, getCardRowInfo } from "@/components/cardList";
import { getCardList } from "@/models/card";
import { toInt } from "@/utils/convert";

const allCardManager = new CardList({ search: true, title: "カードリスト" });
allCardManager.addRow(...getCardList().c);
allCardManager.wrapper.classList.add(
  "deck-tab-item--active",
  "card-list-container"
);
const deckManager = new DeckInfo();
deckManager.wrapper.classList.add("deck-container");
const tabBtns = Array.from(document.querySelectorAll(".tab-group .tab"));
{
  function showDeckCount() {
    tabBtns[1].innerHTML =
      deckManager.wrapper.querySelector(".table-title-text")!.innerHTML;
  }
  // カードクリック
  allCardManager.body.addEventListener("click", (e) => {
    if (!e.target) return;
    const el = e.target as HTMLElement;
    window.setTimeout(() => {
      if (el.closest(".button-add")) {
        const row = el.closest("tr")!;
        const info = getCardRowInfo(row);
        deckManager.addRow(info);
        showDeckCount();
        row.dataset["selected"] = "1";
      } else if (el.closest(".button-delete")) {
        const row = el.closest("tr")!;
        const no = toInt(row.dataset["card_no"]);
        deckManager.removeRowByNo(no);
        showDeckCount();
        row.dataset["selected"] = "";
      }
    });
  });
  deckManager.body.addEventListener("click", (e) => {
    if (!e.target) return;
    const el = e.target as HTMLElement;
    window.setTimeout(() => {
      if (el.closest(".button-delete")) {
        const row = el.closest("tr")!;
        const no = toInt(row.dataset["card_no"]);
        const r = allCardManager.findRowByNo(no);
        if (r) r.dataset["selected"] = "";
        deckManager.removeRow(row);
        showDeckCount();
      }
    });
  });
}

{
  // タブ切り替え
  const tabGroup = document.querySelector(".deck-tab-items") as HTMLElement;
  tabGroup.append(allCardManager.wrapper, deckManager.wrapper);
  const tabItems = Array.from(tabGroup.querySelectorAll(".deck-tab-item"));

  tabBtns.forEach((tabBtn, idx) =>
    tabBtn.addEventListener("click", () => {
      tabBtns.forEach((b, bIdx) => {
        if (bIdx == idx) {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      });
      tabItems.forEach((tabItem, itemIdx) => {
        if (idx == itemIdx) {
          tabItem.classList.add("deck-tab-item--active");
        } else {
          tabItem.classList.remove("deck-tab-item--active");
        }
      });
    })
  );
}
