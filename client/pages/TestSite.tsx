import { useState, useEffect } from "react";
import { configurationApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TestSite() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testSiteLookup = async (subdomain: string) => {
    setLoading(true);
    const startTime = Date.now();

    try {
      console.log(`Testing subdomain: ${subdomain}`);
      const result = await configurationApi.getPublishedSite(subdomain);
      const endTime = Date.now();

      setTestResults((prev) => [
        ...prev,
        {
          subdomain,
          success: result.success,
          data: result.data,
          error: result.error,
          duration: endTime - startTime,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (error) {
      const endTime = Date.now();
      setTestResults((prev) => [
        ...prev,
        {
          subdomain,
          success: false,
          error: String(error),
          duration: endTime - startTime,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }

    setLoading(false);
  };

  const testCases = [
    "erer-xt3wpr", // From actual published config
    "erer", // Just business name
    "nonexistent", // Should fail
  ];

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Site Lookup Debug Tool</h1>

        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Site Lookups</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {testCases.map((subdomain) => (
                <Button
                  key={subdomain}
                  onClick={() => testSiteLookup(subdomain)}
                  disabled={loading}
                  variant={
                    subdomain === "nonexistent" ? "destructive" : "default"
                  }
                >
                  Test: {subdomain}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => setTestResults([])}
              variant="outline"
              className="w-full"
            >
              Clear Results
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          {testResults.length === 0 ? (
            <p className="text-gray-500">No tests run yet</p>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded border ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">
                      {result.success ? "✅" : "❌"} {result.subdomain}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {result.timestamp} ({result.duration}ms)
                    </span>
                  </div>

                  {result.success ? (
                    <div className="text-sm">
                      <p>
                        <strong>Business:</strong>{" "}
                        {result.data?.businessName || "N/A"}
                      </p>
                      <p>
                        <strong>Template:</strong>{" "}
                        {result.data?.template || "N/A"}
                      </p>
                      <p>
                        <strong>Status:</strong> {result.data?.status || "N/A"}
                      </p>
                      <p>
                        <strong>Published URL:</strong>{" "}
                        {result.data?.publishedUrl || "N/A"}
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-red-700">
                      <p>
                        <strong>Error:</strong> {result.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 mt-8 bg-blue-50">
          <h3 className="font-semibold mb-2">Current Environment Info</h3>
          <div className="text-sm space-y-1">
            <p>
              <strong>Hostname:</strong> {window.location.hostname}
            </p>
            <p>
              <strong>Full URL:</strong> {window.location.href}
            </p>
            <p>
              <strong>Path:</strong> {window.location.pathname}
            </p>
            <p>
              <strong>User Agent:</strong>{" "}
              {navigator.userAgent.split(" ").slice(0, 3).join(" ")}...
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
