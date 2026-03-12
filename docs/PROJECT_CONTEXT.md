# drift-guard — PROJECT_CONTEXT.md

> 최종 수정: 2026-03-12 15:09 KST | 세션: 마케팅 기획 완료

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
- [x] npm 배포 (`@stayicon/drift-guard@0.2.2`) ✅
- [x] pre-commit hook 구현 (hook install/uninstall)
- [x] Vitest 단위 테스트 117→130개 (전부 PASS)
- [x] E2E 테스트 (CLI + real-scenario + sync-scenario)
- [x] GitHub Actions CI (Node 18/20/22 매트릭스)
- [x] **v0.2.0 P-1: DOM 구조 fingerprint** — structure-parser.ts, snapshot에 structure 필드, drift에 structureDrift 보고
- [x] **v0.2.0 P-2: 시각 효과 속성 추가** — backdrop-filter, filter, animation, transition
- [x] **v0.2.0 P-6A: MCP 서버 래퍼** — drift-guard-mcp/ 별도 패키지 (4개 MCP 도구), 빌드 성공
- [x] npm version minor → npm publish 0.2.0 (메인 패키지) ✅ 2026-03-12 12:15
- [ ] ~~cd drift-guard-mcp && npm publish (MCP 래퍼)~~ — CLI-first 전략으로 보류 (ADR-007)
- [x] git commit + push (tag v0.2.0 포함) ✅ 2026-03-12 12:16
- [x] Show HN 게시글 준비 완료 (docs/show-hn-post.md)
- [x] **v0.2.1: 구조 드리프트 → exit code 1** — 구조 변경 시 CI 차단 가능, structureSourceFile 추적 ✅
- [x] **v0.2.2: 스냅샷 나이 경고** — 7일 이상 된 스냅샷 사용 시 경고 출력 ✅
- [x] **뇽죵이 Agent 통합 가이드** — `.agent/references/drift-guard-integration.md` 작성 ✅
- [x] **stitch_design_audit MCP → drift-guard CLI 전환 가이드** 작성 ✅
- [ ] Show HN 게시 — ❌ stayicon karma 1 → Show HN 일시 제한 (카르마 쌓기 필요)
- [ ] Reddit r/webdev — ❌ Showoff Saturday 규칙 위반으로 삭제됨 → 3/15(토) 재게시 예정
- [ ] Dev.to 기술 블로그 게시 (docs/marketing/devto-article.md 작성 완료)
- [ ] X Twitter 런칭 스레드 (docs/marketing/x-twitter-thread.md 작성 완료)
- [x] **마케팅 콘텐츠 작성** — Show HN/Reddit/Dev.to/X 4개 채널 텍스트 완료 ✅
- [x] **홍보물 기획안** — 3-Tier 에셋 전략 (인터랙티브 웹 데모/CLI GIF/소셜 카드)
- [x] **홍보물 제작** — 인터랙티브 웹 데모 + CLI 데모 이미지 + 소셜 카드 4종 + README 업데이트 ✅ 2026-03-12
  - 🌐 데모: https://hwani-net.github.io/drift-guard/
  - 🃏 소셜 카드: docs/assets/social-card-{problem,solution,compare,proof}.png
  - 📝 README: 데모 링크 + Zero Dependencies 배지 + "Why CLI, Not MCP?" 섹션 추가
- [ ] ProductHunt/DevHunt 런칭 (계정 필요)
- [ ] awesome-ai-devtools PR

## 아키텍처
```
src/
├── cli/          ← 7개 커맨드 (init, check, rules, snapshot update, hook install/uninstall, sync)
├── core/         ← 4개 엔진 (snapshot, drift, rules-generator, sync)
├── parsers/      ← 3개 파서 (CSS, HTML+TailwindConfig, Structure) ← v0.2.0 NEW
├── types/        ← 타입 정의 (StructureFingerprint, StructureDriftReport 추가)
└── index.ts      ← 라이브러리 API (computeStructureFingerprint, compareStructure export)

drift-guard-mcp/  ← v0.2.0 NEW: MCP 서버 래퍼 (별도 npm 패키지)
├── src/index.ts  ← 4개 MCP 도구 (init, check, rules, sync)
├── package.json  ← @stayicon/drift-guard-mcp
└── README.md

tests/
├── parsers/      ← css-parser (14), html-parser (12), structure-parser (13) ← v0.2.0 NEW
├── core/         ← snapshot (8), drift (6), rules-generator (14), sync (14)
└── e2e/          ← cli (22) + real-scenario (21) + sync-scenario (6)
```

