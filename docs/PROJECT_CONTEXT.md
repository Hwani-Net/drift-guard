# drift-guard — PROJECT_CONTEXT.md

> 최종 수정: 2026-03-12 09:57 KST | 세션: 조사→기획→MVP→배포→테스트→실전검증→마케팅런치→**Stitch동기화검증**

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
- [x] E2E 테스트 22개 (CLI subprocess spawn, 전부 PASS)
- [x] GitHub Actions CI (Node 18/20/22 매트릭스)
- [x] CONTRIBUTING.md 작성
- [x] npm audit 보안 스캔 (0 vulnerabilities)
- [x] Council 3차 리뷰 (4/5 GO 판정)
- [x] 실전 테스트 — BizPilot(467줄, Shadcn UI)에서 검증
- [x] Shadcn/Tailwind CSS 변수 감지 버그 수정 (107→150 토큰)
- [x] CLI 데모 제작 (demo.html + cli-demo.png → README 삽입)
- [x] Show HN 포스트 초안 (docs/show-hn-post.md)
- [x] **리얼 시나리오 E2E 테스트 15개 추가** (Shadcn oklch, HSL, multi-file, threshold)
- [x] **Tailwind config 파서 추가** (`<script>` 내 colors/borderRadius/fontFamily 감지)
- [x] **Stitch HTML Tailwind config E2E 테스트 6개 추가** (색상/radius/폰트/mass drift/루프)
- [x] **Stitch ↔ drift-guard 동기화 루프 실전 검증** (playground 프로젝트)
- [x] **시각 비교 검증** (Stitch 스크린샷 vs 최종 코딩 결과 100% 일치 확인)
- [ ] git push (최신 커밋 반영 — Tailwind config 파서 + 21개 E2E 추가)
- [ ] npm version patch → npm publish (0.1.1)
- [ ] Show HN 게시
- [ ] Reddit/Dev.to/X 마케팅

## 아키텍처
```
src/
├── cli/          ← 6개 커맨드 (init, check, rules, snapshot update, hook install, hook uninstall)
├── core/         ← 3개 엔진 (snapshot, drift, rules-generator)
├── parsers/      ← 2개 파서 (CSS, HTML+TailwindConfig) — Shadcn/Tailwind 색상 키워드 20+개 지원
├── types/        ← 타입 정의
└── index.ts      ← 라이브러리 API

tests/
├── parsers/      ← css-parser (14), html-parser (12)
├── core/         ← snapshot (8), drift (6), rules-generator (14)
└── e2e/          ← cli (22) + real-scenario (21) — subprocess spawn 방식
```

## 테스트 현황: 97/97 PASS
| 파일 | 테스트 수 | 내용 |
|------|:--------:|------|
| css-parser | 14 | CSS 파싱, 변수 추출, Shadcn/Tailwind 패턴 |
| html-parser | 12 | 인라인 스타일, `<style>` 블록, 선택자 |
| snapshot | 8 | 스냅샷 생성/저장/로드 |
| drift | 6 | 드리프트 감지, 임계값, 카테고리 |
| rules-generator | 14 | 5개 형식 AI 규칙 파일 생성 |
| cli (E2E) | 22 | CLI 전체 커맨드 워크플로우 |
| real-scenario (E2E) | 21 | Shadcn CSS + Stitch HTML 실전 시나리오 |

## 절대 규칙
- ❌ 유료 API 의존 절대 금지 (완전 로컬, 무료 오픈소스)
- ❌ headless browser 의존 금지 (정적 CSS 분석만)
- ✅ `npx @stayicon/drift-guard init`으로 즉시 사용 가능해야 함
- ✅ AI 에이전트 규칙 파일 생성이 핵심 차별점

## 삽질 기록
- 🐛 **CSS 변수 카테고리 미분류 (2026-03-12)**: `--primary`, `--danger`, `--accent` 등 Shadcn/Tailwind 시맨틱 색상 변수가 `other`로 분류되어 토큰에서 누락. `getCategory()`에 20+ 키워드 추가 + HSL bare 값 감지로 해결.
- 🐛 **Stitch HTML Tailwind config 미감지 (2026-03-12)**: Stitch는 색상/radius를 `<script id="tailwind-config">` 안의 JS 객체로 정의. CSS 파서로는 감지 불가. `extractTailwindConfig()` 함수 추가하여 `<script>` 태그 내 `tailwind.config` 파싱으로 해결.
- 🐛 **E2E 테스트 threshold 문제 (2026-03-12)**: 기본 threshold 10%에서 Shadcn 70+ 토큰 중 2-3개 변경은 ~3% drift → pass 판정. `--threshold 0`으로 엄격 감지 필요.
- 🐛 **DriftItem 중첩 구조 (2026-03-12)**: JSON 출력의 `items[i].property`가 undefined — `items[i].original.property`로 접근 필요.

## NLM
- **노트북**: `oss-strategy` (ID: 9a2d1cb5-9dc2-4eb3-9f84-1c8afc8c381d)
- **소스**: 15개 (OpenAI/Anthropic 프로그램, GitHub 성장 전략, Design Drift 문제 검증)

## Stitch 프로젝트
- **ID**: 12228941605090764853 (drift-guard-playground)
- **스크린**: DriftApp SaaS Landing Page (f64abb0921f542edbce973ee4aa74886)

## 핵심 성과
1. 147개 디자인 토큰 추출·잠금 (Stitch HTML + CSS 변수 + Tailwind config)
2. `.cursorrules` 자동 생성 — AI 에이전트에게 디자인 보호 규칙 주입
3. npm 배포 완료 (`@stayicon/drift-guard@0.1.0`)
4. 97개 테스트 전부 통과 (54 unit + 22 E2E + 21 real-scenario)
5. GitHub Actions CI 설정 완료 (Node 18/20/22)
6. Council 배포 준비도 검토 통과 (4/5 GO)
7. Stitch ↔ drift-guard 동기화 루프 실전 검증 완료
8. Stitch 원본 vs 최종 결과 시각 비교 100% 일치 확인
