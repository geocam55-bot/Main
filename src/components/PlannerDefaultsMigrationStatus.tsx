import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Database, HardDrive, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { migrateUserDefaultsFromLocalStorage, getUserDefaults } from '../utils/project-wizard-defaults-client';
import { toast } from 'sonner@2.0.3';

interface PlannerDefaultsMigrationStatusProps {
  userId: string;
  organizationId: string;
}

export function PlannerDefaultsMigrationStatus({ userId, organizationId }: PlannerDefaultsMigrationStatusProps) {
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [hasLocalStorageData, setHasLocalStorageData] = useState(false);
  const [hasDatabaseData, setHasDatabaseData] = useState(false);
  const [localStorageItemCount, setLocalStorageItemCount] = useState(0);
  const [databaseItemCount, setDatabaseItemCount] = useState(0);

  useEffect(() => {
    checkMigrationStatus();
  }, [userId, organizationId]);

  const checkMigrationStatus = async () => {
    setLoading(true);
    try {
      // Check localStorage
      const key = `planner_defaults_${organizationId}_${userId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        try {
          const localDefaults = JSON.parse(stored);
          const count = Object.keys(localDefaults).length;
          setHasLocalStorageData(count > 0);
          setLocalStorageItemCount(count);
        } catch {
          setHasLocalStorageData(false);
          setLocalStorageItemCount(0);
        }
      } else {
        setHasLocalStorageData(false);
        setLocalStorageItemCount(0);
      }

      // Check database
      const dbDefaults = await getUserDefaults(userId, organizationId);
      const dbCount = Object.keys(dbDefaults).length;
      setHasDatabaseData(dbCount > 0);
      setDatabaseItemCount(dbCount);
    } catch (error) {
      // Error checking migration status
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const success = await migrateUserDefaultsFromLocalStorage(userId, organizationId);
      
      if (success) {
        toast.success('Migration completed successfully');
        await checkMigrationStatus();
      } else {
        toast.error('Migration failed - please try again');
      }
    } catch (error) {
      // Migration error
      toast.error('Migration failed - please try again');
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const needsMigration = hasLocalStorageData && !hasDatabaseData;
  const migrationComplete = !hasLocalStorageData && hasDatabaseData;
  const noData = !hasLocalStorageData && !hasDatabaseData;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Planner Defaults Migration Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* localStorage Status */}
          <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted">
            <HardDrive className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Browser Storage</span>
                <Badge variant={hasLocalStorageData ? 'default' : 'secondary'}>
                  {hasLocalStorageData ? 'Has Data' : 'Empty'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {localStorageItemCount} {localStorageItemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {/* Database Status */}
          <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted">
            <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Database</span>
                <Badge variant={hasDatabaseData ? 'default' : 'secondary'}>
                  {hasDatabaseData ? 'Has Data' : 'Empty'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {databaseItemCount} {databaseItemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {needsMigration && (
          <Alert className="border-orange-300 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <span className="font-medium">Migration Available:</span> You have {localStorageItemCount} planner defaults saved in your browser. 
              Click the button below to migrate them to the database for better reliability and cross-device access.
            </AlertDescription>
          </Alert>
        )}

        {migrationComplete && (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <span className="font-medium">Migration Complete:</span> Your planner defaults are now stored in the database 
              and will be available across all your devices.
            </AlertDescription>
          </Alert>
        )}

        {noData && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">No Data Found:</span> You haven't customized any planner defaults yet. 
              Visit any planner's Defaults tab to customize your material selections.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkMigrationStatus}
            disabled={loading || migrating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          
          {needsMigration && (
            <Button
              onClick={handleMigrate}
              disabled={migrating}
              className="ml-auto"
            >
              {migrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Migrate to Database
                </>
              )}
            </Button>
          )}
        </div>

        {/* Information */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">About this Migration</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Your customized planner defaults are being moved from browser storage to the database</li>
            <li>• Database storage is more reliable and accessible across devices</li>
            <li>• This migration is automatic but can be triggered manually here</li>
            <li>• Your organization's default settings are not affected by this migration</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}