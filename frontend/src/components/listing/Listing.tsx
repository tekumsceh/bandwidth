import type { Key, ReactNode } from 'react';
import StatusBlock from '../StatusBlock';

type Props<T> = {
  items: T[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  className?: string;
  getKey: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
};

function Listing<T>({
  items,
  loading,
  error,
  emptyMessage,
  className,
  getKey,
  renderItem,
}: Props<T>) {
  if (loading) return <StatusBlock kind="loading" message="Loading…" />;
  if (error) return <StatusBlock kind="error" message={error} />;
  if (items.length === 0) return <StatusBlock kind="empty" message={emptyMessage} />;

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div key={getKey(item, index)}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}

export default Listing;

