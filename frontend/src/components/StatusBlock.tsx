type Props = {
  kind: 'loading' | 'error' | 'empty';
  message: string;
};

function StatusBlock({ kind, message }: Props) {
  if (kind === 'loading') return <div className="page-status">Loading…</div>;
  if (kind === 'error') return <div className="page-status error">{message}</div>;
  return <div className="page-status">{message}</div>;
}

export default StatusBlock;

