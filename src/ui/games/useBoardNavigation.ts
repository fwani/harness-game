import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { nextBoardFocus } from "./boardView";

const cellKey = (x: number, y: number) => `${x},${y}`;

/**
 * 격자 보드(오목/바둑/오델로/장기)의 로빙 탭인덱스 + 화살표 키 내비게이션을 관리한다.
 *
 * 접근성 목표: 보드 전체가 Tab 한 번으로 **한 칸만** 진입하고(나머지 칸은 `tabIndex={-1}`),
 * 화살표/Home/End/PageUp/PageDown으로 셀 포커스를 옮긴다. 이동 계산은 순수 함수
 * `nextBoardFocus`에 위임한다.
 *
 * 주의: 셀 버튼은 `disabled` 대신 `aria-disabled`를 써야 한다. 네이티브 `disabled`
 * 버튼은 `.focus()`를 받지 못해 비활성 칸을 건너 이동할 수 없기 때문이다(클릭/착수
 * 차단은 각 화면의 핸들러 가드가 담당한다).
 *
 * @param cols 열 수, @param rows 행 수
 */
export function useBoardNavigation(cols: number, rows: number) {
  // 로빙 탭인덱스 대상(포커스를 받을 단 한 칸). 초기값은 좌상단.
  const [focusCell, setFocusCell] = useState({ x: 0, y: 0 });
  const refs = useRef(new Map<string, HTMLButtonElement>());

  /** 각 셀 버튼의 ref를 등록한다(언마운트 시 정리). */
  const setCellRef = useCallback(
    (x: number, y: number) => (el: HTMLButtonElement | null) => {
      const k = cellKey(x, y);
      if (el) {
        refs.current.set(k, el);
      } else {
        refs.current.delete(k);
      }
    },
    [],
  );

  /** 격자 컨테이너 onKeyDown: 방향 키를 다음 포커스 칸으로 변환하고 그 DOM 버튼에 포커스. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const target = nextBoardFocus(focusCell, e.key, { cols, rows });
      if (target === null) {
        return;
      }
      // 화살표/Page 키의 기본 스크롤을 막는다.
      e.preventDefault();
      setFocusCell(target);
      refs.current.get(cellKey(target.x, target.y))?.focus();
    },
    [focusCell, cols, rows],
  );

  /** 로빙 탭인덱스: 포커스 대상 칸만 0, 나머지는 -1. */
  const tabIndexFor = useCallback(
    (x: number, y: number) => (focusCell.x === x && focusCell.y === y ? 0 : -1),
    [focusCell],
  );

  /** 마우스 클릭 등으로 활성 칸이 바뀌면 로빙 대상도 그 칸으로 맞춘다. */
  const focusOn = useCallback((x: number, y: number) => {
    setFocusCell({ x, y });
  }, []);

  return { setCellRef, onKeyDown, tabIndexFor, focusOn };
}
