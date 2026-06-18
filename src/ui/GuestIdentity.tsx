import { useState, useSyncExternalStore, type FormEvent } from "react";
import { getIdentity, renameGuest, subscribeIdentity } from "./identity";

/**
 * 앱 헤더의 게스트 정체성 위젯.
 * - 현재 게스트 표시 이름을 보여준다("게스트: 용감한 너구리 37").
 * - "이름 변경"으로 입력 후 renameGuest로 검증·교체·영속화한다.
 * - 검증 실패 사유를 색이 아니라 텍스트(role="alert")로 노출한다(throw로 앱이 죽지 않게 처리).
 */
export function GuestIdentity() {
  // 외부 정체성 상태 변경(이름 변경)에 맞춰 다시 렌더한다. SSR 스냅샷도 동일 게터를 쓴다.
  const identity = useSyncExternalStore(
    subscribeIdentity,
    getIdentity,
    getIdentity,
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function startEdit(): void {
    setDraft(identity.displayName);
    setError(null);
    setEditing(true);
  }

  function cancel(): void {
    setEditing(false);
    setError(null);
  }

  function submit(e: FormEvent): void {
    e.preventDefault();
    const result = renameGuest(draft);
    if (result.ok) {
      setEditing(false);
      setError(null);
    } else {
      setError(result.reason);
    }
  }

  if (editing) {
    return (
      <form className="guest-identity guest-rename" onSubmit={submit}>
        <label className="guest-rename-label" htmlFor="guest-name-input">
          게스트 이름
        </label>
        <input
          id="guest-name-input"
          className="guest-rename-input"
          type="text"
          value={draft}
          maxLength={40}
          aria-invalid={error !== null}
          aria-describedby={error ? "guest-name-error" : undefined}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="guest-rename-save">
          저장
        </button>
        <button type="button" className="guest-rename-cancel" onClick={cancel}>
          취소
        </button>
        {error !== null && (
          <p id="guest-name-error" className="guest-rename-error" role="alert">
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="guest-identity">
      <span className="guest-display">
        <span className="guest-label">게스트:</span>{" "}
        <span className="guest-name">{identity.displayName}</span>
      </span>
      <button type="button" className="guest-edit-btn" onClick={startEdit}>
        이름 변경
      </button>
    </div>
  );
}
