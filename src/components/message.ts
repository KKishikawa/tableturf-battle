import { render } from "mustache";
import { $dom } from "@/utils";
import messageBaseTemplate from "@/template/message/base.template.html";
interface IMessageCss {
  bodyClass: string;
  icon: string;
  dismiss: string;
}
const infoStyle: IMessageCss = {
  bodyClass: "text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300",
  icon: "fa-solid fa-circle-info",
  dismiss:
    "bg-gray-100 w-8 text-gray-500 focus:ring-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
};
const errorStyle: IMessageCss = {
  bodyClass: "text-red-700 bg-red-100 dark:bg-red-200 dark:text-red-800",
  icon: "fa-solid fa-circle-xmark",
  dismiss:
    "bg-red-100 text-red-500 focus:ring-red-400 hover:bg-red-200 dark:bg-red-200 dark:text-red-600 dark:hover:bg-red-300",
};
const successStyle: IMessageCss = {
  bodyClass:
    "text-green-700 bg-green-100 dark:bg-green-200 dark:text-green-800",
  icon: "fa-solid fa-circle-check",
  dismiss:
    "bg-green-100 text-green-500 focus:ring-green-400 hover:bg-green-200 dark:bg-green-200 dark:text-green-600 dark:hover:bg-green-300",
};
const warnStyle: IMessageCss = {
  bodyClass:
    "text-yellow-700 bg-yellow-100 dark:bg-yellow-200 dark:text-yellow-800",
  icon: "fa-solid fa-circle-exclamation",
  dismiss:
    "bg-yellow-100 text-yellow-500 focus:ring-yellow-400 hover:bg-yellow-200 dark:bg-yellow-200 dark:text-yellow-600 dark:hover:bg-yellow-300",
};
const closeMessageStyle = ["-translate-y-full", "opacity-0", "max-h-0"];

function internalShowMsg(message: string, styleInfo: IMessageCss) {
  // create message element
  const msgEl = $dom(render(messageBaseTemplate, { ...styleInfo, message }));
  let closeProcId = -1;
  const close = function () {
    window.clearTimeout(closeProcId);
    msgEl.classList.add(...closeMessageStyle);
    window.setTimeout(() => msgEl.remove(), 300);
  };

  // button event
  msgEl.querySelector("button")!.onclick = () => close();

  msgEl.classList.add(...closeMessageStyle);
  document.getElementById("app-modal_container")!.append(msgEl);
  // open animate
  window.setTimeout(() => msgEl.classList.remove(...closeMessageStyle));

  // message show duration
  closeProcId = window.setTimeout(() => close(), 3000);
}
/** infoメッセージを表示する */
export function info(message: string) {
  internalShowMsg(message, infoStyle);
}
/** successメッセージを表示する */
export function success(message: string) {
  internalShowMsg(message, successStyle);
}
/** errorメッセージを表示する */
export function error(message: string) {
  internalShowMsg(message, errorStyle);
}
/** warnメッセージを表示する */
export function warn(message: string) {
  internalShowMsg(message, warnStyle);
}
