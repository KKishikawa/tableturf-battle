const darkMode = {
  /** ダークモードに変更する */
  toDark(save?: boolean) {
    document.documentElement.classList.add("dark");
    if (save) localStorage.theme = "dark";
  },
  /** ライトモードに切り替える */
  toLight(save?: boolean) {
    document.documentElement.classList.remove("dark");
    if (save) localStorage.theme = "light";
  },
  toSystem() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      this.toDark();
    } else {
      this.toLight();
    }
    localStorage.removeItem("theme");
  },
  /** ダークモードとライトモードを切り替える  */
  toggle(save?: boolean) {
    if (document.documentElement.classList.contains("dark")) {
      this.toLight(save);
    } else {
      this.toDark(save);
    }
  },
};

{
  // On page load or when changing themes, best to add inline in `head` to avoid FOUC
  if (
    localStorage.theme === "dark" ||
    (!("theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    darkMode.toDark();
  } else {
    darkMode.toLight();
  }
}

// initialize event listener
{
  const settingStateClassName = "theme-settig--is-setting";
  const themeSettingHandler = (e: MouseEvent) => {
    // DOM以外のクリックイベントの場合は、何もしない
    if (!e.target || !(e.target instanceof HTMLElement)) return;
    // ボタングループ以外をクリックされた場合は閉じる
    if (!e.target.closest("#themeButtonGroup")) {
      document.removeEventListener("click", themeSettingHandler);
      document
        .getElementById("themeSettingButton")!
        .parentElement!.classList.remove(settingStateClassName);
      return;
    }
    const button = e.target.closest<HTMLButtonElement>("[data-theme_mode]");
    if (!button) return;
    switch (button.dataset["theme_mode"]) {
      case "light":
        darkMode.toLight(true);
        break;
      case "dark":
        darkMode.toDark(true);
        break;
      default:
        darkMode.toSystem();
        break;
    }
  };
  document
    .getElementById("themeSettingButton")!
    .addEventListener("click", function () {
      // 設定中の場合、別のイベントハンドラでウィンドウを閉じるためここでは何もしない
      if (this.parentElement!.classList.contains(settingStateClassName)) return;
      // イベント衝突を防ぐために別スレッドで実行する
      window.setTimeout(() => {
        document.addEventListener("click", themeSettingHandler);
      });
      this.parentElement!.classList.add(settingStateClassName);
    });
}
