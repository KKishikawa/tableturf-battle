/** 情報表示用の簡易elementを作成します */
export class SimpleInfo {
  readonly element: HTMLElement;
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "text-sm font-normal text-gray-500 dark:text-gray-400";
  }
  setInfo(text: string) {
    this.element.innerText = text;
  }
}
