type Props = {
  dateLabel: string;
  city: string | null;
  country?: string | null;
  venueName: string | null;
};

function DateVenueRow({ dateLabel, city, country, venueName }: Props) {
  return (
    <span>
      {dateLabel} • {city || '—'}
      {country ? `, ${country}` : ''} • {venueName || 'TBA'}
    </span>
  );
}

export default DateVenueRow;

