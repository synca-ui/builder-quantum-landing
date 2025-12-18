import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HeadbarProps {
  title: string; // the current page label e.g. "Selection" or "Automatic"
  showBack?: boolean;
}

export default function Headbar({ title, showBack = false }: HeadbarProps) {
  const navigate = useNavigate();

  return (
    <nav
      className="w-full bg-white/70 backdrop-blur-sm mb-6 shadow-md z-40"
      aria-label="Breadcrumb"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            {showBack && (
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="px-2"
              >
                Back
              </Button>
            )}

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 focus:outline-none"
              aria-label="Go to homepage"
            >
              <div className="relative group">
                <h1 className="text-2xl font-black text-gradient cursor-pointer transition-all duration-500 group-hover:scale-105">
                  Maitr
                </h1>
                <div className="absolute -inset-2 bg-gradient-to-r from-teal-400/15 to-purple-400/15 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-bounce group-hover:animate-pulse"></div>
              </div>

              <div className="text-sm text-muted-foreground">/</div>

              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>
            </button>
          </div>
        </div>
        {/* Divider line to separate headbar from content */}
        <div className="border-b-2 border-white/60 mt-4" />
      </div>
    </nav>
  );
}
