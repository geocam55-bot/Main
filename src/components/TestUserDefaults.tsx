import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, TestTube, CheckCircle2, XCircle } from 'lucide-react';
import {
  getUserDefaults,
  saveUserDefaults,
  deleteUserDefaults,
  migrateUserDefaultsFromLocalStorage,
} from '../utils/project-wizard-defaults-client';

interface TestUserDefaultsProps {
  userId: string;
  organizationId: string;
}

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

export function TestUserDefaults({ userId, organizationId }: TestUserDefaultsProps) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setTesting(true);
    const testResults: TestResult[] = [];

    try {
      // Test 1: Get defaults (should be empty initially)
      const emptyDefaults = await getUserDefaults(userId, organizationId);
      testResults.push({
        test: 'Get Empty Defaults',
        success: Object.keys(emptyDefaults).length === 0,
        message: `Expected empty object, got ${Object.keys(emptyDefaults).length} items`,
        data: emptyDefaults,
      });

      // Test 2: Save defaults
      const testData = {
        'deck-spruce-Joists': 'test-item-id-1',
        'deck-treated-Posts': 'test-item-id-2',
        'garage-default-Foundation': 'test-item-id-3',
      };
      const saveSuccess = await saveUserDefaults(userId, organizationId, testData);
      testResults.push({
        test: 'Save Defaults',
        success: saveSuccess,
        message: saveSuccess ? 'Successfully saved 3 test items' : 'Failed to save',
        data: testData,
      });

      // Test 3: Get defaults (should have data now)
      const savedDefaults = await getUserDefaults(userId, organizationId);
      const itemsMatch = Object.keys(savedDefaults).length === 3 &&
        savedDefaults['deck-spruce-Joists'] === 'test-item-id-1' &&
        savedDefaults['deck-treated-Posts'] === 'test-item-id-2' &&
        savedDefaults['garage-default-Foundation'] === 'test-item-id-3';
      testResults.push({
        test: 'Get Saved Defaults',
        success: itemsMatch,
        message: itemsMatch
          ? 'Successfully retrieved all 3 items with correct values'
          : `Expected 3 items with specific values, got ${Object.keys(savedDefaults).length} items`,
        data: savedDefaults,
      });

      // Test 4: Update defaults
      const updatedData = {
        ...testData,
        'shed-default-Framing': 'test-item-id-4',
      };
      const updateSuccess = await saveUserDefaults(userId, organizationId, updatedData);
      testResults.push({
        test: 'Update Defaults',
        success: updateSuccess,
        message: updateSuccess ? 'Successfully updated to 4 items' : 'Failed to update',
        data: updatedData,
      });

      // Test 5: Verify update
      const updatedDefaults = await getUserDefaults(userId, organizationId);
      const updateVerified = Object.keys(updatedDefaults).length === 4 &&
        updatedDefaults['shed-default-Framing'] === 'test-item-id-4';
      testResults.push({
        test: 'Verify Update',
        success: updateVerified,
        message: updateVerified
          ? 'Update verified - 4 items including new shed item'
          : `Expected 4 items with shed item, got ${Object.keys(updatedDefaults).length} items`,
        data: updatedDefaults,
      });

      // Test 6: Delete defaults
      const deleteSuccess = await deleteUserDefaults(userId, organizationId);
      testResults.push({
        test: 'Delete Defaults',
        success: deleteSuccess,
        message: deleteSuccess ? 'Successfully deleted all defaults' : 'Failed to delete',
      });

      // Test 7: Verify deletion
      const deletedDefaults = await getUserDefaults(userId, organizationId);
      const deletionVerified = Object.keys(deletedDefaults).length === 0;
      testResults.push({
        test: 'Verify Deletion',
        success: deletionVerified,
        message: deletionVerified
          ? 'Deletion verified - defaults are empty'
          : `Expected empty object, got ${Object.keys(deletedDefaults).length} items`,
        data: deletedDefaults,
      });

      // Test 8: Test localStorage migration
      // Create test data in localStorage
      const localStorageKey = `planner_defaults_${organizationId}_${userId}`;
      const migrationTestData = {
        'roof-default-Roofing': 'migration-test-item-1',
        'kitchen-default-Cabinets': 'migration-test-item-2',
      };
      localStorage.setItem(localStorageKey, JSON.stringify(migrationTestData));
      
      // Run migration
      const migrationSuccess = await migrateUserDefaultsFromLocalStorage(userId, organizationId);
      
      // Verify migration
      const migratedDefaults = await getUserDefaults(userId, organizationId);
      const migrationVerified = migrationSuccess &&
        Object.keys(migratedDefaults).length === 2 &&
        migratedDefaults['roof-default-Roofing'] === 'migration-test-item-1';
      
      testResults.push({
        test: 'localStorage Migration',
        success: migrationVerified,
        message: migrationVerified
          ? 'Migration successful - 2 items migrated and localStorage cleaned'
          : `Migration failed or data mismatch`,
        data: migratedDefaults,
      });

      // Clean up after migration test
      await deleteUserDefaults(userId, organizationId);

    } catch (error: any) {
      testResults.push({
        test: 'Test Suite',
        success: false,
        message: `Test suite failed with error: ${error.message}`,
      });
    }

    setResults(testResults);
    setTesting(false);
  };

  const allPassed = results.length > 0 && results.every(r => r.success);
  const someFailed = results.length > 0 && results.some(r => !r.success);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          User Defaults API Test Suite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={runTests}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
          
          {results.length > 0 && (
            <div className="ml-auto">
              {allPassed && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">All Tests Passed</span>
                </div>
              )}
              {someFailed && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Some Tests Failed</span>
                </div>
              )}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm mb-3">Test Results:</h4>
            {results.map((result, index) => (
              <Alert
                key={index}
                className={result.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}
              >
                <div className="flex items-start gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      Test {index + 1}: {result.test}
                    </div>
                    <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
                      {result.message}
                    </AlertDescription>
                    {result.data && (
                      <pre className="text-xs mt-2 p-2 bg-background/50 rounded overflow-auto max-h-32">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Note:</strong> This test suite will create, update, and delete test data in your user defaults. 
            All test data is cleaned up automatically after the tests complete.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
