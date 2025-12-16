import React from 'react';

interface OpeningHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

interface OpeningHoursCardProps {
  hours: OpeningHours | undefined;
  onChange: (hours: OpeningHours) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function OpeningHoursCard({ hours = {}, onChange }: OpeningHoursCardProps) {
  const getHours = (day: string) => hours[day] || { open: '09:00', close: '18:00', closed: false };

  const updateDay = (day: string, open: string, close: string, closed: boolean) => {
    onChange({
      ...hours,
      [day]: { open, close, closed }
    });
  };

  return (
    <div className="space-y-4">
      {DAYS.map(day => {
        const dayHours = getHours(day);
        return (
          <div key={day} className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-gray-700 capitalize">{day}</label>
            
            <div className="flex items-center gap-2 flex-1">
              <input
                type="time"
                value={dayHours.open}
                onChange={(e) => updateDay(day, e.target.value, dayHours.close, dayHours.closed || false)}
                disabled={dayHours.closed}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
              />
              <span className="text-gray-500">–</span>
              <input
                type="time"
                value={dayHours.close}
                onChange={(e) => updateDay(day, dayHours.open, e.target.value, dayHours.closed || false)}
                disabled={dayHours.closed}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dayHours.closed || false}
                onChange={(e) => updateDay(day, dayHours.open, dayHours.close, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Closed</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}

export default OpeningHoursCard;
