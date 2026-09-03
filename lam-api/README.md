# lam-api

`lam-api`는 `laam` QR 메뉴 프로젝트의 백엔드 API 스캐폴드입니다.

현재 버전은 최소 구조만 먼저 잡아둔 상태이며, 이후 메뉴 관리, 매장 운영 정보, 관리자 기능 등으로 확장하기 위한 출발점입니다.

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

## 실행 방법

```bash
go run ./cmd/server
```

기본 주소:

```text
http://localhost:8080
```

## 구현 메모

- `cmd/server/main.go`에서 HTTP 서버를 기동합니다.
- `internal/config`에서 기본 실행 설정을 불러옵니다.
- `internal/httpapi/router.go`에서 라우트를 연결합니다.
- `internal/httpapi/menu.go`에서 목 메뉴 응답을 반환합니다.
- Go 모듈 경로는 아직 임시 placeholder 상태이므로 최종 저장소 경로가 확정되면 정리할 수 있습니다.

## 검증 내역

아래 항목을 확인했습니다.

- `go build ./...`
