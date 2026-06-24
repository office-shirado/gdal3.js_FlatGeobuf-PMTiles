'use strict';

const dropzone = document.getElementById('dropzone');

document.getElementById('browse-btn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
dropzone.addEventListener('click', e => {
  if (!e.target.classList.contains('browse-btn'))
    document.getElementById('file-input').click();
});

function handleFile(file) {
  const { log, fmt, updateConvertBtn } = window.MainModule;
  if (!file.name.match(/\.(geojson|json)$/i)) {
    log('非対応形式: ' + file.name, 'err'); return;
  }
  window.MainModule.State.droppedFile = file;
  document.getElementById('file-info').textContent =
    file.name + '  (' + fmt(file.size) + ')';
  log('ファイル受付: ' + file.name + ' (' + fmt(file.size) + ')');
  updateConvertBtn();
}
