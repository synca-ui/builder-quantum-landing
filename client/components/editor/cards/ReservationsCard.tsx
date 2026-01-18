import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

export interface ReservationSettings {
  enabled: boolean;
  minPartySize?: number;
  maxPartySize?: number;
  timeSlotDuration?: number;
  advanceBookingDays?: number;
  depositRequired?: boolean;
  depositPercentage?: number;
}

interface ReservationsCardProps {
  settings?: ReservationSettings;
  onChange?: (settings: ReservationSettings) => void;
}

export function ReservationsCard({
  settings = {
    enabled: false,
  },
  onChange,
}: ReservationsCardProps) {
  const [reservations, setReservations] = useState<ReservationSettings>(
    settings || {
      enabled: false,
      minPartySize: 1,
      maxPartySize: 50,
      timeSlotDuration: 60,
      advanceBookingDays: 30,
      depositRequired: false,
      depositPercentage: 0,
    },
  );

  const handleChange = (updates: Partial<ReservationSettings>) => {
    const updated = { ...reservations, ...updates };
    setReservations(updated);
    onChange?.(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={reservations.enabled}
          onChange={(e) => handleChange({ enabled: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <label className="text-sm font-medium text-gray-700">
          Enable Table Reservations
        </label>
      </div>

      {reservations.enabled && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Min Party Size
              </label>
              <input
                type="number"
                value={reservations.minPartySize || 1}
                onChange={(e) =>
                  handleChange({ minPartySize: parseInt(e.target.value) || 1 })
                }
                min="1"
                max="100"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Max Party Size
              </label>
              <input
                type="number"
                value={reservations.maxPartySize || 50}
                onChange={(e) =>
                  handleChange({ maxPartySize: parseInt(e.target.value) || 50 })
                }
                min="1"
                max="500"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Time Slot Duration (minutes)
              </label>
              <select
                value={reservations.timeSlotDuration || 60}
                onChange={(e) =>
                  handleChange({
                    timeSlotDuration: parseInt(e.target.value) || 60,
                  })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Advance Booking (days)
              </label>
              <input
                type="number"
                value={reservations.advanceBookingDays || 30}
                onChange={(e) =>
                  handleChange({
                    advanceBookingDays: parseInt(e.target.value) || 30,
                  })
                }
                min="1"
                max="365"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reservations.depositRequired}
                onChange={(e) =>
                  handleChange({ depositRequired: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Require Deposit for Reservations
              </span>
            </label>
          </div>

          {reservations.depositRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Deposit Percentage (%)
              </label>
              <input
                type="number"
                value={reservations.depositPercentage || 0}
                onChange={(e) =>
                  handleChange({
                    depositPercentage: parseInt(e.target.value) || 0,
                  })
                }
                min="0"
                max="100"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReservationsCard;
