export function isValidString(str: string | null | undefined): str is string {
  return str != null && str != '';
}

function generateDomFragment(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template;
}
/**
 * html to dom element
 * @param html representing a single element
 * @returns
 */
export function $dom<T extends HTMLElement>(html: string): T {
  const template = generateDomFragment(html);
  return template.content.firstChild as T;
}
export function mesureWidth(str: string, className?: string) {
  const div = document.createElement('div');
  div.className = 'fixed invisible';
  if (className != null) {
    div.className += ' ' + className;
  }
  const p = document.createElement('p');
  p.innerText = str;
  div.append(p);
  document.body.append(div);
  const w = p.clientWidth;
  div.remove();
  return w;
}
export function nowYMD() {
  const _d = new Date();
  const y = _d.getFullYear();
  const m = (_d.getMonth() + 1 + '').padStart(2, '0');
  const d = (_d.getDate() + '').padStart(2, '0');
  const h = (_d.getHours() + '').padStart(2, '0');
  const mm = (_d.getMinutes() + '').padStart(2, '0');
  return `${y}/${m}/${d} ${h}:${mm}`;
}

/** 指定したキーのデータを取得する */
export function getFromStorage<T>(key: string): T | null {
  try {
    const d = localStorage.getItem(key);
    if (d == null) return null;
    return JSON.parse(d);
  } catch (error) {
    console.log(error);
    return null;
  }
}
/** 指定したキーにデータを保存する */
export function setToStrage<T>(key: string, obj: T) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (error) {
    console.log(error);
  }
}

export function saveJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  savefile(blob, filename);
}
/**
 * Blobファイルを保存する
 * @param blob データ
 * @param filename ファイル名
 */
export function savefile(blob: Blob, filename: string) {
  // ie
  if ((window.navigator as any).msSaveBlob) {
    (window.navigator as any).msSaveBlob(blob, filename);
    // その他ブラウザ
  } else {
    // BlobからオブジェクトURLを作成する
    const url = window.URL.createObjectURL(blob);
    // ダウンロード用にリンクを作成する
    const download = document.createElement('a');
    // リンク先に上記で生成したURLを指定する
    download.href = url;
    // download属性にファイル名を指定する
    download.download = filename;

    document.body.append(download);
    // 作成したリンクをクリックしてダウンロードを実行する
    download.click();

    window.setTimeout(() => {
      download.remove();
      // createObjectURLで作成したオブジェクトURLを開放する
      window.URL.revokeObjectURL(url);
    });
  }
}
