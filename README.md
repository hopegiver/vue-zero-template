# vue-zero-template

vue-zero 기반 풀스택 앱 템플릿. Cloudflare Workers + Hono 백엔드.

## 시작하기

```bash
npm install
wrangler dev
```

http://localhost:8787 에서 확인.

## 구조

```
├── app/                # 프론트엔드 (vue-zero)
│   ├── index.html
│   ├── pages/          # 파일 기반 라우팅
│   ├── components/     # 전역 컴포넌트
│   ├── layouts/        # 레이아웃
│   └── assets/css/     # Bootstrap + base.css
├── server/             # 백엔드 (Hono)
│   ├── index.js
│   ├── api/
│   ├── dao/
│   └── middleware/
└── wrangler.toml
```

## 명령어

```bash
wrangler dev      # 로컬 개발
wrangler deploy   # 배포
npm run scan      # pages.json, components.json, _registry.js 갱신
npm run test      # E2E 테스트
```

## License

[MIT](LICENSE)
