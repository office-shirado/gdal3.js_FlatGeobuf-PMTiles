// ダウンロード

'use strict';

const _blobs = [];

function createBlob(r) {
  const blob = new Blob([r.bytes], {
    type: r.type === 'fgb' ? 'application/octet-stream' : 'application/vnd.pmtiles'
  });
  const url = URL.createObjectURL(blob);
  _blobs.push({ name: r.name, url });
  return url;
}

function revokeAll() {
  _blobs.forEach(b => URL.revokeObjectURL(b.url));
  _blobs.length = 0;
}

function renderResult(name, bytes, url) {
  const { fmt, esc } = window.MainModule;
  const div   = document.createElement('div');
  div.className = 'res-item';
  const label = name.endsWith('.fgb') ? '&#x1F4E6; FlatGeobuf' : '&#x1F5FA; PMTiles';
  div.innerHTML =
    '<div class="ri-info">' +
      '<div class="ri-name">' + esc(name) + '</div>' +
      '<div class="ri-meta">' + label + ' &nbsp;&middot;&nbsp; ' + fmt(bytes) + '</div>' +
    '</div>' +
    '<a class="dl-btn" href="' + url + '" download="' + esc(name) + '">&#x2B07; DL</a>';
  document.getElementById('results').appendChild(div);
}

window.DownloadModule = { createBlob, revokeAll, renderResult };