## 테스트 현황: 130/130 PASS
| 파일 | 테스트 수 | 내용 |
|------|:--------:|------|
| css-parser | 14 | CSS 파싱, 변수 추출, Shadcn/Tailwind 패턴 |
| html-parser | 12 | 인라인 스타일, `<style>` 블록, 선택자 |
| **structure-parser** | **13** | **시맨틱 태그, 깊이, 해시, flex/grid, 비교** ← v0.2.0 NEW |
| snapshot | 8 | 스냅샷 생성/저장/로드 |
| drift | 6 | 드리프트 감지, 임계값, 카테고리 |
| rules-generator | 14 | 5개 형식 AI 규칙 파일 생성 |
| sync | 14 | 프롬프트 생성, syncToStitch, syncFromStitch, CSS 패치 |
| cli (E2E) | 22 | CLI 전체 커맨드 워크플로우 |
| real-scenario (E2E) | 21 | Shadcn CSS + Stitch HTML 실전 시나리오 |
| sync-scenario (E2E) | 6 | sync CLI: to-stitch 프롬프트, to-code 패치, JSON |

## 절대 규칙
- ❌ 유료 API 의존 절대 금지 (완전 로컬, 무료 오픈소스)
- ❌ headless browser 의존 금지 (정적 CSS 분석만)
- ✅ `npx @stayicon/drift-guard init`으로 즉시 사용 가능해야 함
- ✅ AI 에이전트 규칙 파일 생성이 핵심 차별점

## 삽질 기록
- 🐛 **CSS 변수 카테고리 미분류 (2026-03-12)**: `--primary`, `--danger`, `--accent` 등 Shadcn/Tailwind 시맨틱 색상 변수가 `other`로 분류되어 토큰에서 누락. `getCategory()`에 20+ 키워드 추가 + HSL bare 값 감지로 해결.
- 🐛 **Stitch HTML Tailwind config 미감지 (2026-03-12)**: Stitch는 색상/radius를 `<script id="tailwind-config">` 안의 JS 객체로 정의. CSS 파서로는 감지 불가. `extractTailwindConfig()` 함수 추가하여 `<script>` 태그 내 `tailwind.config` 파싱으로 해결.
- 🐛 **MCP 래퍼 타입 호환 (2026-03-12)**: v0.2.0 structure 필드가 0.1.1 published 타입에 없어 빌드 실패. `as unknown as Record` 더블캐스트로 우회. v0.2.0 publish 후 해소 예정.

## NLM
- **노트북**: `oss-strategy` (ID: 9a2d1cb5-9dc2-4eb3-9f84-1c8afc8c381d)
- **소스**: 15개 (OpenAI/Anthropic 프로그램, GitHub 성장 전략, Design Drift 문제 검증)

## Stitch 프로젝트
- **ID**: 12228941605090764853 (drift-guard-playground)
- **스크린 1**: DriftApp SaaS Landing Page (f64abb0921f542edbce973ee4aa74886)
- **스크린 2**: DriftApp Signup Page (fe73a0f8c2fc44c5bdf8c9526b6843b5)

## 핵심 성과
1. 166개 디자인 토큰 추출·잠금 (Stitch HTML + CSS 변수 + Tailwind config)
2. `.cursorrules` 자동 생성 — AI 에이전트에게 디자인 보호 규칙 주입
3. npm 배포 완료 (`@stayicon/drift-guard@0.2.2`)
4. 130개 테스트 전부 통과
5. GitHub Actions CI 설정 완료 (Node 18/20/22)
6. **v0.2.0**: DOM 구조 fingerprint + MCP 서버 래퍼 구현 완료
7. Stitch ↔ drift-guard 양방향 Full HTML sync 검증 완료
8. **v0.2.1**: 구조 드리프트 → exit code 1 + structureSourceFile 추적
9. **v0.2.2**: 스냅샷 나이 경고 (7일 이상 시 ⚠️)
10. **뇽죵이 Agent**: stitch_design_audit MCP → drift-guard CLI 전환 가이드 작성
