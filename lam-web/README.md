# lam-web

`lam-web`은 `laam` QR 메뉴 프로젝트의 손님용 모바일 웹 프론트엔드입니다.

손님이 QR을 스캔했을 때 가장 먼저 보게 되는 화면이며, 메뉴 확인과 요청사항/이벤트 안내를 빠르게 소비할 수 있도록 모바일 우선으로 구성했습니다.

## 기술 스택

- Next.js `16.3.0`
- React `19.2.0`
- React DOM `19.2.0`
- TypeScript `5.9.2`
- ESLint `9.34.0`
- `eslint-config-next` `16.3.0`
- `@types/node` `24.3.0`
- `@types/react` `19.2.2`
- `@types/react-dom` `19.2.2`

## 스크립트

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

## 주요 라우트

- `/`: 메인 화면
- `/menu`: 메뉴 메인 화면
- `/menu/[category]`: 카테고리별 메뉴 상세
- `/requests`: 요청사항 안내 화면
- `/events`: 공지 및 이벤트 화면

## 디렉토리 구조

```text
lam-web
├─ app
├─ components
│  ├─ menu
│  ├─ navigation
│  └─ screens
├─ data
├─ services
├─ public
└─ README.md
```

## 구현 메모

- Next.js App Router를 사용합니다.
- 공통 UI는 역할 기준으로 분리해 유지보수성을 높였습니다.
- 목 메뉴 데이터는 `data/menu-data.ts`에 있습니다.
- 메뉴 선택 및 조회 로직은 `services/menu-service.ts`에 있습니다.
- 전역 스타일 토큰과 레이아웃 관련 규칙은 `app/globals.css`에 모아뒀습니다.
- 데스크톱보다 QR 진입형 모바일 브라우징 경험에 맞춰 UI를 구성했습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

접속 주소:

```text
http://localhost:3000
```

## 검증 내역

아래 항목을 확인했습니다.

- `npm run build`
- `npm run lint`
