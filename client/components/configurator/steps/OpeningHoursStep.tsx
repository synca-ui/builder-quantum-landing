import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import type { OpeningHours } from "@/types/domain";

interface OpeningHoursStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

export function OpeningHoursStep({
  nextStep,
  prevStep,
}: OpeningHoursStepProps) {
  const { t } = useTranslation();
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const weekends = ["saturday", "sunday"];

  const openingHours = useConfiguratorStore((s) => s.content.openingHours);
  const openingHoursTextColor = useConfiguratorStore(
    (s) => s.design.fontColor || "#0F172A",
  );
  const actions = useConfiguratorActions();

  const [useWeekdaySchedule, setUseWeekdaySchedule] = useState(true);
  const [weekdayHours, setWeekdayHours] = useState({
    open: "09:00",
    close: "17:00",
    closed: false,
  });

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;

    if (!openingHours || Object.keys(openingHours).length === 0) {
      const defaultHours = {
        open: "09:00",
        close: "17:00",
        closed: false,
      };

      const defaultOpeningHours: any = {};
      weekdays.forEach((day) => {
        const key = day.toLowerCase();
        defaultOpeningHours[key] = { ...defaultHours };
      });
      weekends.forEach((day) => {
        const key = day.toLowerCase();
        defaultOpeningHours[key] = {
          open: "10:00",
          close: "16:00",
          closed: true,
        };
      });

      actions.content.updateOpeningHours(defaultOpeningHours as OpeningHours);
    }
  }, [openingHours, actions.content]);

  const applyWeekdaySchedule = () => {
    const newHours = { ...openingHours };
    weekdays.forEach((day) => {
      const key = day.toLowerCase();
      newHours[key as keyof OpeningHours] = { ...weekdayHours };
    });
    actions.content.updateOpeningHours(newHours as OpeningHours);
  };

  const updateDayHours = (day: string, updates: any) => {
    const key = day.toLowerCase();
    const newHours = {
      ...openingHours,
      [key]: { ...(openingHours as any)[key], ...updates },
    };
    actions.content.updateOpeningHours(newHours as OpeningHours);
  };

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t("steps.openingHours.title")}
        </h2>
        <p className="text-gray-600">{t("steps.openingHours.subtitle")}</p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Text color</h3>
          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={openingHoursTextColor}
              onChange={(e) =>
                actions.design.updateDesign({ fontColor: e.target.value })
              }
              className="w-12 h-10 rounded cursor-pointer border"
              aria-label="Opening hours text color"
            />
            <span className="text-sm text-gray-600">
              This controls the color of the Opening Hours text in the preview.
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {t("hours.mondayFriday")}
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="weekday-schedule"
                checked={useWeekdaySchedule}
                onChange={(e) => setUseWeekdaySchedule(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label
                htmlFor="weekday-schedule"
                className="text-sm text-gray-600"
              >
                {t("hours.sameForAllWeekdays")}
              </label>
            </div>
          </div>

          {useWeekdaySchedule ? (
            <div className="flex items-center space-x-4">
              <Button
                variant={weekdayHours.closed ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newHours = {
                    ...weekdayHours,
                    closed: !weekdayHours.closed,
                  };
                  setWeekdayHours(newHours);
                  applyWeekdaySchedule();
                }}
              >
                {weekdayHours.closed ? t("hours.closed") : t("hours.open")}
              </Button>

              {!weekdayHours.closed && (
                <>
                  <Input
                    type="time"
                    value={weekdayHours.open}
                    onChange={(e) => {
                      const newHours = {
                        ...weekdayHours,
                        open: e.target.value,
                      };
                      setWeekdayHours(newHours);
                      applyWeekdaySchedule();
                    }}
                    className="w-32"
                  />
                  <span className="text-gray-500">{t("hours.to")}</span>
                  <Input
                    type="time"
                    value={weekdayHours.close}
                    onChange={(e) => {
                      const newHours = {
                        ...weekdayHours,
                        close: e.target.value,
                      };
                      setWeekdayHours(newHours);
                      applyWeekdaySchedule();
                    }}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {weekdays.map((day) => {
                const key = day.toLowerCase() as keyof OpeningHours;
                const hours = (openingHours as any)[key] || {
                  open: "09:00",
                  close: "17:00",
                  closed: false,
                };
                return (
                  <div key={day} className="flex items-center justify-between">
                    <div className="w-24">
                      <span className="text-sm font-medium text-gray-700">
                        {t(`hours.${day}`).slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={hours.closed ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          updateDayHours(day, { closed: !hours.closed })
                        }
                      >
                        {hours.closed
                          ? t("hours.closed").slice(0, 2)
                          : t("hours.open").slice(0, 3)}
                      </Button>
                      {!hours.closed && (
                        <>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) =>
                              updateDayHours(day, { open: e.target.value })
                            }
                            className="w-24 text-sm"
                          />
                          <span className="text-gray-500 text-sm">-</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) =>
                              updateDayHours(day, { close: e.target.value })
                            }
                            className="w-24 text-sm"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {t("hours.weekendHolidays")}
          </h3>
          <div className="space-y-3">
            {weekends.map((day) => {
              const key = day.toLowerCase() as keyof OpeningHours;
              const hours = (openingHours as any)[key] || {
                open: "10:00",
                close: "18:00",
                closed: false,
              };
              return (
                <div key={day} className="flex items-center justify-between">
                  <div className="w-24">
                    <span className="text-sm font-medium text-gray-700">
                      {t(`hours.${day}`)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={hours.closed ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        updateDayHours(day, { closed: !hours.closed })
                      }
                    >
                      {hours.closed ? t("hours.closed") : t("hours.open")}
                    </Button>
                    {!hours.closed && (
                      <>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) =>
                            updateDayHours(day, { open: e.target.value })
                          }
                          className="w-24 text-sm"
                        />
                        <span className="text-gray-500 text-sm">-</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) =>
                            updateDayHours(day, { close: e.target.value })
                          }
                          className="w-24 text-sm"
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>{t("common.tip")}:</strong> {t("hours.holidayTip")}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-between mt-8">
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            prevStep();
          }}
          variant="outline"
          size="lg"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          {t("common.back")}
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          {t("common.next")}
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
