# TASKS

完了の定義: スマホで開くと「今やっている番組」が局ごとに並び、タップで公式配信（TVer / NHK ONE 等）の視聴画面に飛べる PWA が Cloudflare Workers で動いている。

- [x] 方針決定: 公式配信をまとめる（チューナー＋B-CAS方式はやらない）
- [x] 雛形作成・git init
- [x] 公式配信・番組表データの仕様調査（researcher に委譲中）
- [x] 設計確定（局リスト・番組表の取得元・URL形式）→ CLAUDE.md 記入
- [x] Worker: 番組表APIのプロキシ＋キャッシュ
- [x] フロント: 局グリッド（放送中／次）、タップで公式アプリ/サイトへ
- [x] PWA 化（manifest / sw / アイコン）
- [x] ローカル動作確認（スマホ幅のスクリーンショット）
- [ ] NHK番組表APIキー取得（ユーザー作業）
- [ ] デプロイ（ユーザー確認後）: KV作成 → secret登録 → deploy
- [ ] 実キーで Ver.3 のレスポンス形を確認（normalize が読めているか）
- [ ] 実機確認: iPhone/Android の PWA から TVer・NHK ONE アプリが起動するか
- [ ] 外部に見せないなら Cloudflare Access をかけるか検討
- [x] vault 記録・自動メモリにポインタ
