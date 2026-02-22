/**
 * Test component to verify persistence functionality
 * This can be used for debugging and testing the step persistence system
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { stepPersistence } from "@/lib/stepPersistence";

export function PersistenceTest() {
  const [testData, setTestData] = useState({
    businessName: "",
    step: 0,
  });

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testSaveStep = () => {
    stepPersistence.saveStep(
      testData.step,
      "test",
      "field_update",
      { action: "test_save" },
      { businessName: testData.businessName, step: testData.step },
    );
    addLog(
      `Saved step ${testData.step} with business name: ${testData.businessName}`,
    );
  };

  const testLoadState = () => {
    const state = stepPersistence.getState();
    addLog(
      `Loaded state: ${state.steps.length} steps, current: ${state.currentStep}`,
    );
    console.log("Full state:", state);
  };

  const testClear = () => {
    stepPersistence.clearAll();
    addLog("Cleared all data");
    setLogs([]);
  };

  const testSummary = () => {
    const summary = stepPersistence.getSummary();
    addLog(`Summary: ${summary}`);
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Persistence System Test</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Business Name
            </label>
            <Input
              value={testData.businessName}
              onChange={(e) =>
                setTestData((prev) => ({
                  ...prev,
                  businessName: e.target.value,
                }))
              }
              placeholder="Enter business name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Step Number
            </label>
            <Input
              type="number"
              value={testData.step}
              onChange={(e) =>
                setTestData((prev) => ({
                  ...prev,
                  step: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="Step number"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={testSaveStep} size="sm">
            Save Step
          </Button>
          <Button onClick={testLoadState} size="sm" variant="outline">
            Load State
          </Button>
          <Button onClick={testSummary} size="sm" variant="outline">
            Get Summary
          </Button>
          <Button onClick={testClear} size="sm" variant="destructive">
            Clear All
          </Button>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Test Logs:</h3>
          <div className="bg-gray-100 p-3 rounded max-h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-semibold text-blue-900 mb-1">
            Test Instructions:
          </h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Enter a business name and step number</li>
            <li>Click "Save Step" to test persistence</li>
            <li>
              Refresh the page and click "Load State" to verify restoration
            </li>
            <li>
              Check browser localStorage for "configurator_persistence" key
            </li>
            <li>Use "Get Summary" to see the fallback message functionality</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}

export default PersistenceTest;
