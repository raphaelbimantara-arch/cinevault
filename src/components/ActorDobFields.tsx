import React from 'react';
import { getActorDobParts, normalizeActorDob } from '../utils/actorDob';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ActorDobFieldsProps {
  value: string;
  onChange: (value: string) => void;
  actorName: string;
  compact?: boolean;
}

export const ActorDobFields: React.FC<ActorDobFieldsProps> = ({
  value,
  onChange,
  actorName,
  compact = false,
}) => {
  const parts = getActorDobParts(value);
  const currentYear = new Date().getFullYear();
  const update = (field: 'year' | 'month' | 'day', nextValue: string) => {
    const nextParts = { ...parts, [field]: nextValue };
    const serialize = () => (
      nextParts.year || nextParts.month || nextParts.day
        ? `${nextParts.year}-${nextParts.month}-${nextParts.day}`
        : ''
    );
    let nextDob = normalizeActorDob(serialize());
    if (nextDob === null && field !== 'day' && nextParts.day) {
      nextParts.day = '';
      nextDob = normalizeActorDob(serialize());
    }
    if (nextDob !== null) onChange(nextDob);
  };

  const selectClass = `min-w-0 rounded border border-zinc-700 bg-zinc-950 text-zinc-100 focus:border-amber-400 focus:outline-none ${
    compact ? 'w-full px-0 py-1 text-[7px] sm:px-1 sm:text-xs' : 'w-full px-2 py-2 text-sm'
  }`;

  return (
    <div className="grid min-w-0 grid-cols-3 gap-1" onClick={(event) => event.stopPropagation()}>
      <select
        aria-label={`Birth year for ${actorName}`}
        title="Year"
        className={selectClass}
        value={parts.year}
        onChange={(event) => update('year', event.target.value)}
      >
        <option value="">Year</option>
        {Array.from({ length: Math.max(currentYear - 1799, 1) }, (_, index) => currentYear - index).map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
      <select
        aria-label={`Birth month for ${actorName}`}
        title="Month"
        className={selectClass}
        value={parts.month}
        onChange={(event) => update('month', event.target.value)}
      >
        <option value="">Month</option>
        {MONTHS.map((month, index) => (
          <option key={month} value={index + 1}>{compact ? month.slice(0, 3) : month}</option>
        ))}
      </select>
      <select
        aria-label={`Birth day for ${actorName}`}
        title="Day"
        className={selectClass}
        value={parts.day}
        onChange={(event) => update('day', event.target.value)}
      >
        <option value="">Day</option>
        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
          <option key={day} value={day}>{day}</option>
        ))}
      </select>
    </div>
  );
};
