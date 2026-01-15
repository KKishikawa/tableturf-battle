import * as dialog from '@/components/dialog';
import infoModalHTML from './modal.html.mustache?raw';

document.getElementById('button-about-me')!.onclick = function () {
  new dialog.ModalDialog({
    title: 'このWebアプリケーションについて',
    bodyHTML: infoModalHTML,
  });
};
