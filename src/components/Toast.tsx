import type { ToastState } from '../types/sale';

export function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {toast && (
        <div className="toast" role="status">
          <span>{toast.msg}</span>
          {toast.undo && (
            <button type="button" onClick={toast.undo}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
