import { isValidString } from "@/utils";
import { loadDeck } from "@/utils/core";
import * as Message from "@/components/message";
import { loadFromQuery } from "@/models/card";

// デッキコード読み込み
(
  document.getElementById("form_deckCodeLoad") as HTMLFormElement
).addEventListener("submit", function (e) {
  e.preventDefault();
  const input = this.getElementsByTagName("input")[0];
  if (!isValidString(input.value)) {
    Message.warn("デッキコードが指定されていません。");
    return;
  }
  try {
    loadDeck(input.value);
    this.reset();
    const clearableWrapper = input.closest("[data-clearable]") as HTMLElement;
    clearableWrapper.dataset["clearable"] = "";
    if (window.DeckEditManager.getCount() < 1) {
      Message.warn("デッキコードが正しくありません。");
    } else {
      Message.success("デッキを読み込みました。");
    }
  } catch (error) {
    Message.error("デッキの読み込みに失敗しました。");
  }
});


{
  // urlからデッキを読み込む
  const code = loadFromQuery();
  if (isValidString(code)) {
    try {
      loadDeck(code);
      Message.info("URLからデッキを読み込みました。");
    } catch (error) {}
  }
}
