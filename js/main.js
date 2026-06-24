'use strict';

const State = {
  droppedFile: null,
};

function tick()  { return Date.now(); }

function fmt(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576)    return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024)       return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function log(msg, cls) {
  const now = new Date();
  const ts  = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
  const el  = document.getElementById('log');
  const div = document.createElement('div');
  div.className   = cls ? 'l-' + cls : 'l-info';
  div.textContent = '[' + ts + '] ' + msg;
  el.appendChild(div);
  while (el.children.length > 120) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

function setProgress(pct, label) {
  document.getElementById('prog-fill').style.width = pct + '%';
  if (label !== undefined) document.getElementById('prog-label').textContent = label;
}

function updateConvertBtn() {
  const ready = window.GdalModule?.Gdal && State.droppedFile;
  document.getElementById('btn-convert').disabled = !ready;
}

// 変換ボタン
document.getElementById('btn-convert').addEventListener('click', async () => {
  if (!window.GdalModule?.Gdal || !State.droppedFile) return;

  document.getElementById('btn-convert').disabled = true;
  document.getElementById('results-sec').style.display = 'none';
  document.getElementById('results').innerHTML = '';
  document.getElementById('prog-wrap').classList.add('show');
  window.DownloadModule.revokeAll();
  window.MapModule.hideMapMsg();

  const genFgb   = document.getElementById('opt-fgb').checked;
  const genPmt   = document.getElementById('opt-pmt').checked;
  const minZoom  = parseInt(document.getElementById('opt-minzoom').value);
  const maxZoom  = parseInt(document.getElementById('opt-maxzoom').value);
  const simplify = parseFloat(document.getElementById('opt-simplify').value) || 0;
  const maxFeat  = parseInt(document.getElementById('opt-maxfeat').value) || 200000;

  log('--- 開始: ' + State.droppedFile.name + ' ---');

  try {
    const results = await window.GdalModule.convert(State.droppedFile, {
      genFgb, genPmt, minZoom, maxZoom, simplify, maxFeat
    });

    let firstPmt = null;
    for (const r of results) {
      const url = window.DownloadModule.createBlob(r);
      window.DownloadModule.renderResult(r.name, r.bytes.byteLength, url);
      if (r.type === 'pmt' && !firstPmt) firstPmt = url;
    }

    document.getElementById('results-sec').style.display = '';
    setProgress(100, '完了！');
    log('=== 完了 (' + results.length + ' ファイル) ===', 'ok');

    if (document.getElementById('opt-preview').checked && firstPmt) {
      await window.MapModule.previewPMTiles(firstPmt, minZoom);
    }

    setTimeout(() => {
      document.getElementById('prog-wrap').classList.remove('show');
      document.getElementById('btn-convert').disabled = false;
    }, 1500);

  } catch (err) {
    log('エラー: ' + err.message, 'err');
    setProgress(0, 'エラー');
    document.getElementById('btn-convert').disabled = false;
  }
});

// クリア
document.getElementById('btn-clear').addEventListener('click', () => {
  State.droppedFile = null;
  document.getElementById('file-info').textContent = '';
  document.getElementById('file-input').value = '';
  document.getElementById('results-sec').style.display = 'none';
  document.getElementById('results').innerHTML = '';
  document.getElementById('log').innerHTML = '';
  document.getElementById('prog-wrap').classList.remove('show');
  document.getElementById('prog-fill').style.width = '0%';
  window.DownloadModule.revokeAll();
  window.MapModule.clearPreview();
  updateConvertBtn();
});

window.MainModule = { State, tick, fmt, esc, log, setProgress, updateConvertBtn };
