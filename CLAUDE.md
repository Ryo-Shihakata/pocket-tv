# ポケットTV（pocket-tv）

## 概要

スマホからテレビを見るための自分専用PWA。映像は流さず、公式の同時配信（NHK ONE・TVer リアルタイム）を局ごとのボタン1つで開く。NHK総合・Eテレ（福岡）は NHK番組表API で「いま」と「次」と番組表を出す。個人利用のみ・外部公開しない。

## 技術スタック

- Cloudflare Workers（静的アセット `public/` ＋ `/api/epg` だけ Worker を通す）＋ KV（番組表キャッシュ `EPG`）
- フロントはビルドなしの素の HTML/CSS/JS（PWA: `manifest.webmanifest` / `sw.js`）
- テストは `node --test`（依存なし）

## コマンド

| 目的 | コマンド |
|------|----------|
| 依存インストール | `npm install` |
| 開発サーバ起動 | `XDG_CONFIG_HOME=~/.config/wrangler npx wrangler dev` |
| テスト | `npm test` |
| デプロイ | `XDG_CONFIG_HOME=~/.config/wrangler npx wrangler deploy` |

## 規約・注意点

- **チューナー＋B-CAS 方式（Mirakurun 等）は扱わない。** 映像は必ず公式サービス側で再生させる。iframe 埋め込みもしない（NHK は CSP で拒否、TVer は規約第4条(9)に触れ得る）
- **TVer の非公式API（番組表など）は呼ばない**（規約第4条(7)(8)）。民放は番組表なしのリンクのみ
- NHK番組表API（Ver.3, `program-api.nhk.jp/v3/papiPgDateTv`）は **1日300回**。KV に (サービス, 日付) ごと TTL 2時間、失敗時は10分叩かない。area=400（福岡）、service=g1/e1
- NHK の利用規約で **「NHK番組の情報提供：NHK」のクレジット表示必須**・NHKロゴ使用不可・APIキーの第三者開示不可
- 秘密: `NHK_API_KEY`（本番は `wrangler secret put`、手元は `.dev.vars`。コミット禁止）。`NHK_API_URL` は動作確認でモックへ差し替える時だけ使う
- Ver.3 の実レスポンスは実キーで未確認。`src/epg.js` の `normalize` は `list` が配列でもサービス別オブジェクトでも読めるようにしてある
- 外部データ（番組名など）は必ず `textContent` で描く。CSP は `public/_headers`
- wrangler は dev-vm では `XDG_CONFIG_HOME=~/.config/wrangler` を付ける
