'use strict';

let Gdal = null;

// Worker内から参照されるwasm/dataはCDNから取得
// JSファイルのみローカル（lib/gdal3.js）に配置してuseWorker:trueを有効化
const GDAL_CDN = 'https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package';

async function convert(file, opts) {
  const { log, setProgress, tick, fmt } = window.MainModule;
  const { genFgb, genPmt, minZoom, maxZoom, simplify, maxFeat } = opts;
  const results  = [];
  const baseName = file.name.replace(/\.[^.]+$/, '');

  setProgress(10, 'GDAL: open中...');
  const t0     = tick();
  const result = await Gdal.open(file);
  if (!result.datasets?.length) throw new Error('データセット取得失敗');
  const ds = result.datasets[0];
  log('GDAL: open完了 (' + ((tick() - t0) / 1000).toFixed(1) + '秒)');

  const count = ds.info?.layers?.[0]?.featureCount ?? 0;
  if (count) log('フィーチャ数: ' + count.toLocaleString());

  // FlatGeobuf
  if (genFgb) {
    setProgress(20, 'FlatGeobuf 変換中...');
    const args = ['-f', 'FlatGeobuf', '-t_srs', 'EPSG:4326', '-lco', 'SPATIAL_INDEX=YES'];
    const t1   = tick();
    const out  = await Gdal.ogr2ogr(ds, args, baseName + '_fgb');
    log('FlatGeobuf 完了 (' + ((tick() - t1) / 1000).toFixed(1) + '秒)');
    setProgress(40, 'FGB バイト取得中...');
    const bytes = await Gdal.getFileBytes(out);
    Gdal.close(out);
    log('FGB: ' + fmt(bytes.byteLength));
    results.push({ name: baseName + '.fgb', type: 'fgb', bytes });
  }

  // PMTiles
  if (genPmt) {
    setProgress(55, 'PMTiles 変換中 (z' + minZoom + '-' + maxZoom + ')...');
    const args = [
      '-f', 'PMTiles',
      '-t_srs', 'EPSG:3857',
      '-dsco', 'MINZOOM=' + minZoom,
      '-dsco', 'MAXZOOM=' + maxZoom,
      '-dsco', 'MAX_FEATURES=' + maxFeat
    ];
    if (simplify > 0) args.push('-dsco', 'SIMPLIFICATION=' + simplify);
    const t2  = tick();
    const out = await Gdal.ogr2ogr(ds, args, baseName + '_pmtiles');
    log('PMTiles 完了 (' + ((tick() - t2) / 1000).toFixed(1) + '秒)');
    setProgress(80, 'PMTiles バイト取得中...');
    const bytes = await Gdal.getFileBytes(out);
    Gdal.close(out);
    log('PMTiles: ' + fmt(bytes.byteLength));
    results.push({ name: baseName + '.pmtiles', type: 'pmt', bytes });
  }

  Gdal.close(ds);
  setProgress(95, 'ファイル準備中...');
  return results;
}

// GDAL 初期化
(async () => {
  const { log, updateConvertBtn } = window.MainModule;
  const initFill = document.getElementById('init-fill');
  let pct = 0;
  const timer = setInterval(() => {
    pct = Math.min(pct + (pct < 60 ? 3 : pct < 85 ? 1 : 0.3), 95);
    initFill.style.width = pct + '%';
  }, 400);

  try {
    Gdal = await initGdalJs({
      // wasm と data は CDN から取得
      paths: {
        wasm: GDAL_CDN + '/gdal3WebAssembly.wasm',
        data: GDAL_CDN + '/gdal3WebAssembly.data',
        // js はローカルの lib/gdal3.js を <script> で読み込み済みのため
        // Worker生成用パスもローカルを指定
        js:   location.origin + location.pathname.replace(/\/[^/]*$/, '/') + 'lib/gdal3.js'
      },
      useWorker: true   // ← メインスレッドブロックを解消
    });

    clearInterval(timer);
    initFill.style.width = '100%';
    await new Promise(r => setTimeout(r, 250));
    document.getElementById('gdal-overlay').classList.add('hidden');
    log('GDAL.js 初期化完了 (' +
      Object.keys(Gdal.drivers.vector).length + ' ベクタドライバ)', 'ok');
    updateConvertBtn();

  } catch (e) {
    clearInterval(timer);
    log('GDAL 初期化エラー: ' + e.message, 'err');
    document.getElementById('gdal-overlay').classList.add('hidden');
  }
})();

window.GdalModule = { get Gdal() { return Gdal; }, convert };
