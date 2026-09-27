interface Props {
  value: string;
  onChange: (timezone: string) => void;
}

const timezones = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function TimezoneSelector({
  value,
  onChange,
}: Props) {
  return (
    <div className="field">
      <label htmlFor="timezone">Timezone</label>

      <select
        id="timezone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {timezones.map((timezone) => (
          <option key={timezone} value={timezone}>
            {timezone}
          </option>
        ))}
      </select>
    </div>
  );
}