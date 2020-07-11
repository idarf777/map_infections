## コマンド

### `npm run start`
reactクライアント開発サーバが走る。

### `npm run server`
APIサーバが走る。

### `npm run dev`
APIサーバとreactクライアント開発サーバの両方が走る。

## 環境変数

| 環境変数名 | 内容 | APIサーバ | クライアント |
| --------------------------- | ---------------------- | --- | --- |
| REACT_APP_MapboxAccessToken | Mapboxのアクセストークン |     |  〇 |
| REACT_APP_SERVER_ALLOW_FROM_ALL | APIサーバのCRSF無効 | 〇  |   |
| REACT_APP_LOGLEVEL | ログレベル (0～3、0で全ログ出力) |  〇  |  〇 |
| REACT_APP_DEBUG | デバッグモード |  〇  |  〇 |

[dotenv](https://www.npmjs.com/package/dotenv) が効いているので、「.env」ファイルの記述がシェル変数よりも優先される。

## 事前準備
`npm install`してからAPIサーバを走らせて、まず  http://localhost:3000/api/1.0/make_data をGETする。
5分ほどでデータJSONが作成される(ブラウザがタイムアウトリトライしないように、タブを閉じること)。
これは最初の1回だけでよい。

この際、環境変数で以下を設定しておくこと。

| | |
| --------------------------- | ---------------------- |
| REACT_APP_SERVER_ALLOW_FROM_ALL | 1 |
| REACT_APP_LOGLEVEL | 1 |
| REACT_APP_DEBUG | 1 |

進捗状況はサーバのログ(コンソール)でのみ確認できる。

Mapboxにサインアップしてアクセストークンを取得しておくこと。

## 開発用の起動
環境変数を次のように設定する。

| | |
| --------------------------- | ---------------------- |
| REACT_APP_MapboxAccessToken | Mapboxのアクセストークン |
| REACT_APP_DEBUG | 1 |
| REACT_APP_LOGLEVEL | (必要に応じて) |

APIサーバとreactクライアント開発サーバの両方を走らせておき、http://localhost:3000 からreactクライアントを起動する。


## デバッグ方法

`npm run start`で走らせてから、Debug JavaScriptで http://localhost:3000 にデバッガをアタッチする。

WebStrom 2020.2だとなぜかうまくいかないので、Chromeから直接アタッチする。
Settings - debuggingのデバッグ用ポートとChrome拡張機能Jetbrains IDE supportのポートを合わせておき、Chromeの拡張機能ボタンJetbrains IDE supportから、Inspect in WebStormを実行する。


