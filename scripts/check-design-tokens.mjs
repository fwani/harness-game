#!/usr/bin/env node
// 디자인 토큰 회귀 가드.
// 이미 토큰화된 공통 색이 src/ui/styles.css 본문에서 생짜 hex로 되돌아오면 실패한다.
// (docs/agent-harness/UX_GUIDELINES.md "디자인 토큰 & 시각 일관성" 참조.)
//
// :root 블록 안의 토큰 "정의"는 리터럴 hex가 정상이므로 검사에서 제외한다.
// 새 공통 색을 토큰화하면 FORBIDDEN에 그 hex를 추가해 회귀를 막는다.

import { readFileSync } from "node:fs";

const FILE = "src/ui/styles.css";

// 토큰화 완료된 공통 색 → 본문에서 다시 생짜로 쓰면 안 됨.
const FORBIDDEN = {
  "#334155": "var(--border)",
  "#0f172a": "var(--bg)",
  "#1e293b": "var(--panel)",
  "#e2e8f0": "var(--text)",
  "#94a3b8": "var(--muted)",
  "#38bdf8": "var(--accent)",
};

const css = readFileSync(FILE, "utf8");

// :root { ... } 블록(토큰 정의부)을 통째로 제거하고 본문만 검사.
const body = css.replace(/:root\s*\{[\s\S]*?\}/, "");

const lines = body.split("\n");
const violations = [];
lines.forEach((line, i) => {
  for (const [hex, token] of Object.entries(FORBIDDEN)) {
    if (line.toLowerCase().includes(hex)) {
      violations.push({ line: i + 1, hex, token, text: line.trim() });
    }
  }
});

if (violations.length > 0) {
  console.error(`✗ 디자인 토큰 가드 실패 — ${FILE}에서 토큰 대신 생짜 hex 사용:\n`);
  for (const v of violations) {
    console.error(`  L${v.line}: ${v.hex} → ${v.token} 로 바꾸세요`);
    console.error(`         ${v.text}`);
  }
  console.error(
    `\n공통 색은 var(--*) 토큰을 쓴다. (docs/agent-harness/UX_GUIDELINES.md)`,
  );
  process.exit(1);
}

console.log("✓ 디자인 토큰 가드 통과 — 토큰화된 공통 색이 모두 var(--*)로 유지됨.");
