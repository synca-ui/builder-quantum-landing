import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HeadbarProps {
  title: string; // the current page label e.g. "Selection" or "Automatic"
  breadcrumbs?: string[];
}

export default function Headbar({ title, breadcrumbs = [] }: HeadbarProps) {
  const navigate = useNavigate();

  return (
    <nav className="w-full bg-transparent mb-6" aria-label="Breadcrumb">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="px-2">
              Back
            </Button>

            <div className="relative group">
              <h1 className="text-2xl font-black text-gradient cursor-pointer transition-all duration-500 group-hover:scale-105">
                Maitr
              </h1>
              <div className="absolute -inset-2 bg-gradient-to-r from-teal-400/20 to-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 blur-lg"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-bounce group-hover:animate-pulse"></div>
            </div>

            <div className="text-sm text-muted-foreground">/</div>

            <div className="flex flex-col">
              <h2 className="text-lg font-semibold">{title}</h2>
              {breadcrumbs.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {breadcrumbs.map((b, i) => (
                    <span key={b}>
                      {b}
                      {i < breadcrumbs.length - 1 && (
                        <span className="mx-2">/</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
