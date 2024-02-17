import mustache from "mustache";
import * as dialog from "@/components/dialog";
import * as Message from "@/components/message";
import { createShareURL } from "@/models/card";
import shareBodyHTML from "./shareBody.html.mustache?raw";

/** デッキ共有用のメッセージを表示する */
export function showShareMsg(code: string) {
  const url = createShareURL(code);
  const modal = new dialog.ModalDialog({
    title: "デッキコード",
    bodyHTML: mustache.render(shareBodyHTML, { url, code }),
  });
  [...modal.element.querySelectorAll<HTMLElement>("[data-copy]")].forEach(
    (el) => {
      el.addEventListener("click", function() {
        const input = this.previousElementSibling as HTMLInputElement;
        input.select();
        document.execCommand("copy");
        Message.success(`${this.dataset["copy"]}をコピーしました。`);
      });
    }
  );
}
