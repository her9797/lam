# lam-api

`lam-api` is the backend scaffold for the `lam` QR menu project.

The current version is intentionally minimal and focuses on a clean starting structure for menu, store, and operational APIs that will be expanded later.

## Tech Stack

- Go `1.26`
- Standard library `net/http`

## Current Structure

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

## Current Endpoints

- `GET /health`
- `GET /api/v1/menu`

## Run

```bash
go run ./cmd/server
```

Default local address:

```text
http://localhost:8080
```

## Implementation Notes

- `cmd/server/main.go` boots the HTTP server
- `internal/config` handles basic runtime configuration
- `internal/httpapi/router.go` wires the routes
- `internal/httpapi/menu.go` returns mocked menu data
- The module path is still a temporary placeholder and should be updated when the final repository path is confirmed

## Verification

Verified with:

- `go build ./...`
