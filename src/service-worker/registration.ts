import { Workbox } from "workbox-window";
import { confirm } from "@/components/dialog";

export default function registerServiceWorker() {
  // break if not production
  if (process.env.NODE_ENV !== "production") return;
  // Check if the serviceWorker Object exists in the navigator object ( means if browser supports SW )
  if ("serviceWorker" in navigator) {
    const wb = new Workbox("sw.js");

    wb.addEventListener("installed", (event) => {
      /**
       * We have the condition — event.isUpdate because we don’t want to show
       * this message on the very first service worker installation,
       * only on the updated
       */
      if (event.isUpdate) {
        confirm({
          title: `アプリケーションが更新されました。OKをクリックすると画面を再読み込みします。`,
        }).then(() => {
          window.location.reload();
        });
      }
    });
    wb.register();
  }
}
