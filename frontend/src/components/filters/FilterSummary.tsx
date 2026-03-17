type Props = {
  items: Array<{ label: string; value: string }>;
};

function FilterSummary({ items }: Props) {
  return (
    <span title="Current filter state">
      {items.map((item) => `${item.label}: ${item.value}`).join(' · ')}
    </span>
  );
}

export default FilterSummary;

