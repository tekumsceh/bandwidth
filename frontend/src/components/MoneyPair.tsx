type Props = {
  allocated: number;
  paid: number;
  suffix?: string;
};

function MoneyPair({ allocated, paid, suffix = '' }: Props) {
  return <span>{`${allocated.toFixed(2)}/${paid.toFixed(2)}${suffix ? ` ${suffix}` : ''}`}</span>;
}

export default MoneyPair;

