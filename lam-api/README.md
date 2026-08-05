# lam-api

Backend API scaffold for the `lam` project.

## Stack

- Go 1.26
- net/http

## Run

```bash
go run ./cmd/server
```

Default server address:

```text
http://localhost:8080
```

## Endpoints

- `GET /health`
- `GET /api/v1/menu`

## Notes

- This is a minimal scaffold intended for handoff.
- Menu data is still mocked in-memory for the first version.
