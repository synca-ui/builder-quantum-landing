import { TemplatePreviewContent } from "./TemplatePreviewContent";
import { Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LivePreview() {
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile");

  return (
    <div className="sticky top-24 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
        <div className="flex space-x-2">
          <Button
            variant={mode === "mobile" ? "default" : "outline"}
            size="sm"
            className="p-2"
            onClick={() => setMode("mobile")}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
          <Button
            variant={mode === "desktop" ? "default" : "outline"}
            size="sm"
            className="p-2"
            onClick={() => setMode("desktop")}
          >
            <Monitor className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-2xl p-4 border border-gray-200">
        {mode === "mobile" ? (
          // iPhone Frame Simulation
          <div className="relative w-[300px] h-[600px] bg-black rounded-[3rem] p-3 shadow-xl ring-4 ring-gray-200">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-black rounded-b-xl z-20"></div>
            <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative z-10">
              <TemplatePreviewContent />
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-gray-100 h-6 w-full border-b flex items-center px-2 space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
            </div>
            <div className="h-full overflow-y-auto">
              <TemplatePreviewContent />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
