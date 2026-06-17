import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  /** key가 바뀌면(예: 탭 전환) 바운더리가 재마운트되어 에러 상태가 초기화된다. */
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 한 게임 화면에서 렌더 중 예외가 나도 앱 전체가 언마운트(백스크린)되지 않도록
 * 트리를 감싸 폴백 UI와 회복 경로("다시 시도")를 제공한다.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // 개발 중 원인 파악용 로깅(민감정보 없음).
    console.error("게임 화면 렌더 중 오류:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <section className="game">
          <h2>문제가 발생했어요</h2>
          <p className="hint">
            이 화면을 그리는 중 오류가 발생했습니다. 다른 게임은 계속 이용할 수
            있습니다.
          </p>
          <p className="error">{this.state.error.message}</p>
          <button className="primary" onClick={this.handleReset}>
            다시 시도
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
