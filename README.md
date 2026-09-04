# laam

`laam`은 바 `laam`을 위한 모바일 우선 QR 메뉴 서비스 모노레포입니다.

손님은 QR을 스캔해 별도 앱 설치 없이 바로 모바일 웹으로 들어와 메뉴를 보고, 사장님께 한마디를 남기고, 이벤트나 공지 내용을 확인할 수 있습니다.  
운영자는 관리자 화면에서 카테고리, 메뉴, 요청, 이벤트를 한곳에서 관리할 수 있도록 구성되어 있습니다.

## 프로젝트 개요

이 프로젝트는 단순한 메뉴 페이지가 아니라, 매장 운영 흐름까지 함께 다루는 QR 웹 서비스입니다.

- 손님 화면에서는 메뉴 탐색, 요청 작성, 이벤트 확인이 자연스럽게 이어집니다.
- 요청은 `바로 전달하기`와 `특별한`으로 나뉘어 운영 목적에 맞게 분리됩니다.
- 관리자 화면에서는 메뉴와 공지뿐 아니라 손님 요청 상태 확인과 특별 요청 관리까지 할 수 있습니다.
- API가 연결되지 않은 상황에서도 프론트는 로컬 데이터로 fallback 되도록 구성되어 있어 UI 작업을 이어가기 쉽습니다.

## 저장소 구조

```text
lam
├─ lam-web         # 손님용 모바일 웹 + 관리자 웹
├─ lam-admin-web   # 운영자용 관리자 웹(신규)
├─ lam-api         # 메뉴/운영 데이터 API
├─ docker-compose.yml
├─ .gitignore
└─ README.md
```

## 주요 기능

### 손님용 모바일 웹

- 모바일 화면 기준으로 설계된 QR 진입형 메뉴 UI
- `메뉴 / 사장님께 한마디 / 이벤트` 상위 탭 구성
- 카테고리별 메뉴 탐색과 상세 정보 확인
- 메뉴 이미지 노출 및 대표 메뉴 중심 구성
- 플로팅 홈 버튼, 맨 위로 이동 버튼 제공

### 요청 기능

- `바로 전달하기`
  - 손님이 짧은 요청이나 한마디를 바로 남길 수 있는 단문 요청
- `특별한`
  - 성별 선택과 함께 별도 폼을 작성하는 구조화된 요청
  - 입력 항목: 이름, 나이, 사는 곳, 연락처(인스타그램), 이상형, 하고 싶은 말
- 요청 작성 후 손님 화면에서 즉시 피드백 메시지 노출

### 관리자 화면

- 카테고리 생성 및 관리
- 메뉴 등록, 수정, 삭제
- 메뉴 이미지 업로드 및 크롭 편집
- 이벤트/공지 등록 및 삭제
- 손님 요청 확인 보드
  - `바로 전달하기`
  - `특별한 - 남자`
  - `특별한 - 여자`
- 요청 보드는 가로 슬라이드 구조로 구성되어 있고, 현재 위치를 점 인디케이터로 표시
- 많은 요청이 쌓이면 카드 내부에서 스크롤되도록 처리
- `바로 전달하기` 요청은 `미처리 → 확인 → 처리완료` 흐름으로 관리
- `특별한` 요청은 상세보기와 삭제 중심으로 관리

### 백엔드/API

- 부트스트랩 데이터 제공
- 메뉴/카테고리/이벤트 관리용 관리자 API
- 손님 요청 생성 API
- 특별 요청 전용 생성/조회/삭제 API
- PostgreSQL 기반 저장 구조
  - `customer_requests`: 바로 전달하기 요청
  - `special_requests`: 특별한 요청

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
- PostgreSQL
- `pgx/v5`
- 표준 라이브러리 `net/http`

## 하위 프로젝트

### `lam-web`

손님이 실제로 보게 되는 QR 메뉴 웹과 운영자가 사용하는 관리자 UI를 포함합니다.

- Next.js App Router 기반 구조
- `screens`, `navigation`, `services` 중심 분리
- 관리자/손님 화면을 같은 프로젝트 안에서 운영
- API 실패 시 로컬 목 데이터 fallback 지원

