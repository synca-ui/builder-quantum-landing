import { ArrowLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";

interface ReservationsStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

// FIX: Konstante außerhalb definieren, damit die Referenz stabil bleibt (verhindert Loop)
const DEFAULT_SLOTS = ["12:00", "13:00", "18:00", "19:00"];

export function ReservationsStep({
                                   nextStep,
                                   prevStep,
                                 }: ReservationsStepProps) {
  // Store Selectors (einzeln selektiert für Performance)
  const reservationsEnabled = useConfiguratorStore(
    (s) => s.features.reservationsEnabled,
  );
  const maxGuests = useConfiguratorStore((s) => s.features.maxGuests);
  const notificationMethod = useConfiguratorStore(
    (s) => s.features.notificationMethod,
  );

  // Design Werte selektieren
  const primaryColor = useConfiguratorStore((s) => s.design.primaryColor);
  const designBgColor = useConfiguratorStore((s) => s.design.backgroundColor);

  const reservationButtonColor = primaryColor || "#2563EB";
  const reservationButtonTextColor = designBgColor || "#FFFFFF";

  const actions = useConfiguratorActions();

  // Generierte Time Slots für die Auswahl
  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = 10 + i;
    return `${hour}:00`;
  });

  // FIX: Sichere Selektion der TimeSlots ohne neues Array-Objekt
  const rawSlots = useConfiguratorStore((s) => (s.features as any).timeSlots);
  const selectedTimeSlots = Array.isArray(rawSlots) ? rawSlots : DEFAULT_SLOTS;

  // FIX: Sichere Selektion der Button Shape
  const reservationButtonShape = useConfiguratorStore(
    (s) => (s.features as any).reservationButtonShape || "rounded"
  );

  const updateTimeSlots = (slots: string[]) => {
    actions.features.updateFeatureFlags({ timeSlots: slots } as any);
  };

  const updateButtonStyle = (key: string, value: any) => {
    actions.features.updateFeatureFlags({ [key]: value } as any);
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Setup reservations
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Enable table bookings for your business. Perfect for restaurants and
          cafés.
        </p>
      </div>

      <div className="space-y-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Enable Reservations
              </h3>
              <p className="text-gray-600">
                Allow customers to book tables online
              </p>
            </div>
            <Button
              variant={reservationsEnabled ? "default" : "outline"}
              onClick={() =>
                actions.features.toggleReservations(!reservationsEnabled)
              }
              className={
                reservationsEnabled ? "bg-teal-500 hover:bg-teal-600" : ""
              }
            >
              {reservationsEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </Card>

        {reservationsEnabled && (
          <>
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Booking Settings
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Maximum party size
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={maxGuests}
                    onChange={(e) =>
                      actions.features.updateFeatureFlags({
                        maxGuests: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notification method
                  </label>
                  <select
                    value={notificationMethod}
                    onChange={(e) =>
                      actions.features.updateFeatureFlags({
                        notificationMethod: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="both">Email & Phone</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Reservation Button Style
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Button Color
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={reservationButtonColor}
                      onChange={(e) =>
                        actions.design.updatePrimaryColor(e.target.value)
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={reservationButtonColor}
                      onChange={(e) =>
                        actions.design.updatePrimaryColor(e.target.value)
                      }
                      className="font-mono flex-1"
                      placeholder="#2563EB"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={reservationButtonTextColor}
                      onChange={(e) =>
                        actions.design.updateDesign({
                          backgroundColor: e.target.value,
                        })
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={reservationButtonTextColor}
                      onChange={(e) =>
                        actions.design.updateDesign({
                          backgroundColor: e.target.value,
                        })
                      }
                      className="font-mono flex-1"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Button Shape
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "rounded", name: "Rounded", class: "rounded-lg" },
                      { id: "pill", name: "Pill", class: "rounded-full" },
                      { id: "square", name: "Square", class: "rounded-none" },
                    ].map((shape) => (
                      <Button
                        key={shape.id}
                        variant={
                          reservationButtonShape === shape.id
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          updateButtonStyle("reservationButtonShape", shape.id)
                        }
                        className={`${shape.class} ${reservationButtonShape === shape.id ? "bg-teal-500 hover:bg-teal-600" : ""}`}
                      >
                        {shape.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Preview
                </label>
                <button
                  className={`px-6 py-3 font-medium transition-colors ${
                    reservationButtonShape === "rounded"
                      ? "rounded-lg"
                      : reservationButtonShape === "pill"
                        ? "rounded-full"
                        : "rounded-none"
                  }`}
                  style={{
                    backgroundColor: reservationButtonColor,
                    color: reservationButtonTextColor,
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2 inline" />
                  Reserve Table
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Available Time Slots
              </h3>
              <p className="text-gray-600 mb-4">
                Set the times when customers can make reservations
              </p>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {timeSlots.map((time) => {
                  const isSelected = selectedTimeSlots.includes(time);

                  return (
                    <Button
                      key={time}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newSlots = isSelected
                          ? selectedTimeSlots.filter((slot: string) => slot !== time)
                          : [...selectedTimeSlots, time];
                        updateTimeSlots(newSlots);
                      }}
                      className={
                        isSelected ? "bg-teal-500 hover:bg-teal-600" : ""
                      }
                    >
                      {time}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button type="button" onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}