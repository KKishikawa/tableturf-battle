import * as dialog from "@/components/dialog";
import infoModalHTML from "./modal.template.html";

document.getElementById("button-info")!.onclick = function () {
  new dialog.ModalDialog({
    title: "このWebアプリケーションについて",
    bodyHTML: infoModalHTML,
  });
};
