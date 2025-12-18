import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HeadbarProps {
  title: string;
  breadcrumbs?: string[];
}

export default function Headbar({ title, breadcrumbs = [] }: HeadbarProps) {
  const navigate = useNavigate();

  return (
    <nav className="w-full bg-transparent mb-6" aria-label="Breadcrumb">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold">{title}</h1>
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
