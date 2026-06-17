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
import { chooseRandomGomokuMove } from "../../application/gomokuAi";
import { chooseRandomGoMove } from "../../application/goAi";
import { chooseRandomReversiMove } from "../../application/reversiAi";
import { chooseRandomJanggiMove } from "../../application/janggiAi";
import type { JanggiState } from "../../application/playJanggi";
import { legalGoMoves } from "../../domain/goMoves";
import type { Board as JanggiBoard } from "../../domain/janggi";

/** 자동 대국을 지원하는 보드 게임 키(무작위 수 선택기가 이미 머지된 게임들). */
export type SelfPlayGameKey = "gomoku" | "go" | "reversi" | "janggi";

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
