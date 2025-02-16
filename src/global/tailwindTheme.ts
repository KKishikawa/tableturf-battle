/** ダークモードに変更する */
function toDark(save?: boolean) {
  document.documentElement.dataset.theme = 'dark';
  if (save) localStorage.theme = 'dark';
}
/** ライトモードに切り替える */
function toLight(save?: boolean) {
  document.documentElement.dataset.theme = 'light';
  if (save) localStorage.theme = 'light';
}
function toSystem() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    toDark();
  } else {
    toLight();
  }
  localStorage.removeItem('theme');
}

{
  // On page load or when changing themes, best to add inline in `head` to avoid FOUC
  if (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    toDark();
  } else {
    toLight();
  }
}

// initialize event listener
{
  const settingStateClassName = 'theme-settig--is-setting';
  const themeSettingHandler = (e: MouseEvent) => {
    // DOM以外のクリックイベントの場合は、何もしない
    if (!e.target || !(e.target instanceof HTMLElement)) return;
    // ボタングループ以外をクリックされた場合は閉じる
    if (!e.target.closest('#themeButtonGroup')) {
      document.removeEventListener('click', themeSettingHandler);
      document.getElementById('themeSettingButton')!.parentElement!.classList.remove(settingStateClassName);
      return;
    }
    const button = e.target.closest<HTMLButtonElement>('[data-theme_mode]');
    if (!button) return;
    switch (button.dataset['theme_mode']) {
      case 'light':
        toLight(true);
        break;
      case 'dark':
        toDark(true);
        break;
      default:
        toSystem();
        break;
    }
  };
  document.getElementById('themeSettingButton')!.addEventListener('click', function () {
    // 設定中の場合、別のイベントハンドラでウィンドウを閉じるためここでは何もしない
    if (this.parentElement!.classList.contains(settingStateClassName)) return;
    // イベント衝突を防ぐために別スレッドで実行する
    window.setTimeout(() => {
      document.addEventListener('click', themeSettingHandler);
    });
    this.parentElement!.classList.add(settingStateClassName);
  });
}
