'use strict';

let _map         = null;
let _popup       = null;
let _labelField  = null;
let _sourceLayer = null;

function initMap() {
  const proto = new pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', proto.tile.bind(proto));

  _map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
      sources: {
        gsi: {
          type: 'raster',
          tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
          tileSize: 256,
          minzoom: 2,
          maxzoom: 18,
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
        }
      },
      layers: [{
        id: 'bg',
        type: 'raster',
        source: 'gsi',
        maxzoom: 22,
        paint: {
          'raster-opacity': 1.0,
          'raster-brightness-min': 0.0,
          'raster-saturation': 0.0
        }
      }]
    },
    center: [136.7, 35.4],
    zoom: 5
  });

  _map.addControl(new maplibregl.NavigationControl(), 'top-left');
  _map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-right');

  _popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: false,
    maxWidth: '300px',
    className: 'chiban-popup'
  });

  document.getElementById('label-select').addEventListener('change', e => {
    _labelField = e.target.value || null;
    _updateLabelLayer();
  });
}

function showMapMsg() { const el = document.getElementById('map-msg'); if (el) el.style.display = ''; }
function hideMapMsg() { const el = document.getElementById('map-msg'); if (el) el.style.display = 'none'; }

async function previewPMTiles(blobUrl, minZoom) {
  const { log } = window.MainModule;

  hideMapMsg();
  document.getElementById('preview-badge').style.display = '';
  _clearLayers();

  const p = new pmtiles.PMTiles(blobUrl);
  let header, metadata;
  try {
    header   = await p.getHeader();
    metadata = await p.getMetadata();
  } catch (e) {
    log('プレビューエラー: ' + e.message, 'err');
    return;
  }

  const vectorLayers = (metadata && metadata.vector_layers) ? metadata.vector_layers : [];
  _sourceLayer = vectorLayers.length ? vectorLayers[0].id : 'layer';

  const fields = vectorLayers.length && vectorLayers[0].fields
    ? Object.keys(vectorLayers[0].fields)
    : [];

  _buildLabelSelect(fields);

  await new Promise(resolve => {
    if (_map.isStyleLoaded()) { resolve(); return; }
    _map.once('styledata', resolve);
  });

  _map.addSource('preview', {
    type: 'vector',
    url: 'pmtiles://' + blobUrl
  });

  const hue = Math.floor(Math.random() * 360);

  _map.addLayer({
    id: 'preview-fill',
    type: 'fill',
    source: 'preview',
    'source-layer': _sourceLayer,
    paint: {
      'fill-color': 'hsl(' + hue + ',65%,55%)',
      'fill-opacity': 0.35
    }
  });

  _map.addLayer({
    id: 'preview-line',
    type: 'line',
    source: 'preview',
    'source-layer': _sourceLayer,
    paint: {
      'line-color': 'hsl(' + hue + ',70%,40%)',
      'line-width': 0.8
    }
  });

  if (_labelField) _addLabelLayer();

  _map.on('click',      'preview-fill', _onClickFill);
  _map.on('mouseenter', 'preview-fill', _onMouseEnter);
  _map.on('mouseleave', 'preview-fill', _onMouseLeave);

  // BBOX中心にフライト、ズームは最小ズーム+1
  if (typeof header.minLon === 'number') {
    const centerLon = (header.minLon + header.maxLon) / 2;
    const centerLat = (header.minLat + header.maxLat) / 2;
    _map.flyTo({
      center:   [centerLon, centerLat],
      zoom:     (minZoom ?? 14) + 1,
      duration: 800
    });
  }

  log('プレビュー: layer=' + _sourceLayer +
    (fields.length ? ' / フィールド: ' + fields.join(', ') : ''), 'ok');
}

// セレクトボックス構築
function _buildLabelSelect(fields) {
  const wrap = document.getElementById('label-wrap');
  const sel  = document.getElementById('label-select');
  sel.innerHTML = '';

  if (!fields.length) {
    wrap.style.display = 'none';
    _labelField = null;
    return;
  }

  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = '― 表示しない';
  sel.appendChild(noneOpt);

  fields.forEach((f, i) => {
    const opt = document.createElement('option');
    opt.value       = f;
    opt.textContent = f;
    sel.appendChild(opt);
    if (i === 0) {
      opt.selected = true;
      _labelField  = f;
    }
  });

  wrap.style.display = 'flex';
}

// ラベルレイヤ追加
function _addLabelLayer() {
  if (!_labelField || !_sourceLayer) return;
  if (_map.getLayer('preview-label')) _map.removeLayer('preview-label');

  _map.addLayer({
    id: 'preview-label',
    type: 'symbol',
    source: 'preview',
    'source-layer': _sourceLayer,
    minzoom: 14,
    layout: {
      'text-field': ['to-string', ['get', _labelField]],
      'text-font':  ['Noto Sans Regular'],
      'text-size': [
        'interpolate', ['linear'], ['zoom'],
        14, 9,
        16, 12,
        18, 14
      ],
      'text-allow-overlap':    false,
      'text-ignore-placement': false
    },
    paint: {
      'text-color':       '#111',
      'text-halo-color':  'rgba(255,255,255,0.85)',
      'text-halo-width':  1.5
    }
  });
}

// ラベル更新
function _updateLabelLayer() {
  if (_map.getLayer('preview-label')) _map.removeLayer('preview-label');
  if (_labelField) _addLabelLayer();
}

// クリックポップアップ
function _onClickFill(e) {
  if (!e.features || !e.features.length) return;

  let props = {};
  try {
    props = e.features[0].properties || {};
    Object.keys(props).forEach(k => {
      if (typeof props[k] === 'string' && props[k].startsWith('{')) {
        try { props[k] = JSON.parse(props[k]); } catch (_) {}
      }
    });
  } catch (_) {}

  const rows = Object.entries(props)
    .map(([k, v]) => {
      const val = (typeof v === 'object') ? JSON.stringify(v) : v;
      return '<tr>' +
        '<td class="pk">' + _esc(k)   + '</td>' +
        '<td class="pv">' + _esc(val) + '</td>' +
        '</tr>';
    }).join('');

  const html = rows
    ? '<table class="popup-table">' + rows + '</table>'
    : '<span style="color:var(--muted)">属性なし</span>';

  _popup.setLngLat(e.lngLat).setHTML(html).addTo(_map);
}

function _onMouseEnter() { _map.getCanvas().style.cursor = 'pointer'; }
function _onMouseLeave() { _map.getCanvas().style.cursor = ''; }

// レイヤクリア
function _clearLayers() {
  if (_popup && _popup.isOpen()) _popup.remove();

  if (_map) {
    try { _map.off('click',      'preview-fill', _onClickFill);  } catch (_) {}
    try { _map.off('mouseenter', 'preview-fill', _onMouseEnter); } catch (_) {}
    try { _map.off('mouseleave', 'preview-fill', _onMouseLeave); } catch (_) {}
    ['preview-label', 'preview-fill', 'preview-line'].forEach(id => {
      try { if (_map.getLayer(id)) _map.removeLayer(id); } catch (_) {}
    });
    try { if (_map.getSource('preview')) _map.removeSource('preview'); } catch (_) {}
  }

  const wrap = document.getElementById('label-wrap');
  if (wrap) wrap.style.display = 'none';
  _labelField  = null;
  _sourceLayer = null;
}

function clearPreview() {
  _clearLayers();
  showMapMsg();
  const badge = document.getElementById('preview-badge');
  if (badge) badge.style.display = 'none';
}

function _esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

initMap();
window.MapModule = { previewPMTiles, clearPreview, hideMapMsg, showMapMsg };