### `lam-admin-web`

운영자용 관리자 웹입니다. 기존 `lam-web` 내부의 관리자 UI는 이 프로젝트와 별개로 그대로 유지되며, 별도의 Next.js 프로젝트로 운영됩니다.

- Next.js App Router 기반 구조
- 카테고리/메뉴/이벤트 관리, 손님 요청(`바로 전달하기`/`특별한`) 확인 화면 제공
- 세부 실행 방법은 `lam-admin-web/README.md` 참고

### `lam-api`

메뉴, 공지, 요청, 관리자 기능을 위한 백엔드입니다.

- `cmd/server` 기반 서버 진입점
- `internal/config` 환경 설정 로딩
- `internal/httpapi` 라우팅 및 응답 처리
- PostgreSQL 스키마 초기화 및 기본 데이터 시드 처리

## 로컬 실행 방법

### 1. API 실행

```bash
cd lam-api
go run ./cmd/server
```

기본 주소:

```text
http://localhost:9090
```

기본 환경값:

- `APP_ADDR=:9090`
- `DATABASE_URL=postgres://lam:lam@127.0.0.1:5432/lam?sslmode=disable`
- `ALLOWED_ORIGIN=*`
- `ADMIN_API_TOKEN=lam-admin-api-token`

### 2. 웹 실행

```bash
cd lam-web
npm install
npm run dev
```

기본 주소:

```text
http://localhost:3000
```

프론트는 별도 설정이 없으면 기본적으로 `http://localhost:9090` API를 바라봅니다.

### 3. 관리자 웹 실행

기존 `lam-web`의 관리자 UI는 그대로 유지되며, 아래 `lam-admin-web`은 별도로 선택 실행할 수 있는 신규 관리자 웹입니다.

```bash
cd lam-admin-web
cp .env.example .env.local   # ADMIN_PASSWORD, SESSION_SECRET, ADMIN_API_TOKEN, API_BASE_URL 값을 채운다
npm install
npm run dev
```

기본 주소:

```text
http://localhost:3000
```

필수 교체 secret(`.env.example` 참고, 실제 값은 커밋하지 않는다):

- `ADMIN_PASSWORD`: 관리자 로그인 비밀번호
- `SESSION_SECRET`: 로그인 세션 서명용 비밀키
- `ADMIN_API_TOKEN`: `lam-api`의 `ADMIN_API_TOKEN`과 동일해야 하는 관리자 API 토큰

`lam-web`을 로컬에서 함께 실행하는 경우 포트가 겹치므로(둘 다 기본 3000), 두 웹을 동시에 띄우려면 한쪽의 포트를 변경하거나 Docker Compose 실행(아래)을 사용하세요.

## Docker Compose 실행

`docker-compose.yml`은 PostgreSQL, `lam-api`, `lam-web`, `lam-admin-web` 네 서비스를 함께 띄웁니다. 기존 PostgreSQL 설정과 `lam-postgres-data` volume은 그대로 유지됩니다.

`lam-admin-web`의 `ADMIN_PASSWORD`와 `SESSION_SECRET`에는 **기본값이 없습니다.** 두 값이 설정되어 있지 않으면 `docker compose config`/`docker compose up`이 즉시 실패합니다(fail-loud). 실행 전에 저장소 루트에 `.env` 파일을 만들거나 셸 환경변수로 내보내세요.

```bash
cat > .env <<'EOF'
ADMIN_PASSWORD=로컬에서_사용할_비밀번호
SESSION_SECRET=로컬에서_사용할_세션_서명키
EOF
# 또는: export ADMIN_PASSWORD=... SESSION_SECRET=...

docker compose up -d --build
docker compose ps
```

`.env`는 커밋하지 않습니다(실제 secret을 저장소에 남기지 않는다).

| 서비스 | 컨테이너 이름 | Host 포트 | 설명 |
| --- | --- | --- | --- |
| `postgres` | `lam-postgres` | `5432` | PostgreSQL |
| `lam-api` | `lam-api` | `9090` | API 서버 |
| `lam-web` | `lam-web` | `3000` | 손님용 웹(+ 기존 관리자 UI) |
| `lam-admin-web` | `lam-admin-web` | `3001` | 신규 관리자 웹, 로그인: `http://localhost:3001/login` |

