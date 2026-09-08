---
name: lam-verify-ci
description: Use when the lam-api CI workflow fails, or before pushing lam-api changes, to reproduce the GitHub Actions checks locally on LF-normalized content and confirm the real cause of a failed run.
---

# lam CI 검증

`.github/workflows/lam-api-ci.yml`(workflow 이름 `lam-api CI`)이 실행하는 검사를 로컬에서 재현하고, 실패한 run의 원인을 확정한다. 추측한 원인을 확정된 원인으로 보고하지 않는다.

## CI가 실행하는 검사

working directory는 `lam-api`이며, 순서대로 실행되고 앞 단계가 실패하면 뒤 단계는 실행되지 않는다.

| 단계 | 명령 | 실패 조건 |
| --- | --- | --- |
| 코드 포맷 검사 | `gofmt -l .` | 출력이 비어 있지 않음 |
| 정적 분석 | `go vet ./...` | 종료 코드 != 0 |
| 빌드 | `go build ./...` | 종료 코드 != 0 |
| 테스트 | `go test ./... -v -count=1` | 종료 코드 != 0 |

Go 버전은 `lam-api/go.mod`의 `go` 지시자를 따른다. 로컬 Go 버전이 다르면 그 사실을 보고에 남긴다.

## 줄바꿈 함정 (재현 전에 반드시 확인)

저장소에 `.gitattributes`가 없고 Windows 개발 환경은 `core.autocrlf=true`다. 그래서 워킹트리의 `.go` 파일은 CRLF이고, `lam-api`에서 `gofmt -l .`을 그대로 실행하면 **모든** `.go` 파일이 위반으로 출력된다. 전부 오탐이며 진짜 위반 파일이 그 목록에 묻힌다.

CI는 LF 체크아웃에서 실행되므로 로컬 검증도 LF 기준으로 맞춘다. `git config --get core.autocrlf`로 현재 설정을 먼저 확인한다.

## 로컬 재현

### 워킹트리 기준 (커밋 전)

```bash
cd lam-api
for f in $(git ls-files '*.go'); do
  if ! diff -q <(tr -d '\r' < "$f") <(tr -d '\r' < "$f" | gofmt) >/dev/null 2>&1; then
    echo "UNFORMATTED: $f"
  fi
done
go vet ./...
go build ./...
```

출력된 파일만 `gofmt -w <파일>`로 정리한다. 정리 후 `git diff`로 변경 줄이 의도한 정렬뿐인지 확인한다. 파일 전체가 변경으로 보이면 LF 재작성이 diff에 새어 나온 것이므로 커밋하지 않고 중단한다.

### 커밋 기준 (push 전, CI와 가장 가까움)

```bash
TMP=$(mktemp -d)
git -c core.autocrlf=false archive HEAD lam-api | tar -x -C "$TMP"
cd "$TMP/lam-api" && gofmt -l . && go vet ./... && go build ./...
```

`-c core.autocrlf=false`를 빼면 `git archive`가 CRLF로 변환해 위의 오탐이 그대로 재현된다. 특정 run을 재현할 때는 `HEAD` 대신 그 run의 head SHA를 넣는다.

### 테스트

`internal/store`와 `internal/httpapi`의 통합 테스트는 `TestMain`이 `docker run`으로 `postgres:16-alpine`을 직접 기동·정리한다. CI 러너는 Docker를 기본 제공하므로 workflow에 별도 service 컨테이너가 없다.

- Docker가 PATH에 없으면 해당 패키지는 컨테이너를 띄우지 않고 `os.Exit(0)`으로 조용히 통과한다. 이 통과는 통합 테스트 통과가 아니다.
- 통합 테스트까지 확인하려면 Docker를 실행한 뒤 `go test ./... -count=1`을 돌리고, 출력에 `docker not found in PATH`가 없는지 확인한다.
- Docker 없이 확인한 결과를 CI 테스트 단계 통과 근거로 사용하지 않는다.

## 실패한 run 진단

```bash
gh run list --branch <브랜치> --limit 5
gh run view <run-id> --log-failed
gh run view <run-id> --json headSha --jq .headSha
```

`코드 포맷 검사 (gofmt)` 단계는 위반 파일 목록을 stdout이 아니라 `$GITHUB_STEP_SUMMARY`에만 기록한다. 따라서 `--log-failed`에는 `Process completed with exit code 1`만 남고 파일명은 나오지 않는다. `gh api repos/<owner>/<repo>/actions/jobs/<job-id>` 응답에도 step summary는 없다. 이 경우 위 "커밋 기준" 재현으로 파일 목록을 직접 얻는다.

테스트 단계 실패는 `lam-api-test-log` artifact(`test-output.log`)에 전체 출력이 있다.

```bash
gh run download <run-id> --name lam-api-test-log
```

## 보고

- 실패한 run id와 실패 단계
- 확정한 원인과 해당 파일·줄
- 재현에 사용한 명령과 그 결과
- 실행하지 못한 검사와 이유 (예: Docker 미실행으로 통합 테스트 미검증)

## 중단 조건

- 로컬 재현 결과가 CI 실패 단계와 일치하지 않는다.
- 실패 원인이 다른 개발자의 미커밋 변경 또는 소유 브랜치에 있다.
- 수정에 workflow 파일 변경이 필요하다.
- 실패 단계가 테스트인데 Docker를 실행할 수 없어 결과를 확인할 수 없다.

## 관련 Skill

- 원인을 고치는 작업은 `lam-work-on-issue`의 TDD와 완료 전 검증을 따른다.
- `main` 전달 전 CI 상태 확인은 `lam-deliver-change`에서 이 Skill을 호출한다.
