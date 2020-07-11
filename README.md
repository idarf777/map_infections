## コマンド

### `npm run start`
reactクライアント開発サーバが走る。

### `npm run server`
APIサーバが走る。

### `npm run dev`
APIサーバとreactクライアント開発サーバの両方が走る。

## 起動
APIサーバとreactクライアント開発サーバの両方を走らせておく。

まず  http://localhost:3000/api/1.0/make_data をGETして、データJSONを作っておく。これは最初の1回だけでよい。

http://localhost:3000 から、reactクライアントを起動する。

このときクライアントは http://localhost:3000/api/1.0/infectors を初めにGETし、そこからはAPIサーバにアクセスしない。


## デバッグ方法

`npm run start`で走らせてから、Debug JavaScriptで http://localhost:3000 にデバッガをアタッチする。

WebStrom 2020.2だとなぜかうまくいかないので、Chromeから直接アタッチする。
Settings - debuggingのデバッグ用ポートとChrome拡張機能Jetbrains IDE supportのポートを合わせておき、Chromeの拡張機能ボタンJetbrains IDE supportから、Inspect in WebStormを実行する。


