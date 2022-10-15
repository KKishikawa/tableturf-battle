import { CardList } from "@/components/cardList";
import { getCardList } from "@/models/card";

const allCardManager = new CardList(true);
allCardManager.addRow(...getCardList().c);
document.getElementById("all_card")!.append(allCardManager.wrapper);

const deckManager = new CardList(false);
document.getElementById("edited_deck")!.append(deckManager.wrapper);
