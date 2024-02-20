import mustache from 'mustache';
import { toInt } from '@/utils/convert';
import * as dialog from '@/components/dialog';
import * as Message from '@/components/message';
import { IDeck } from '@/models/card';
import { isValidString, nowYMD } from '@/utils';
import {
  addDeck,
  allDeckInfo,
  generateDeckId,
  getDeckInfoByRowIdx,
  replaceDeckInfo,
  saveDeckToLS,
} from '@/components/deck';
import saveDeckDialogBodyHTML from './saveDeckDialogBody.html.mustache';

/** 保存ダイアログを開く */
export default function () {
  const decks = allDeckInfo().map((d, idx) => ({ ...d, idx }));
  const saveDialog = new dialog.ModalDialog({
    title: 'デッキの保存',
    bodyHTML: mustache.render(saveDeckDialogBodyHTML, { decks }),
    onClose: () => {
      Message.info('保存操作をキャンセルしました。');
    },
    buttons: [
      {
        label: '保存',
        primary: true,
      },
      {
        label: 'キャンセル',
        action: 'close',
      },
    ],
  });
  const form = saveDialog.element.getElementsByTagName('form')[0];
  const input = document.getElementById('input_deck_name') as HTMLInputElement;
  const inputHandler = function () {
    input.dataset['input'] = '1';
    input.removeEventListener('input', inputHandler);
  };
  input.addEventListener('input', inputHandler);
  const radios = [...saveDialog.element.getElementsByClassName(`deck-radio-item`)] as HTMLInputElement[];
  radios.forEach((radio) => {
    radio.onchange = function () {
      if (!isValidString(input.value) || !isValidString(input.dataset['input'])) {
        input.value = radio.dataset['name'] ?? '';
      }
    };
  });
  const id = window.DeckEditManager.body.dataset['id'];
  if (isValidString(id)) {
    window.setTimeout(() => {
      const radioBtn = radios.find((el) => el.dataset['id'] == id);
      if (radioBtn) {
        radioBtn.checked = true;
        radioBtn.dispatchEvent(new Event('change'));
      }
    });
  }
  const saveFunc = () => {
    (document.activeElement as HTMLElement)?.blur();
    const selected = toInt((form.elements.namedItem('saveTo') as RadioNodeList).value, -1);
    const getSaveInfo = (id = generateDeckId()): IDeck => {
      return {
        d: nowYMD(),
        t: (document.getElementById('input_deck_name') as HTMLInputElement).value,
        c: window.DeckEditManager.generateDeckCode(),
        id,
      };
    };
    if (selected > -1) {
      const info = getDeckInfoByRowIdx(selected);
      dialog
        .confirm({
          title: '上書きの確認',
          message: `${info.t}　を上書きしますが、よろしいですか？`,
        })
        .then(
          () => {
            const newDeckInfo = getSaveInfo(info.id);
            replaceDeckInfo(selected, newDeckInfo);
            saveDeckToLS();
            window.DeckEditManager.body.dataset['id'] = newDeckInfo.id;
            Message.success('上書き保存しました。');
            saveDialog.closeModal(true);
          },
          () => {},
        );
    } else {
      // 新規作成
      const newDeckInfo = getSaveInfo();
      addDeck(newDeckInfo);
      saveDeckToLS();
      window.DeckEditManager.body.dataset['id'] = newDeckInfo.id;
      Message.success('保存しました。');
      saveDialog.closeModal(true);
    }
  };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    saveFunc();
  });
  saveDialog.element.getElementsByClassName('modal-action')[0].addEventListener('click', () => {
    saveFunc();
  });
}
