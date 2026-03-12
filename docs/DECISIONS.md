# drift-guard — Architecture Decision Records

## ADR-001: 프로젝트 아이디어 선정 — "Design Guard" (2026-03-11)

### 맥락
OpenAI + Anthropic 오픈소스 프로그램 동시 자격 획득을 위한 프로젝트 개발이 필요했다.
6개 아이디어 후보(awesome-mcp-skills, mcpx, ai-rules, stitch-to-code, agent-guard, nongjong-agent 리브랜딩) 중 대표님이 Idea D "stitch-to-code"에 관심을 보였으나, "나만의 문제인가?" 의문이 제기됨.

### 조사 결과
- Design Drift(AI가 기능 추가 시 디자인을 파괴하는 현상)는 2026년 업계 최대 이슈
- Design Systems Collective: "Design drift is becoming the biggest cost"
- Reddit r/FigmaDesign: "Design-to-Code handoff still incredibly broken in 2026"
- Stitch 공식 포럼: 30+버전 좌절 사례 다수
- 직접 경쟁자 **없음** (BackstopJS/Percy는 사후 QA, 다른 카테고리)

### 결정
"디자인→코드 변환기"가 아닌 "AI 코딩 중 디자인 드리프트 감지·차단 CLI"로 피벗.
프로젝트명: `drift-guard`

### 이유
1. 변환기는 v0/Bolt/Figma Make가 수십억 투자 중 → 경쟁 불가
2. "감지·차단"은 CLI 하나로 가능 → 혼자 3.5개월 내 개발+론칭 가능
3. 직접 경쟁자 없음 → 첫 번째 이점
4. AI 에이전트 규칙 파일 생성이 핵심 차별점 → 모든 AI 코딩 도구 생태계에 적용 가능

---

## ADR-002: 기술 스택 선정 (2026-03-11)

### 결정
- **언어**: TypeScript (strict mode)
- **CSS 파서**: css-tree (PostCSS 대신)
- **HTML 파서**: cheerio
- **빌드**: tsup
- **테스트**: Vitest
- **배포**: npm + GitHub

### 이유
- css-tree: PostCSS보다 가볍고, AST 워킹이 더 직관적
- cheerio: jsdom보다 10x 빠름, 서버사이드 HTML 파싱에 최적
- tsup: esbuild 기반, 빌드 17ms. rollup/webpack 불필요
- npm 배포: `npx drift-guard init` 즉시 사용 → 바이럴에 유리

---

## ADR-003: GitHub 계정 전략 (2026-03-11)

### 결정
기존 GitHub 계정 사용 (새 계정 생성 안 함)

### 이유
- OpenAI/Anthropic 프로그램: "활발한 메인테넌스 증거" 요구
- 새 계정 = 커밋 히스토리 0 = 심사에서 불리
- GitHub TOS: 한 사람 = 하나의 개인 계정 권장
- 기존 계정 프로필 정리 + 레포 정리가 더 효과적

## ADR-004: Stitch HTML의 Tailwind Config 파싱 추가 (2026-03-12)

### 맥락
Stitch는 디자인 토큰(색상, radius, 폰트)을 `<style>` CSS가 아닌 `<script id="tailwind-config">` 안의 JS 객체로 출력한다. drift-guard의 HTML 파서는 `<style>` 태그만 파싱하므로, **Stitch 디자인의 primary 색상(#256af4) 변경을 감지하지 못하는** 치명적 문제 발견.

### 결정
`extractTailwindConfig()` 함수를 `html-parser.ts`에 추가. `<script>` 태그에서 `tailwind.config` 또는 `id="tailwind-config"`를 찾아 regex로 colors, borderRadius, fontFamily를 파싱하여 `--tw-*` 접두사 디자인 토큰으로 변환.

### 이유
- Stitch가 Tailwind CDN + inline config를 사용하는 것은 Stitch의 표준 출력 방식
- CSS 파서 수정보다 별도 추출 함수가 관심사 분리에 유리
- `--tw-` 접두사로 CSS 변수 토큰과 네이밍 충돌 방지
- regex 기반으로 JS 파서 의존성 없이 경량 구현
