---
name: lam-deliver-change
description: Use when delivering verified lam changes from a developer's own dev branch (ino/dev or ms/dev) directly to main via Pull Request, preparing or reviewing that PR, or handling it after merge.
---

# lam 변경 전달

본인 dev 브랜치(`ino/dev` 또는 `ms/dev`)에서 `main`으로 직접 Pull Request를 연다. cherry-pick이나 전달 전용 별도 브랜치를 만들지 않는다.

```
본인 dev 브랜치 (ino/dev 또는 ms/dev)
  ↓ Pull Request
main
```

## 전달 전 확인

1. 본인 dev 브랜치에서 working tree가 깨끗한지 확인한다.
2. 로컬과 원격의 본인 dev 브랜치, `main` 상태를 fetch 후 비교한다.
3. 이번 PR에 포함할 커밋 범위를 사용자와 확정한다. Issue가 있으면 완료 조건과 대조한다.
4. 대상 커밋 각각의 TDD 근거와 최신 회귀 검증 결과를 확인한다.
5. 저장소에 필수 CI가 구성되어 있으면 대상 커밋에서 통과했는지 확인한다.

working tree가 깨끗하지 않거나 브랜치 상태가 불일치하면 전달을 중단한다. CI가 없거나 접근할 수 없으면 통과로 간주하지 않고 미검증 항목으로 보고한다.

## PR과 병합

- PR 생성과 병합은 사용자가 요청한 경우에만 수행한다.
- 대상은 본인 dev 브랜치 → `main`으로 연다.
- PR 본문에는 변경 목적, 포함 커밋 목록, 관련 Issue, 검증 결과와 알려진 위험을 적는다.
- Issue 종료가 승인된 경우에만 `Closes #번호`를 사용한다. 그 외에는 `Refs #번호`를 사용한다.
- 병합 방식은 merge commit을 기본으로 하며 squash, rebase merge와 force push는 사용하지 않는다.
- 필수 검증이 실패·취소·진행 중이면 병합하지 않는다.
- 본인 dev 브랜치에 아직 전달 대상이 아니거나 검증되지 않은 커밋이 섞여 있으면, PR을 열기 전에 사용자와 포함 범위를 확정한다.

## 병합 후 처리

- PR 병합 후 본인 dev 브랜치를 최신 `main`과 동기화(pull 또는 필요 시 merge)해 다음 작업의 기준으로 삼는다.
- 병합 방식이 merge commit이므로 본인 dev 브랜치와 `main`의 커밋 SHA는 그대로 유지된다.

## 단순 변경 전달

순수 문서, 주석, 비동작 메타데이터만 포함된 경우 자동 테스트는 요구하지 않는다. 대신 포함 diff, 형식과 링크를 확인하고 테스트 생략 이유를 PR과 완료 보고에 남긴다.

## 중단 조건

- 본인 dev 브랜치가 원격과 일치하지 않는다.
- PR 대상 범위에 미완료 또는 의도하지 않은 커밋이 있다.
- 필수 검증이 실패했거나 결과를 확인할 수 없다.
- 다른 개발자의 진행 중 변경을 함께 전달하게 된다.
- squash, rebase merge, force push 또는 history rewrite가 필요하다.
