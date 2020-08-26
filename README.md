## 必要環境

Node.js v14.7
Redis 3.x
開発はWindows10、デプロイサーバはCentOS 7 or 8を想定

## コマンド

### `npm run start`
reactクライアント開発サーバが走る。

### `npm run server`
APIサーバが走る。

### `npm run dev`
APIサーバとreactクライアント開発サーバの両方が走る。

### `npm run build`
reactクライアントをproduction用にビルドする。dist/index.htmlから開く。

## 環境変数

| 環境変数名 | 内容 | APIサーバ | クライアント |
| --------------------------- | ---------------------- | --- | --- |
| REACT_APP_MapboxAccessToken | Mapboxのアクセストークン |     |  〇 |
| REACT_APP_SERVER_ALLOW_FROM_ALL | APIサーバのCRSF無効 | 〇  |   |
| REACT_APP_LOGLEVEL | ログレベル (0～3、0で全ログ出力) |  〇  |  〇 |
| REACT_APP_DEBUG | デバッグモード |  〇  |  〇 |

[dotenv](https://www.npmjs.com/package/dotenv) が効いているので、「.env.development.local」ファイルの記述がシェル変数よりも優先される。

## 事前準備

最初にMapboxにサインアップして、アクセストークンを取得しておくこと。

```
cp .env.development .env.development.local
cp .env.production .env.production.local
npm install
npm run server
(別端末から) curl http://localhost:3001/api/1.0/make_data
```

5分ほどでデータJSONが作成される。これは最初の1回だけでよい。

## 開発用の起動
.env.development.localを編集し、環境変数に以下を設定する。

| | |
| --------------------------- | ---------------------- |
| REACT_APP_MapboxAccessToken | 取得したMapboxのアクセストークン |
| REACT_APP_SERVER_ALLOW_FROM_ALL | 1 |
| REACT_APP_LOGLEVEL | 1 |
| REACT_APP_DEBUG | 1 |

APIサーバとreactクライアント開発サーバの両方を走らせた状態で http://localhost:3000 をブラウザで開くと、reactクライアントが起動する。

## daemon

productionで起動することが前提となる。

.env.production.localを編集し、環境変数MAPBOX_ATにtemporary tokenを取得するためのURIを書く。このURI中のアクセストークンはpublic READ権限およびREAD:TOKEN, WRITE:TOKEN権限が設定されていること。

### 必要環境
```
sudo npm i -g forever
```

### ステージング
#### インストールと起動
```
sudo su
source install/staging/install.rhel8 add
systemctl start covid19map_server_staging
systemctl enable covid19map_server_staging
```
#### 削除
```
sudo su
systemctl stop covid19map_server_staging
source install/staging/install.rhel8 remove
```

### 本番
#### インストールと起動
```
sudo su
source install/server/install.rhel8 add
systemctl start covid19map_server
systemctl enable covid19map_server
```
#### 削除
```
sudo su
systemctl stop covid19map_server
source install/server/install.rhel8 remove
```

### ログ等

/var/log/covid19map_server*にある。

```
su appuser -c "forever list"
```
でforeverのプロセスが見える。

### nginxとの連携

デプロイする際はreactクライアントが```npm run build```でproductionビルドされていることが前提となる。

| | |
| --------------------------- | ---------------------- |
| ドメイン名 | www.hogehoge.jp |
| プロジェクトルートディレクトリ | /webapp |
| REACT_APP_SERVER_PORT | 3001 |
| REACT_APP_SERVER_HOST | (空文字列) |
| REACT_APP_LOGLEREACT_APP_SERVER_URI_PREFIXVEL | /covid19map |

上記の設定では、たとえば次のようなconfになる。

```
upstream nodeapp {
   server localhost:3001;
}
map $http_upgrade $connection_upgrade {
   default upgrade;
   ''      close;
}

server {
    listen 80;
    listen [::]:80;
    server_name www.hogehoge.jp;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.hogehoge.jp;
    location / {
		    return 301 https://$host/covid19map/;
    }
    location /covid19map/ {
        alias /webapp/map_infections/dist/;
        index index.html;
    }
    location ~ ^/covid19map($|/$|/index.html|/api/) {
        proxy_pass                              http://nodeapp;
        proxy_redirect                          off;
        proxy_redirect                          off;
        proxy_set_header Host                   $host;
        proxy_set_header X-Real-IP              $remote_addr;
        proxy_set_header X-Forwarded-Host       $host;
        proxy_set_header X-Forwarded-Server     $host;
        proxy_set_header X-Forwarded-For        $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade                $http_upgrade;
        proxy_set_header Connection             $connection_upgrade;
    }
    
    # 以下、SSL証明書の設定
    ssl_ecdh_curve prime256v1;
    .
    .
    .
}
```

/covid19mapはdist/*を静的参照するが、/covid19map/api/*および/covid19map/index.htmlはAPIサーバに接続する。

## デバッグ方法

`npm run start`で走らせてから、Debug JavaScriptで http://localhost:3000 にデバッガをアタッチする。

WebStrom 2020.2だとなぜかうまくいかないので、Chromeから直接アタッチする。
Settings - debuggingのデバッグ用ポートとChrome拡張機能Jetbrains IDE supportのポートを合わせておき、Chromeの拡張機能ボタンJetbrains IDE supportから、Inspect in WebStormを実行する。


