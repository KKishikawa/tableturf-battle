import { $dom } from "@/utils";
import mustache from "mustache";
import dialogHTML from "./dialog.html.mustache";

const closeModalWrapperStyle = ["opacity-0"];
const closeModalStyle = ["scale-0"];
export interface IModalOption {
  title?: string;
  body?: string;
  bodyHTML?: string;
  buttons?: IModalButtonOption[];
  onClose?: () => void;
}
export interface IModalButtonOption {
  primary?: boolean;
  label: string;
  icon?:  string,
  action?: ((closeFunc: (preventHandler?: boolean) => void) => void) | "close";
}

/** カスタムダイアログの管理クラス */
export class ModalDialog {
  readonly element: HTMLElement;
  onCloseHandler?: () => void;
  constructor(options: IModalOption) {
    this.onCloseHandler = options.onClose;
    const container = document.getElementById("app-modal_container")!;
    this.element = $dom(mustache.render(dialogHTML, {...options, buttonClass(this: IButtonOption) {
      return this.primary ? "button-primary" : "button-alt";
    }}));
    if (options.buttons) {
      const opt = options.buttons;
      this.element.querySelectorAll(".modal-action").forEach((button, idx) => {
        const buttonOption = opt[idx];
        if (!buttonOption.action) return;
        if (buttonOption.action == "close") {
          button.classList.add("modal-close");
        } else {
          const action = buttonOption.action.bind(buttonOption);
          button.addEventListener("click", () => {
            action(this.closeModal.bind(this));
          });
        }
      });
    }
    this.element.addEventListener("click", (e) => {
      if (!e.target || !(e.target instanceof HTMLElement)) return;
      if (
        e.target.closest(".modal-close") ||
        !e.target.closest(".modal-content")
      ) {
        this.closeModal();
        return;
      }
    });
    const modal_content = this.element.querySelector(".modal-content")!;
    modal_content.classList.add(...closeModalStyle);
    this.element.classList.add(...closeModalWrapperStyle);
    container.append(this.element);
    // open animate
    window.setTimeout(() => {
      modal_content.classList.remove(...closeModalStyle);
      this.element.classList.remove(...closeModalWrapperStyle);
    });
  }
  closeModal(preventHandler?: boolean) {
    this.element
      .querySelector(".modal-content")!
      .classList.add(...closeModalStyle);
    this.element.classList.add(...closeModalWrapperStyle);
    window.setTimeout(() => {
      this.element.remove();
    }, 300);
    if (!preventHandler && this.onCloseHandler) {
      this.onCloseHandler();
    }
  }
}

interface IPromptOption {
  title?: string;
  message?: string;
  html?: string;
}
export interface IComfirmOption extends IPromptOption {
  okLabel?: string;
  cancelLabel?: string;
}
export interface IAlertOption extends IPromptOption {
  closeLabel?: string;
}
/** OK・キャンセルダイアログを表示する。okクリックでresolve,キャンセルでreject */
export function confirm(option: IComfirmOption) {
  return new Promise<void>(function (resolve, reject) {
    new ModalDialog({
      title: option.title,
      body: option.message,
      bodyHTML: option.html,
      buttons: [
        {
          label: "OK",
          primary: true,
          action(closeFunc) {
            resolve();
            closeFunc(true);
          },
        },
        {
          label: "キャンセル",
          action: "close",
        },
      ],
      onClose() {
        reject();
      },
    });
  });
}
/** OKボタンダイアログを表示する。閉じられるとresolve */
export function alert(options: IAlertOption) {
  return new Promise<void>(function (resolve) {
    new ModalDialog({
      title: options.title,
      body: options.message,
      bodyHTML: options.html,
      buttons: [
        {
          primary: true,
          label: "OK",
          action: "close",
        },
      ],
      onClose() {
        resolve();
      },
    });
  });
}
