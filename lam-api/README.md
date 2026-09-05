# lam-api

`lam-api`는 `laam` QR 메뉴 프로젝트의 백엔드 API 스캐폴드입니다.

메뉴·요청 관리와 손님 결제 승인, 토스플레이스 POS 주문 동기화를 담당합니다.

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
- `POST /api/v1/payments/orders`
- `GET /api/v1/payments/orders/{orderId}`
- `POST /api/v1/payments/confirm`

## 실행 방법

```bash
go run ./cmd/server
```

기본 주소:

```text
http://localhost:9090
```

결제를 사용하려면 다음 값을 환경변수로 설정합니다. 키는 저장소에 커밋하지 않습니다.

```bash
PAYMENT_API_TOKEN=웹과_API가_공유할_긴_임의값
TOSS_PAYMENTS_SECRET_KEY=토스페이먼츠_시크릿키
TOSS_PLACE_ACCESS_KEY=토스플레이스_오픈API_액세스키
TOSS_PLACE_SECRET_KEY=토스플레이스_오픈API_시크릿키
TOSS_PLACE_MERCHANT_ID=토스플레이스_가맹점_ID
```

토스페이먼츠가 실제 결제를 승인하고, 승인 완료 후 토스플레이스 Open API에 결제 완료 주문을 생성합니다. 토스플레이스 전송이 실패해도 이미 승인된 결제 상태는 `DONE`으로 보존됩니다.

토스플레이스가 설정되어 있으면 API 시작 시와 이후 5분마다 POS 카탈로그를 동기화합니다.

- 상품명, 가격, 판매 상태와 토스 상품 ID는 POS를 원본으로 사용합니다.
- 기존 `lam` 메뉴와 이름이 일치하면 설명, 이미지, 뱃지를 유지한 채 연결합니다.
- 신규 POS 상품은 `하이볼 / 위스키 / 칵테일 / 논알콜` 웹 카테고리에 자동 분류합니다.
- POS에서 사라진 상품, 품절 상품, 0원 상품은 손님 화면에서 숨깁니다.
- 결제 완료 주문은 임의 상품이 아닌 연결된 POS 상품 ID로 생성합니다.

## 구현 메모

- `cmd/server/main.go`에서 HTTP 서버를 기동합니다.
- `internal/config`에서 기본 실행 설정을 불러옵니다.
- `internal/httpapi/router.go`에서 라우트를 연결합니다.
- 결제 주문 금액은 요청 본문이 아니라 DB에 저장된 메뉴 가격으로 생성하고 승인 시 다시 대조합니다.
- `15,000원~`처럼 금액이 확정되지 않은 메뉴는 온라인 결제 주문을 만들지 않습니다.

## 검증 내역

아래 항목을 확인했습니다.

- `go build ./...`
