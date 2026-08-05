# lam

`lam`은 바 `lam`을 위한 모바일 우선 QR 메뉴 서비스 모노레포입니다.

손님이 QR을 스캔하면 별도 앱 설치 없이 모바일 웹으로 바로 진입해서 메뉴를 확인하고, 요청사항과 이벤트/안내 내용을 빠르게 볼 수 있도록 구성했습니다.

## 저장소 구조

```text
lam
├─ lam-web   # 손님용 모바일 웹 프론트엔드
├─ lam-api   # 백엔드 API 스캐폴드
├─ .gitignore
└─ README.md
```

## 기술 스택

### 프론트엔드

- Next.js `16.3.0`
- React `19.2.0`
- React DOM `19.2.0`
- TypeScript `5.9.2`
- ESLint `9.34.0`
- `eslint-config-next` `16.3.0`
- `@types/node` `24.3.0`
- `@types/react` `19.2.2`
- `@types/react-dom` `19.2.2`

### 백엔드

- Go `1.26`
- 표준 라이브러리 `net/http`

## 현재 구현 범위

- QR 진입용 모바일 웹 UI
- `메뉴 / 요청사항 / 이벤트` 상위 탭 구성
- 메뉴 상세 페이지 및 서브 카테고리 이동
- 목 데이터 기반 메뉴 렌더링
- 홈 이동 버튼, 맨 위로 이동 버튼 같은 플로팅 유틸리티
- 추후 확장을 위한 최소 백엔드 API 구조

## 하위 프로젝트

### `lam-web`

QR 메뉴를 실제로 손님이 보게 되는 프론트엔드입니다.

- Next.js App Router 기반 구조
- `navigation`, `screens`, `menu` 중심 공통 컴포넌트 분리
- 서비스 레이어와 목 데이터 분리
- 흑백 중심의 모바일 바 메뉴 UI 구성

### `lam-api`

메뉴, 매장 운영 정보, 향후 관리자 기능을 위한 백엔드 시작점입니다.

- `cmd/server` 기반 서버 진입점
- `internal/config` 환경 설정 로딩
- `internal/httpapi` 라우팅 및 응답 처리

## 로컬 실행 방법

### 웹

```bash
cd lam-web
npm install
npm run dev
```

기본 주소:

```text
http://localhost:3000
```

### API

```bash
cd lam-api
go run ./cmd/server
```

기본 주소:

```text
http://localhost:8080
```

## 검증 내역

현재 저장소는 아래 항목까지 확인했습니다.

- `lam-web`: `npm run build`
- `lam-web`: `npm run lint`
- `lam-api`: `go build ./...`

## 참고 사항

- 현재 API 응답 데이터는 아직 목 데이터 기반입니다.
- 현재 프로젝트는 앱보다 모바일 웹 우선 방향으로 구성되어 있습니다.
- Go 모듈 경로는 아직 임시 placeholder를 사용하고 있어, 최종 저장소 경로 기준으로 추후 정리할 수 있습니다.
