// inputイベント
document.body.addEventListener(
  'input',
  function (e) {
    if (!e.target || !(e.target instanceof HTMLElement)) return;
    const hasInput = (e.target as HTMLInputElement).value != '';
    if (e.target.parentElement!.hasAttribute('data-clearable')) {
      // 消去フラグを設定
      e.target.parentElement!.dataset['clearable'] = hasInput ? '1' : '';
    }
  },
  true,
);

const expand = 'expand';
// 共通ボタン
document.body.addEventListener('click', function (e) {
  if (!e.target || !(e.target instanceof HTMLElement)) return;
  const c = e.target;
  window.setTimeout(() => {
    if (c.classList.contains('input-clear')) {
      const clearableWrapper = c.closest('[data-clearable]') as HTMLElement;
      const input = clearableWrapper.querySelector('input')!;
      if (!input) return;
      input.value = '';
      clearableWrapper.dataset['clearable'] = '';
      const form = clearableWrapper.closest('form');
      if (form?.onsubmit) {
        form.onsubmit(new SubmitEvent(''));
      }
    }
    let el: HTMLElement | null;
    if ((el = c.closest('.expand-button'))) {
      // 開閉ボタン
      const ex = el.closest('.expandable-wrapper');
      if (!ex) return;
      if (ex.classList.contains(expand)) {
        ex.classList.remove(expand);
      } else {
        ex.classList.add(expand);
      }
    }
  });
});
