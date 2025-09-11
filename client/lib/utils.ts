import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function getDeviceId(): string {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
