// Presentation helper for the 관전(자동 대국, self-play) 화면. 순수·결정적(난수 외) 함수만 둔다 —
// React 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다. 진행/종료 규칙은
// application(playEngineGame + 엔진 어댑터)·domain·application(chooseRandom*Move)을 재사용하며
// 여기서 재구현하지 않는다(레이어 규칙: presentation은 domain/application을 읽기만 함).
import type { RandomSource } from "../../application/dealCards";
import {
  playEngineGame,
  type EngineGameResult,
} from "../../application/playEngineGame";
import type { Side } from "../../application/gameEngine";
import { createGomokuEngine } from "../../application/gameEngine";
import { createGoEngine } from "../../application/goEngine";
import { createReversiEngine } from "../../application/reversiEngine";
import { createJanggiEngine } from "../../application/janggiEngine";
import { createConnectFourEngine } from "../../application/connectFourEngine";
import { createTicTacToeEngine } from "../../application/ticTacToeEngine";
import { chooseRandomGomokuMove } from "../../application/gomokuAi";
import { chooseRandomGoMove } from "../../application/goAi";
import { chooseRandomReversiMove } from "../../application/reversiAi";
import { chooseRandomJanggiMove } from "../../application/janggiAi";
import { chooseRandomConnectFourColumn } from "../../application/playConnectFour";
import { chooseRandomTicTacToeMove } from "../../application/playTicTacToe";
import type { JanggiState } from "../../application/playJanggi";
import { legalGoMoves } from "../../domain/goMoves";
import type { Board as JanggiBoard } from "../../domain/janggi";

/** 자동 대국을 지원하는 보드 게임 키(무작위 수 선택기가 이미 머지된 게임들). */
export type SelfPlayGameKey =
  | "gomoku"
  | "go"
  | "reversi"
  | "janggi"
  | "connectfour"
  | "tictactoe";

/**
 * 장기 무작위 자기대국 한 판의 수 상한. 무작위 장기는 외통/장 포획/빅장으로 보통 수백 수
 * 안에 끝나지만(관측상 최대 ~400수), 이론상 길어질 수 있어 합리적 상한을 둔다. 초과 시
 * playEngineGame이 throw 하며, 화면은 이를 "무종국(수 제한 도달)"으로 우아하게 처리한다.
 */
const JANGGI_MAX_MOVES = 1000;

export interface SelfPlayGameMeta {
  key: SelfPlayGameKey;
  /** 화면 표시용 한국어 게임 이름. */
  label: string;
  /** 보드 한 변(열 수). 최종 보드 요약 렌더에 사용. */
  size: number;
  /** 최종 보드 컨테이너에 더할 CSS 클래스(기존 .board.go/.board.reversi 재사용). */
  boardClass: string;
}

/**
 * 지원 게임 메타 목록. 무작위 수 선택기(chooseRandom*Move)가 머지된 게임만 노출한다.
 * 장기는 9×10이라 size(=열 수)는 9이며, 최종 보드는 흑/백 디스크가 아닌 장기 기물로 렌더한다.
 */
export const SELF_PLAY_GAMES: readonly SelfPlayGameMeta[] = [
  { key: "gomoku", label: "오목", size: 15, boardClass: "" },
  { key: "go", label: "바둑", size: 9, boardClass: "go" },
  { key: "reversi", label: "오델로", size: 8, boardClass: "reversi" },
  { key: "janggi", label: "장기", size: 9, boardClass: "janggi" },
  { key: "connectfour", label: "커넥트포", size: 7, boardClass: "connectfour" },
  { key: "tictactoe", label: "틱택토", size: 3, boardClass: "tictactoe" },
];

/** 보드 한 칸의 상태(모든 지원 게임 공통: 흑/백 돌 또는 빈 칸). */
export type SelfPlayCell = "black" | "white" | null;

/**
 * 주어진 게임을 CPU vs CPU로 한 판 끝까지 자동 진행하고 결과를 반환한다.
 * - 엔진 어댑터(create*Engine) + 무작위 수 선택기(chooseRandom*Move)를 묶어
 *   application의 playEngineGame에 위임한다(엔진/도메인 로직은 재구현하지 않는다).
 * - 바둑은 둘 곳이 없으면 "pass"를 선택해 연속 패스 종료로 이어지게 한다.
 * - 오델로는 자동 패스를 오케스트레이터(applyReversiTurn)가 처리하므로 항상 합법 좌표만 고른다.
 * - 장기는 chooseRandomJanggiMove(자기장군 수 제외)로 합법 수를 고르고, 무한 진행을 막기 위해
 *   JANGGI_MAX_MOVES 상한을 둔다(초과 시 playEngineGame이 throw → 화면에서 무종국 처리).
 * - 미지원 키는 throw 한다.
 * - 동일 rng(결정적)면 항상 동일 결과.
 */
