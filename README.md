# gdal3.js_FlatGeobuf-PMTiles

GeoJSONファイルをブラウザ上で **FlatGeobuf** と **PMTiles** に変換するWebツールです。

## 特徴

**ブラウザだけで本格的なGDAL変換が動く**のが最大の特徴です。

通常、FlatGeobufやPMTilesへの変換にはGDAL環境やTippecanoeなどのCLIツールが必要です。

このツールは **gdal3.js**（GDALをWebAssemblyにコンパイルしたもの）を使用することで、
**サーバ不要・インストール不要・ブラウザ完結**で本格的な変換を実現しています。

GDALのPMTilesドライバを使うため、ズームレベル・簡略化・最大フィーチャ数などの細かい制御が可能です。

## デモ

https://office-shirado.github.io/gdal3.js_FlatGeobuf-PMTiles/

## 対応形式

| 入力 | 出力 |
|------|------|
| GeoJSON (.geojson / .json) | FlatGeobuf (.fgb) / PMTiles (.pmtiles) |

## 変換オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| 最小ズーム | タイル生成の最小ズームレベル (0〜22) | 14 |
| 最大ズーム | タイル生成の最大ズームレベル (0〜22) | 16 |
| 簡略化 | 頂点削減の強度。0=なし、値が大きいほど軽量化 | 0 |
| 最大フィーチャ/タイル | 1タイルあたりの上限フィーチャ数 | 200,000 |

## 使い方

1. GeoJSONファイルをドロップゾーンにドラッグ＆ドロップ
2. 変換オプションを設定
3. 「変換 & 生成」ボタンをクリック
4. 変換完了後、各ファイルをダウンロード
5. PMTilesは地図上でプレビュー可能

## 技術スタック

| ライブラリ | 用途 | ライセンス |
|-----------|------|-----------|
| [gdal3.js](https://github.com/bugra9/gdal3.js) v2.8.1 | GeoJSON → FlatGeobuf / PMTiles 変換 | LGPL-2.1 |
| [MapLibre GL JS](https://maplibre.org/) v4.7.1 | 地図表示・PMTilesプレビュー | BSD-3-Clause |
| [PMTiles JS](https://github.com/protomaps/PMTiles) v4.3.0 | PMTilesプロトコル処理 | MIT |

## 注意事項

- 初回ロード時にGDAL.jsの初期化で数十秒かかります
- 大容量ファイル（100万フィーチャ超）の変換も対応していますが、処理時間がかかります
- 変換はすべてブラウザ内で完結するため、データが外部に送信されることはありません

## ライセンス

MIT License

### サードパーティライセンス

- gdal3.js: LGPL-2.1
- MapLibre GL JS: BSD-3-Clause
- PMTiles: MIT
