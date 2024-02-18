import mustache from "mustache";
import * as dialog from "@/components/dialog";
import * as Message from "@/components/message";
import { addDeck, deckInfoFromRow, saveDeckToLS } from "@/components/deck";
import { loadFromLS } from "@/models/card";
import deleteConfHtml from "./deleteConf.html.mustache";
import loadConfHtml from "./deckLoadConf.html.mustache";
import { loadDeck } from "@/utils/core";
import { isValidString } from "@/utils";
import { showShareMsg } from "@/components/deckShare";


// デッキ一覧
try {
  const data = loadFromLS();
  addDeck(...data);
} catch (error) {}

const tbody = document.querySelector(
  "#created_decks tbody"
) as HTMLTableSectionElement;
tbody.addEventListener("click", function (e) {
  if (!e.target) return;
  const button = (e.target as HTMLElement).closest<HTMLElement>(".button");
  if (!button) return;
  const tr = button.closest("tr") as HTMLTableRowElement;
  const info = deckInfoFromRow(tr);
  switch (button.dataset["action"]) {
    case "edit":
      (async () => {
        try {
          if (window.DeckEditManager.getCount() > 0) {
            const ret = await dialog
              .confirm({
                title: "デッキ読み込み",
                html: mustache.render(loadConfHtml, info),
              })
              .then(
                () => true,
                () => false
              );
            if (!ret) {
              Message.info("読み込みをキャンセルしました。");
              return;
            }
          }
          loadDeck(info.c, info.id);
          Message.success("デッキを読み込みました。");
        } catch {
          Message.error("デッキの読み込みに失敗しました。");
        }
      })();
      break;
    case "delete":
      dialog
        .confirm({
          title: "デッキ削除",
          html: mustache.render(deleteConfHtml, info),
        })
        .then(
          () => {
            tr.remove();
            saveDeckToLS();
            Message.success("削除しました。");
          },
          () => {
            Message.info("削除をキャンセルしました。");
          }
        )
        .catch(() => {
          Message.error("削除処理に失敗しました。");
        });
      break;
    case "share":
      if (isValidString(info.c)) {
        showShareMsg(info.c);
      } else {
        Message.error("選択したデッキにはカードが含まれていません。");
      }
      break;
  }
});
