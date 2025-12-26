# gin-nginx 🐹🔧

### Docker で起動

プロジェクトルートで:

```sh
docker compose up --build
```

バックグラウンド起動:

```sh
docker compose up -d --build
```

api コンテナだけを再起動する:

```sh
docker compose restart api
```

アクセス: `http://localhost:8080`

### ローカルで実行（開発向け）

`app/` フォルダで実行:

```sh
cd app
go run main.go
```

サーバはデフォルトで `:8080` をリッスンします。

---

## API エンドポイント 📡

- GET `/` → `static/index.html` を返す
- GET `/api/ping` → 動作確認（レスポンス: `{ "message": "pong" }`）
- POST `/api/echo` → JSON またはフォームで `text` を受け取り、受け取った値を返す

例: curl

```sh
curl -X GET http://localhost:8080/api/ping
# => {"message":"pong"}

curl -X POST -H "Content-Type: application/json" -d '{"text":"hello"}' http://localhost:8080/api/echo
# => {"you_sent":"hello"}
```

PowerShell 例:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/echo" -ContentType "application/json" -Body '{"text":"hello"}'
```

---

## プロジェクト構成 📁

```
compose.yaml
app/
  Dockerfile
  Dockerfile.dev
  go.mod
  main.go
  static/
    index.html
nginx/
  default.conf
```
