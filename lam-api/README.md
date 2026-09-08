# lam-api

`lam-api`는 `laam` QR 메뉴 프로젝트의 백엔드 API 스캐폴드입니다.

메뉴·요청 관리와 손님 주문 등록, 결제 승인, 토스플레이스 POS 동기화를 담당합니다.

## 기술 스택

- Go `1.26`
- 표준 라이브러리 `net/http`

## 현재 구조

```text
lam-api
├─ cmd
│  └─ server
├─ internal
│  ├─ config
│  └─ httpapi
├─ go.mod
└─ README.md
```

## 현재 엔드포인트

- `GET /health`
- `GET /api/v1/menu`
- `POST /api/v1/orders`
- `POST /api/v1/payments/orders`
- `GET /api/v1/payments/orders/{orderId}`
- `POST /api/v1/payments/confirm`
- `POST /api/v1/admin/song-requests/{requestId}/approve`
- `GET /api/v1/admin/song-player/queue`
- `PATCH /api/v1/admin/song-player/queue/{queueId}/status`

## 실행 방법

```bash
go run ./cmd/server
```

기본 주소:

```text
http://localhost:9090
```

손님 주문을 토스 POS에 등록하려면 다음 값을 환경변수로 설정합니다. 키는 저장소에 커밋하지 않습니다.

```bash
PAYMENT_API_TOKEN=웹과_API가_공유할_긴_임의값
TOSS_PLACE_ACCESS_KEY=토스플레이스_오픈API_액세스키
TOSS_PLACE_SECRET_KEY=토스플레이스_오픈API_시크릿키
TOSS_PLACE_MERCHANT_ID=토스플레이스_가맹점_ID
```

`POST /api/v1/orders`는 결제 내역 없이 후불 주문을 토스 POS에 생성합니다. 손님은 매장에서 별도로 결제합니다. 토스페이먼츠 결제 기능을 별도로 사용할 때만 `TOSS_PAYMENTS_SECRET_KEY`가 필요합니다.

토스플레이스가 설정되어 있으면 API 시작 시와 이후 5분마다 POS 카탈로그를 동기화합니다.

- 상품명, 가격, 판매 상태와 토스 상품 ID는 POS를 원본으로 사용합니다.
- 기존 `lam` 메뉴와 이름이 일치하면 설명, 이미지, 뱃지를 유지한 채 연결합니다.
- 신규 POS 상품은 `하이볼 / 위스키 / 칵테일 / 논알콜` 웹 카테고리에 자동 분류합니다.
- POS에서 사라진 상품, 품절 상품, 0원 상품은 손님 화면에서 숨깁니다.
- 손님 주문은 임의 상품이 아닌 연결된 POS 상품 ID로 생성합니다.

신청곡 자동 재생을 사용하려면 서버 실행 환경에 YouTube Data API v3 키를 추가합니다. 키는 관리자 웹에 노출하지 않습니다.

```bash
YOUTUBE_API_KEY=서버용_YouTube_Data_API_v3_키
```

관리자가 노래 신청을 승인하면 API가 임베드 가능한 영상을 검색해 재생 대기열에 저장합니다. 관리자 웹의 `/player` 화면은 대기열을 순서대로 재생하고 완료 상태를 API에 반영합니다.

## 구현 메모

- `cmd/server/main.go`에서 HTTP 서버를 기동합니다.
- `internal/config`에서 기본 실행 설정을 불러옵니다.
- `internal/httpapi/router.go`에서 라우트를 연결합니다.
- 결제 주문 금액은 요청 본문이 아니라 DB에 저장된 메뉴 가격으로 생성하고 승인 시 다시 대조합니다.
- `15,000원~`처럼 금액이 확정되지 않은 메뉴는 온라인 결제 주문을 만들지 않습니다.

## 검증 내역

아래 항목을 확인했습니다.

- `go build ./...`
