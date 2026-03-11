# drift-guard — PROJECT_CONTEXT.md

> 최종 수정: 2026-03-11 | 세션: 조사→기획→MVP→배포→테스트

## 프로젝트 개요
- **이름**: drift-guard (npm: `@stayicon/drift-guard`)
- **한줄 정의**: AI 코딩 에이전트의 Design Drift를 감지·차단하는 오픈소스 Node.js CLI
- **위치**: `E:\AI_Programing\drift-guard`
- **기술 스택**: Node.js + TypeScript (strict), css-tree, cheerio, commander.js, tsup, Vitest
- **라이선스**: MIT
- **GitHub**: https://github.com/Hwani-Net/drift-guard
- **npm**: https://www.npmjs.com/package/@stayicon/drift-guard

## 목표
- GitHub ★1,000+ 달성 (3.5개월 내)
- OpenAI "Codex for Open Source" 프로그램 신청
- Anthropic "Claude for Open Source" 프로그램 예외 어필 신청

## 현재 상태
- [x] 시장 조사 완료 (Design Drift가 2026 업계 최대 이슈 확인)
- [x] PRD 작성 완료 (design_guard_prd.md)
- [x] MVP 코어 개발 완료 (TypeScript 타입체크 + 빌드 통과)
- [x] CLI 커맨드 동작 확인 (init, check, rules, snapshot update, hook install/uninstall)
- [x] Git 초기 커밋 완료
- [x] GitHub 레포 생성 + 푸시 (Hwani-Net/drift-guard)
- [x] npm 배포 (`@stayicon/drift-guard@0.1.0`)
- [x] pre-commit hook 구현 (hook install/uninstall)
- [x] Vitest 단위 테스트 54개 (5파일, 전부 PASS)
- [x] GitHub Actions CI (Node 18/20/22 매트릭스)
- [x] CONTRIBUTING.md 작성
- [ ] README GIF 데모 녹화
- [ ] HN "Show HN" 포스트 작성
- [ ] Reddit/Dev.to/X 마케팅

## 아키텍처
```
src/
├── cli/          ← 6개 커맨드 (init, check, rules, snapshot update, hook install, hook uninstall)
├── core/         ← 3개 엔진 (snapshot, drift, rules-generator)
├── parsers/      ← 2개 파서 (CSS, HTML)
├── types/        ← 타입 정의
└── index.ts      ← 라이브러리 API

tests/
├── parsers/      ← css-parser (13), html-parser (12)
└── core/         ← snapshot (8), drift (6), rules-generator (15)
```

## 절대 규칙
- ❌ 유료 API 의존 절대 금지 (완전 로컬, 무료 오픈소스)
- ❌ headless browser 의존 금지 (정적 CSS 분석만)
- ✅ `npx @stayicon/drift-guard init`으로 즉시 사용 가능해야 함
- ✅ AI 에이전트 규칙 파일 생성이 핵심 차별점

## NLM
- **노트북**: `oss-strategy` (ID: 9a2d1cb5-9dc2-4eb3-9f84-1c8afc8c381d)
- **소스**: 15개 (OpenAI/Anthropic 프로그램, GitHub 성장 전략, Design Drift 문제 검증)

## 핵심 성과
1. 45개 디자인 토큰 추출·잠금 테스트 성공
2. `.cursorrules` 자동 생성 — AI 에이전트에게 디자인 보호 규칙 주입
3. Drift Score 0% 확인 (변경 없을 때)
4. npm 배포 완료 (`@stayicon/drift-guard@0.1.0`)
5. 54개 단위 테스트 전부 통과 (CSS 파서/HTML 파서/스냅샷/드리프트/규칙 생성기)
6. GitHub Actions CI 설정 완료 (Node 18/20/22)
