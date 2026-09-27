import type { SelectedSlot } from "../types/booking";

interface Props {
  slots: SelectedSlot[];
  selectedTime: string;
  onSelect: (time: string) => void;
  loading: boolean;
}

export default function SlotGrid({
  slots,
  selectedTime,
  onSelect,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="slot-grid" aria-busy="true" aria-live="polite">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="slot-skeleton" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="empty-state">
        <strong>No mentors are available for this date</strong>
        <span>Please choose another date or check back later.</span>
      </div>
    );
  }

  return (
    <div className="slot-grid">
      {slots.map((slot) => (
        <button
          key={slot.time}
          type="button"
          className={`slot ${
            selectedTime === slot.time ? "selected" : ""
          }`}
          onClick={() => onSelect(slot.time)}
          disabled={!slot.available}
          aria-pressed={selectedTime === slot.time}
        >
          <span>{slot.time}</span>
          <small>
            {slot.availableMentors} mentor
            {slot.availableMentors !== 1 ? "s" : ""}
          </small>
        </button>
      ))}
    </div>
  );
}
