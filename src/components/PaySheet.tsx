import { Icon, PayPicker } from './Icons';
import { ModalDialog } from './ModalDialog';

export function PaySheet({
  value,
  onChange,
  onClose,
  count,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  onClose: () => void;
  count: number;
}) {
  return (
    <ModalDialog
      labelledBy="paysheet-title"
      onClose={onClose}
      autoFocusSelector="button"
    >
      <div className="dialog-head">
        <h2 id="paysheet-title">Sales that accept</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
      </div>
      <div className="dialog-body">
        <span className="label sr-only" id="paysheet-label">
          Payment methods
        </span>
        <PayPicker value={value} onChange={onChange} labelId="paysheet-label" />
        <div className="hint">
          {value.length > 1
            ? 'Showing sales that take all of these.'
            : 'Pick a way to pay to filter.'}
        </div>
      </div>
      <div className="dialog-foot">
        {value.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {`Show ${count}${count === 1 ? ' sale' : ' sales'}`}
        </button>
      </div>
    </ModalDialog>
  );
}
