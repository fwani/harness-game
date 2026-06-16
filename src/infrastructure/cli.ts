// Infrastructure layer: CLI composition root.
// 가장 바깥 레이어로서 application/domain 을 조립해 실제로 게임을 실행한다.
// 부수효과(입출력·난수)는 여기서만 발생한다.
import { createInterface, type Interface } from "node:readline/promises";
import { stdin, stdout, argv, exit } from "node:process";

import { playRpsRound } from "../application/playRps";
import { playRound } from "../application/playOddEven";
import { shuffle, deal } from "../application/dealCards";
import { startGame, applyMove, type GomokuState } from "../application/playGomoku";
import { createDeck, type Card } from "../domain/card";
import type { Hand } from "../domain/rps";
import type { Parity } from "../domain/oddEven";
import type { Board, Stone } from "../domain/gomoku";
import { RandomNumberSource } from "./randomNumberSource";
import { MathRandomSource } from "./mathRandomSource";
import { RandomHandSource } from "./randomHandSource";

const HANDS: readonly Hand[] = ["rock", "paper", "scissors"];

// --- rendering helpers -------------------------------------------------------

function fmtCard(c: Card): string {
  return `${c.rank} of ${c.suit}`;
}

function renderBoard(board: Board): string {
  const glyph = (cell: Stone | null): string =>
    cell === null ? "." : cell === "black" ? "●" : "○";
  const header = "   " + board.map((_, x) => String(x).padStart(2)).join("");
  const rows = board.map(
    (row, y) => String(y).padStart(2) + " " + row.map((c) => glyph(c).padStart(2)).join(""),
  );
  return [header, ...rows].join("\n");
}

// --- games (one-shot / non-interactive where it makes sense) -----------------

function runRps(hand: Hand): void {
  const result = playRpsRound({ choose: () => hand }, new RandomHandSource());
  console.log(`you: ${result.a}  vs  cpu: ${result.b}  ->  ${result.result}`);
}

function runOddEven(guess: Parity): void {
  const result = playRound(guess, new RandomNumberSource());
  console.log(
    `guess: ${result.guess}  drawn: ${result.drawn}  ->  ${result.won ? "WIN" : "LOSE"}`,
  );
}

function runDeal(players: number, perPlayer: number): void {
  const deck = shuffle(createDeck(), new MathRandomSource());
  const { hands, rest } = deal(deck, players, perPlayer);
  hands.forEach((hand, i) => {
    console.log(`player ${i + 1}: ${hand.map(fmtCard).join(", ")}`);
  });
  console.log(`rest: ${rest.length} cards`);
}

/** 양쪽이 무작위 합법수를 두는 자가대국 데모. winner 또는 보드가 가득 차면 종료. */
function runGomokuDemo(size: number): void {
  const rng = new MathRandomSource();
  let state: GomokuState = startGame(size);
  let moves = 0;
  const total = size * size;
  while (state.winner === null && moves < total) {
    const empties: Array<[number, number]> = [];
    state.board.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === null) empties.push([x, y]);
      }),
    );
    if (empties.length === 0) break;
    const [x, y] = empties[rng.nextInt(empties.length)]!;
    state = applyMove(state, x, y);
    moves++;
  }
  console.log(renderBoard(state.board));
  console.log(state.winner ? `winner: ${state.winner} (after ${moves} moves)` : "draw");
}

// --- interactive ------------------------------------------------------------

async function ask<T extends string>(
  rl: Interface,
  prompt: string,
  valid: readonly T[],
): Promise<T> {
  for (;;) {
    const answer = (await rl.question(prompt)).trim().toLowerCase();
    if ((valid as readonly string[]).includes(answer)) return answer as T;
    console.log(`  -> ${valid.join(" / ")} 중 하나를 입력하세요.`);
  }
}

async function interactiveGomoku(rl: Interface): Promise<void> {
  let state = startGame(9);
  console.log('빈 칸에 "x,y" (0-8) 형식으로 좌표를 입력하세요. q 로 중단.');
  while (state.winner === null) {
    console.log("\n" + renderBoard(state.board));
    const raw = (await rl.question(`${state.next} 차례 > `)).trim().toLowerCase();
    if (raw === "q") return;
    const m = raw.match(/^(\d+)\s*,\s*(\d+)$/);
    if (!m) {
      console.log('  -> "x,y" 형식으로 입력하세요.');
      continue;
    }
    try {
      state = applyMove(state, Number(m[1]), Number(m[2]));
    } catch (err) {
      console.log(`  -> ${(err as Error).message}`);
    }
  }
  console.log("\n" + renderBoard(state.board));
  console.log(`winner: ${state.winner}`);
}

async function interactiveMenu(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    for (;;) {
      console.log("\n=== harness-game ===");
      console.log("1) 가위바위보   2) 홀짝   3) 카드 딜   4) 오목(2인)   q) 종료");
      const choice = await ask(rl, "선택 > ", ["1", "2", "3", "4", "q"]);
      if (choice === "q") return;
      if (choice === "1") {
        const hand = await ask(rl, "rock/paper/scissors > ", HANDS);
        runRps(hand);
      } else if (choice === "2") {
        const guess = await ask(rl, "odd/even > ", ["odd", "even"] as const);
        runOddEven(guess);
      } else if (choice === "3") {
        runDeal(4, 5);
      } else if (choice === "4") {
        await interactiveGomoku(rl);
      }
    }
  } finally {
    rl.close();
  }
}

// --- entry ------------------------------------------------------------------

function usage(): void {
  console.log(
    [
      "usage: <game> [args]  (인자 없이 실행하면 대화형 메뉴)",
      "  rps <rock|paper|scissors>     가위바위보 한 판 (vs 랜덤)",
      "  oddeven <odd|even>            홀짝 한 판",
      "  deal [players=4] [perPlayer=5]  카드 셔플 후 분배",
      "  gomoku [size=9]               오목 무작위 자가대국 데모",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const [cmd, ...rest] = argv.slice(2);
  if (!cmd) {
    await interactiveMenu();
    return;
  }
  switch (cmd) {
    case "rps": {
      const hand = rest[0];
      if (!HANDS.includes(hand as Hand)) return usage();
      return runRps(hand as Hand);
    }
    case "oddeven": {
      const guess = rest[0];
      if (guess !== "odd" && guess !== "even") return usage();
      return runOddEven(guess);
    }
    case "deal":
      return runDeal(Number(rest[0] ?? 4), Number(rest[1] ?? 5));
    case "gomoku":
      return runGomokuDemo(Number(rest[0] ?? 9));
    default:
      return usage();
  }
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