환경변수 구분:

- **필수(기본값 없음, 미설정 시 compose 실패)**: `ADMIN_PASSWORD`, `SESSION_SECRET` (`lam-admin-web` 로그인을 통과시키는 값)
- **로컬 개발용 기본값 있음(운영 배포 전 반드시 교체)**: `ADMIN_API_TOKEN` (`lam-api`·`lam-admin-web` 공통 기본값 `lam-admin-api-token`, 두 값이 반드시 동일해야 한다), `STAFF_ENTRY_TOKEN` (`lam-web`, 기본값 빈 문자열)

필수 값을 포함해 셸 환경변수로 덮어쓸 수 있습니다.

```bash
ADMIN_API_TOKEN=... ADMIN_PASSWORD=... SESSION_SECRET=... docker compose up -d --build
```

### 알려진 제약: 관리자 웹에서 메뉴 이미지가 깨지는 경우

`lam-admin-web`의 `API_BASE_URL`은 컨테이너 간 통신(서버 사이드 fetch, `/api/bootstrap`·`/api/admin/*` BFF)뿐 아니라 메뉴 이미지 `contentUrl`을 절대경로로 만드는 데도 그대로 쓰입니다. 이미지는 브라우저가 이 주소로 직접 요청합니다.

기본값(`http://lam-api:8080`)은 Compose 내부 DNS 이름이라 컨테이너 사이에서만 풀리고, 호스트 브라우저에서는 풀리지 않습니다. 그 결과 관리자 웹을 호스트 브라우저(`http://localhost:3001`)로 열면 다른 데이터는 정상 로드되지만 메뉴 이미지만 깨져 보입니다.

호스트 브라우저에서 이미지까지 정상적으로 보려면, `lam-admin-web` 서비스의 `API_BASE_URL`만 호스트에서 접근 가능한 주소(`lam-api`가 호스트에 게시된 포트 `9090`)로 덮어써서 실행하세요. `docker-compose.yml`의 `lam-admin-web.environment.API_BASE_URL`은 `${API_BASE_URL:-http://lam-api:8080}` 형태로 셸 변수를 참조하므로, 아래처럼 실행 전에 셸 변수를 설정하면 실제로 반영됩니다.

```bash
API_BASE_URL=http://localhost:9090 docker compose up -d --build lam-admin-web
```

이 override는 `lam-admin-web` 서비스에만 적용됩니다. `lam-api`는 `API_BASE_URL`이라는 이름의 환경변수를 아예 사용하지 않고(`APP_ADDR`으로 자신의 리슨 주소를 설정), `lam-web`의 `API_BASE_URL`은 compose 파일에 `http://lam-api:8080`이 고정 문자열로 적혀 있어 셸 변수를 참조하지 않습니다. 따라서 이 override는 `lam-api`나 `lam-web`의 동작을 바꾸지 않습니다.

이 경우 `lam-admin-web` 컨테이너 내부의 서버 사이드 fetch도 호스트로 나갔다가 다시 호스트의 게시된 포트로 들어오므로 정상 동작합니다. 위 override 없이 기본값 그대로 사용하는 경우, 메뉴 이미지가 깨지는 것은 알려진 제약으로 간주하고 다른 화면 확인에는 영향이 없습니다.

## 개발 메모

- 프론트는 API 연결 실패 시 로컬 데이터로 자동 fallback 됩니다.
- 관리자 기능까지 포함되어 있어 단순 메뉴 페이지보다 운영 시나리오에 가깝게 구성되어 있습니다.
- 현재 UI는 모바일 우선으로 설계되어 있으며, QR 진입 흐름에 맞춰 빠르게 탐색할 수 있도록 조정되어 있습니다.

## 사용할 수 있는 검증 명령

### 웹

```bash
cd lam-web
npm run lint
npm run build
```

### 관리자 웹

```bash
cd lam-admin-web
npm run lint
npm run build
```

### API

```bash
cd lam-api
go build ./...
```
