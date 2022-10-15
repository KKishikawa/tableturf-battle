import { CardList } from "@/components/cardList";
import { getCardList } from "@/models/card";

const allCardManager = new CardList(true);
allCardManager.addRow(...getCardList().c);
const deckManager = new CardList(false);

document
  .querySelector(".deck-tab-groups")!
  .append(allCardManager.wrapper, deckManager.wrapper);
