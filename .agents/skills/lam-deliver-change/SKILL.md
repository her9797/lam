---
name: lam-deliver-change
description: Use when delivering verified lam changes from ms/dev to main via a cherry-picked ms/feature/<기능명> PR branch, preparing or reviewing that PR, or handling it after merge.
---

# lam 변경 전달

`main`에는 `ms/dev`를 통째로 merge하지 않는다. `ms/dev`에서 검증된 커밋만 cherry-pick해 새로 만든 `ms/feature/<기능명>` 브랜치로만 전달한다.

```
ms/dev
  ↓ PR에 필요한 커밋만 cherry-pick
ms/feature/<기능명>
  ↓ Pull Request
main
```

## 전달 전 확인

1. `ms/dev`에서 working tree가 깨끗한지 확인한다.
2. 로컬과 원격 `ms/dev`, `main` 상태를 fetch 후 비교한다.
3. 이번 PR에 포함할 커밋 범위를 사용자와 확정한다. Issue가 있으면 완료 조건과 대조한다.
4. 대상 커밋 각각의 TDD 근거와 최신 회귀 검증 결과를 확인한다.
5. 저장소에 필수 CI가 구성되어 있으면 대상 커밋에서 통과했는지 확인한다.

working tree가 깨끗하지 않거나 브랜치 상태가 불일치하면 전달을 중단한다. CI가 없거나 접근할 수 없으면 통과로 간주하지 않고 미검증 항목으로 보고한다.

## ms/feature/<기능명> 준비

1. 최신 `main`을 기준으로 `ms/feature/<기능명>`을 새로 만든다.
2. 확정한 커밋만 원래 순서대로 `ms/dev`에서 cherry-pick한다. 관련 없는 커밋은 포함하지 않는다.
3. cherry-pick 충돌은 `ms/feature/<기능명>`에서 해결한다. 해결 과정에서 원본 `ms/dev` 커밋과 내용이 달라지면 그 사실과 이유를 보고한다.
4. cherry-pick 후 `ms/feature/<기능명>`에서 빌드·테스트를 다시 실행해 확인한다.

## PR과 병합

- PR 생성과 병합은 사용자가 요청한 경우에만 수행한다.
- 대상은 `ms/feature/<기능명>` → `main`으로 고정한다. `ms/dev` → `main` PR은 만들지 않는다.
- PR 본문에는 변경 목적, cherry-pick한 원본 `ms/dev` 커밋과 포함 커밋 목록, 관련 Issue, 검증 결과와 알려진 위험을 적는다.
- Issue 종료가 승인된 경우에만 `Closes #번호`를 사용한다. 그 외에는 `Refs #번호`를 사용한다.
- 병합 방식은 merge commit을 기본으로 하며 squash, rebase merge와 force push는 사용하지 않는다.
- 필수 검증이 실패·취소·진행 중이면 병합하지 않는다.

## 병합 후 처리

- `ms/dev`를 `main`과 동기화하지 않는다. cherry-pick으로 커밋 SHA가 달라지므로 fast-forward가 불가능하며 시도하지 않는다.
- `ms/feature/<기능명>`은 병합 후 삭제해도 된다. 삭제는 사용자가 요청한 범위에서 수행한다.
- 이후 `main`에만 있고 `ms/dev`에 없는 변경(hotfix 등)이 생기면, 그때 별도로 `main`을 `ms/dev`로 merge한다. 매 PR마다 반복적으로 동기화하지 않는다.

## 단순 변경 전달

순수 문서, 주석, 비동작 메타데이터만 포함된 경우 자동 테스트는 요구하지 않는다. 대신 포함 diff, 형식과 링크를 확인하고 테스트 생략 이유를 PR과 완료 보고에 남긴다.

## 중단 조건

- `ms/dev`가 원격과 일치하지 않는다.
- cherry-pick 대상 범위에 미완료 또는 의도하지 않은 커밋이 있다.
- 필수 검증이 실패했거나 결과를 확인할 수 없다.
- 다른 개발자의 진행 중 변경을 함께 전달하게 된다.
- squash, rebase merge, force push 또는 history rewrite가 필요하다.
- cherry-pick 충돌 해결로 원본 커밋의 의미가 바뀌었는데 사용자 확인을 받지 못했다.
