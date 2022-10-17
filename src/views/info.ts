import * as dialog from "@/components/dialog";
import infoModalHTML from "@/template/views/info.html";

document.getElementById("button-info")!.onclick = function () {
  new dialog.ModalDialog({
    title: "このWebアプリケーションについて",
    bodyHTML: infoModalHTML,
  });
};
