import React from "react";
import { Calendar } from "lucide-react";

interface ReservationButtonProps {
  color?: string;
  textColor?: string;
  shape?: "rounded" | "pill" | "square";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function ReservationButton({
  color = "#2563EB",
  textColor = "#FFFFFF",
  shape = "rounded",
  size = "md",
  className = "",
  onClick,
  children = "Reserve Table",
}: ReservationButtonProps) {
  const shapeClasses = {
    rounded: "rounded-lg",
    pill: "rounded-full",
    square: "rounded-none",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${shapeClasses[shape]} ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color, color: textColor }}
      onClick={onClick}
    >
      <Calendar className="w-4 h-4 mr-2 inline" />
      {children}
    </button>
  );
}

export default ReservationButton;
