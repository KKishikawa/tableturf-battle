import { CardList } from "@/components/cardList";
import { getCardList } from "@/models/card";

const allCardManager = new CardList(true);
allCardManager.addRow(...getCardList().c);
allCardManager.wrapper.classList.add("deck-tab-item--active");
const deckManager = new CardList(false);

const tabGroup = document.querySelector(".deck-tab-items") as HTMLElement;
tabGroup.append(allCardManager.wrapper, deckManager.wrapper);
const tabItems = Array.from(tabGroup.querySelectorAll(".deck-tab-item"));
const tabBtns = Array.from(document.querySelectorAll(".tab-group .tab"));
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
