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
import { chooseRandomGomokuMove } from "../../application/gomokuAi";
import { chooseRandomGoMove } from "../../application/goAi";
import { chooseRandomReversiMove } from "../../application/reversiAi";
import { legalGoMoves } from "../../domain/goMoves";

/** 자동 대국을 지원하는 보드 게임 키(무작위 수 선택기가 이미 머지된 3종). */
export type SelfPlayGameKey = "gomoku" | "go" | "reversi";

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
 * 지원 게임 메타 목록. 장기는 chooseRandomJanggiMove가 머지되면 같은 패턴으로 추가한다
 * (이 화면은 장기에 의존하지 않는다).
 */
export const SELF_PLAY_GAMES: readonly SelfPlayGameMeta[] = [
  { key: "gomoku", label: "오목", size: 15, boardClass: "" },
  { key: "go", label: "바둑", size: 9, boardClass: "go" },
  { key: "reversi", label: "오델로", size: 8, boardClass: "reversi" },
];

/** 보드 한 칸의 상태(모든 지원 게임 공통: 흑/백 돌 또는 빈 칸). */
export type SelfPlayCell = "black" | "white" | null;

/**
 * 주어진 게임을 CPU vs CPU로 한 판 끝까지 자동 진행하고 결과를 반환한다.
 * - 엔진 어댑터(create*Engine) + 무작위 수 선택기(chooseRandom*Move)를 묶어
 *   application의 playEngineGame에 위임한다(엔진/도메인 로직은 재구현하지 않는다).
 * - 바둑은 둘 곳이 없으면 "pass"를 선택해 연속 패스 종료로 이어지게 한다.
 * - 오델로는 자동 패스를 오케스트레이터(applyReversiTurn)가 처리하므로 항상 합법 좌표만 고른다.
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
    default:
      throw new Error(`runSelfPlay: 지원하지 않는 게임입니다: ${String(game)}`);
  }
}

/** Side를 화면용 라벨로 매핑한다(모든 지원 게임이 흑(선)/백(후) 2진영). 색만으로 구분하지 않는다. */
function sideLabel(side: Side): string {
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
 * - 무승부와 일반 승리를 구분하고, 승자는 side별 라벨(흑(선)/백(후))로 표기한다.
 * - 아직 종료되지 않은 결과(이론상 비정상)는 "진행 중"으로 표기한다.
 */
export function describeSelfPlayResult(
  result: EngineGameResult<unknown>,
): SelfPlayOutcome {
  const { status, moveCount } = result;
  let outcome: string;
  if (!status.over) {
    outcome = "진행 중";
  } else if (status.draw || status.winner === null) {
    outcome = "무승부 🤝";
  } else {
    outcome = `${sideLabel(status.winner)} 승리 🎉`;
  }
  return { outcome, moves: `적용된 수 ${moveCount}수` };
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