export function runSelfPlay(
  game: SelfPlayGameKey,
  rng: RandomSource,
  maxMoves?: number,
): EngineGameResult<unknown> {
  switch (game) {
    case "gomoku":
      return playEngineGame(
        createGomokuEngine(),
        (state) => chooseRandomGomokuMove(state.board, rng),
        { config: { size: 15 }, maxMoves },
      );
    case "go":
      return playEngineGame(
        createGoEngine(),
        (state) => {
          const legal = legalGoMoves(state.board, state.next);
          // 둘 곳이 없거나, 무작위 자기대국이 확실히 종국(연속 2패스)하도록 매 턴
          // 1/(합법수+1) 확률로 패스한다. 그 외에는 application의 chooseRandomGoMove로
          // 합법 좌표를 고른다(따냄으로 칸이 재활용되는 무작위 대국의 무한 진행을 막는다).
          if (legal.length === 0 || rng.nextInt(legal.length + 1) === 0) {
            return "pass";
          }
          return chooseRandomGoMove(state.board, state.next, rng);
        },
        { config: { size: 9 }, maxMoves },
      );
    case "reversi":
      return playEngineGame(
        createReversiEngine(),
        (state) => chooseRandomReversiMove(state.board, state.next, rng),
        { maxMoves },
      );
    case "janggi":
      return playEngineGame(
        createJanggiEngine(),
        (state) => {
          const s = state as JanggiState;
          return chooseRandomJanggiMove(s.board, s.next, rng);
        },
        { maxMoves: maxMoves ?? JANGGI_MAX_MOVES },
      );
    case "connectfour":
      // 유한 게임(최대 42수) — 수 제한 불필요. 합법 열이 없으면 게임이 이미 종료라
      // 루프가 더 돌지 않는다(null은 -1로 넘겨 엔진 isLegal이 방어).
      return playEngineGame(
        createConnectFourEngine(),
        (state) => {
          const col = chooseRandomConnectFourColumn(state.board, rng);
          return { col: col ?? -1 };
        },
        { maxMoves },
      );
    case "tictactoe":
      // 유한 게임(최대 9수) — 수 제한 불필요.
      return playEngineGame(
        createTicTacToeEngine(),
        (state) => {
          const move = chooseRandomTicTacToeMove(state.board, rng);
          return move ?? { row: -1, col: -1 };
        },
        { maxMoves },
      );
    default:
      throw new Error(`runSelfPlay: 지원하지 않는 게임입니다: ${String(game)}`);
  }
}

/**
 * Side를 게임별 화면 라벨로 매핑한다. 색만으로 구분하지 않는다.
 * - 장기는 진영 이름이 초(선)/한(후)이고, 나머지(오목/바둑/오델로)는 흑(선)/백(후)이다.
 *   선(先) 진영은 항상 p1이다.
 */
function sideLabelFor(game: SelfPlayGameKey, side: Side): string {
  if (game === "janggi") {
    return side === "p1" ? "초(선)" : "한(후)";
  }
  if (game === "connectfour") {
    return side === "p1" ? "1P(●)" : "2P(○)";
  }
  if (game === "tictactoe") {
    return side === "p1" ? "X(선)" : "O(후)";
  }
  return side === "p1" ? "흑(선)" : "백(후)";
}

export interface SelfPlayOutcome {
  /** 승패/무승부 한 줄 문구. */
  outcome: string;
  /** 적용된 수 개수 문구. */
  moves: string;
}

/**
 * EngineGameResult(status/moveCount)를 화면 표시용 한국어 문구로 매핑한다(순수).
 * - 무승부와 일반 승리를 구분하고, 승자는 게임별 side 라벨(흑/백 또는 초/한)로 표기한다.
 * - 아직 종료되지 않은 결과(이론상 비정상)는 "진행 중"으로 표기한다.
 * - game 미지정 시 기존 흑/백 라벨을 쓴다(기존 호출 호환).
 */
export function describeSelfPlayResult(
  result: EngineGameResult<unknown>,
  game: SelfPlayGameKey = "gomoku",
): SelfPlayOutcome {
  const { status, moveCount } = result;
  let outcome: string;
  if (!status.over) {
    outcome = "진행 중";
  } else if (status.draw || status.winner === null) {
    outcome = "무승부 🤝";
  } else {
    outcome = `${sideLabelFor(game, status.winner)} 승리 🎉`;
  }
  return { outcome, moves: `적용된 수 ${moveCount}수` };
}

export interface SelfPlayRun {
  /** 종국 결과. 무종국(수 제한 도달 등 throw)이면 null. */
  result: EngineGameResult<unknown> | null;
  /** 화면 표시용 결과 문구(승자/무승부 또는 무종국 안내). */
  outcome: string;
  /** 적용된 수 문구(무종국이면 안내 문구). */
  moves: string;
  /** 끝까지 두지 못하고 중단됐는지(수 제한 도달 등). */
  unfinished: boolean;
}

/**
 * 한 판을 자동 진행해 화면에 바로 쓸 수 있는 형태로 매핑한다(throw 방어 포함).
 * - 정상 종국이면 describeSelfPlayResult로 승자/무승부 문구를 만든다.
 * - 무작위 장기 대국이 수 제한(maxMoves)에 도달하는 등으로 playEngineGame이 throw 하면,
 *   크래시 대신 "무종국 (수 제한 도달)" 류의 안내로 우아하게 처리한다(UX 원칙 4: 피드백).
 *   "다시 돌리기" 회복 경로는 호출자(컴포넌트)가 그대로 제공한다.
 */
export function runAndDescribeSelfPlay(
  game: SelfPlayGameKey,
  rng: RandomSource,
  maxMoves?: number,
): SelfPlayRun {
  try {
    const result = runSelfPlay(game, rng, maxMoves);
    const { outcome, moves } = describeSelfPlayResult(result, game);
    return { result, outcome, moves, unfinished: false };
  } catch {
    return {
      result: null,
      outcome: "무종국 (수 제한 도달)",
      moves: "수 제한에 도달해 끝까지 두지 못했습니다. 다시 돌려 보세요.",
      unfinished: true,
    };
  }
}

/**
 * 결과 최종 상태에서 보드(2차원 칸 배열)를 안전하게 추출한다(렌더 요약용).
 * 모든 지원 엔진의 상태는 흑/백 돌의 2차원 board를 노출한다.
 */
export function selfPlayBoard(
  result: EngineGameResult<unknown>,
): SelfPlayCell[][] {
  const board = (result.finalState as { board?: unknown }).board;
  return Array.isArray(board) ? (board as SelfPlayCell[][]) : [];
}

/**
 * 장기 결과의 최종 보드(기물 2차원 배열)를 안전하게 추출한다(렌더 요약용).
 * 흑/백 디스크 모델(SelfPlayCell)이 아니라 장기 기물 셀을 그대로 노출하므로,
 * 컴포넌트는 janggiView의 pieceGlyph/pieceAriaLabel 등으로 색 비의존 렌더한다.
 */
export function selfPlayJanggiBoard(
  result: EngineGameResult<unknown>,
): JanggiBoard {
  const board = (result.finalState as { board?: unknown }).board;
  return Array.isArray(board) ? (board as JanggiBoard) : [];
}

/** 최종 보드 한 칸의 색 비의존 렌더 정보(장기 제외 모든 게임 공통). */
export interface SelfPlayGlyphCell {
  /** 색 비의존 기호(예: ●/○, X/O). */
  glyph: string;
  /** 셀 안 span에 붙일 클래스(기존 stone/disc/ttt-mark 스타일 재사용). */
  className: string;
  /** 접근성/툴팁 라벨(스크린리더·호버). */
  label: string;
}

/** 보드(장기 제외)를 색 비의존 글리프 셀 2차원 배열로 변환한 결과. */
export type SelfPlayGlyphBoard = (SelfPlayGlyphCell | null)[][];

// 흑/백 돌(오목/바둑/오델로) — 채움(●) vs 테두리(○)로 색 비의존 구분.
const STONE_GLYPH: Record<"black" | "white", SelfPlayGlyphCell> = {
  black: { glyph: "●", className: "stone black", label: "흑" },
  white: { glyph: "○", className: "stone white", label: "백" },
};

// 커넥트포 디스크(1/2) — ConnectFour.tsx와 동일한 ●/○ + .disc.p1/p2 스타일 재사용.
const CONNECT_FOUR_GLYPH: Record<1 | 2, SelfPlayGlyphCell> = {
  1: { glyph: "●", className: "disc p1", label: "1P" },
  2: { glyph: "○", className: "disc p2", label: "2P" },
};

// 틱택토 마크(X/O) — TicTacToe.tsx와 동일한 .ttt-mark.mark-X/O 스타일 재사용.
const TICTACTOE_GLYPH: Record<"X" | "O", SelfPlayGlyphCell> = {
  X: { glyph: "X", className: "ttt-mark mark-X", label: "X" },
  O: { glyph: "O", className: "ttt-mark mark-O", label: "O" },
};

/**
 * 결과 최종 보드를 색 비의존 글리프 셀 2차원 배열로 변환한다(장기 제외 모든 게임 공통 렌더).
 * - 오목/바둑/오델로: 흑(●)/백(○) 돌(selfPlayBoard 재사용).
 * - 커넥트포: 1P(●)/2P(○) 디스크(보드 셀 값 1/2).
 * - 틱택토: X/O 마크.
 * 색만으로 진영을 구분하지 않도록 기호·라벨을 함께 제공한다(UX 원칙: 색 비의존).
 */
export function selfPlayGlyphBoard(
  result: EngineGameResult<unknown>,
  game: SelfPlayGameKey,
): SelfPlayGlyphBoard {
  const raw = (result.finalState as { board?: unknown }).board;
  if (!Array.isArray(raw)) {
    return [];
  }
  if (game === "connectfour") {
    return (raw as number[][]).map((row) =>
      row.map((c) => (c === 1 || c === 2 ? CONNECT_FOUR_GLYPH[c] : null)),
    );
  }
  if (game === "tictactoe") {
    return (raw as (string | null)[][]).map((row) =>
      row.map((c) => (c === "X" || c === "O" ? TICTACTOE_GLYPH[c] : null)),
    );
  }
  // 오목/바둑/오델로: 흑/백 돌 모델(selfPlayBoard 재사용).
  return selfPlayBoard(result).map((row) =>
    row.map((c) => (c === "black" || c === "white" ? STONE_GLYPH[c] : null)),
  );
}
