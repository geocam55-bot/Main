import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

export interface SchedulerValues {
  scheduleType: 'one-time' | 'daily' | 'weekly' | 'monthly';
  startDate: string;
  startTime: string;
  recurEvery: number;
  synchronizeTimeZones: boolean;
  delayEnabled: boolean;
  delayDuration: string;
  repeatEnabled: boolean;
  repeatInterval: string;
  repeatDuration: string;
  stopIfLongEnabled: boolean;
  stopIfLongDuration: string;
  expireEnabled: boolean;
  expireDate: string;
  expireTime: string;
  enabled: boolean;
}

interface SchedulerProps {
  value: SchedulerValues;
  onChange: (value: SchedulerValues) => void;
}

export const Scheduler: React.FC<SchedulerProps> = ({ value, onChange }) => {
  // Handlers for each field
  const handleChange = (field: keyof SchedulerValues, val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Schedule Task</CardTitle>
        <CardDescription>Configure when and how this task should run</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schedule Type */}
        <div className="flex gap-4 items-center">
          <Label>Begin the task:</Label>
          <select
            value={value.scheduleType}
            onChange={e => handleChange('scheduleType', e.target.value)}
            className="border rounded p-1"
          >
            <option value="one-time">One time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {/* Start Date/Time */}
        <div className="flex gap-2 items-center">
          <Label>Start:</Label>
          <Input
            type="date"
            value={value.startDate}
            onChange={e => handleChange('startDate', e.target.value)}
            className="w-32"
          />
          <Input
            type="time"
            value={value.startTime}
            onChange={e => handleChange('startTime', e.target.value)}
            className="w-24"
          />
          <Switch
            checked={value.synchronizeTimeZones}
            onCheckedChange={checked => handleChange('synchronizeTimeZones', checked)}
          />
          <span className="text-xs">Synchronize across time zones</span>
        </div>
        {/* Recur Every */}
        {value.scheduleType !== 'one-time' && (
          <div className="flex gap-2 items-center">
            <Label>Recur every:</Label>
            <Input
              type="number"
              min={1}
              value={value.recurEvery}
              onChange={e => handleChange('recurEvery', Number(e.target.value))}
              className="w-16"
            />
            <span className="text-xs">{value.scheduleType === 'daily' ? 'days' : value.scheduleType === 'weekly' ? 'weeks' : 'months'}</span>
          </div>
        )}
        {/* Advanced Settings */}
        <div className="border-t pt-4 mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.delayEnabled}
              onChange={e => handleChange('delayEnabled', e.target.checked)}
            />
            <span>Delay task for up to (random delay):</span>
            <Input
              type="text"
              value={value.delayDuration}
              onChange={e => handleChange('delayDuration', e.target.value)}
              className="w-24"
              disabled={!value.delayEnabled}
              placeholder="1 hour"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.repeatEnabled}
              onChange={e => handleChange('repeatEnabled', e.target.checked)}
            />
            <span>Repeat task every:</span>
            <Input
              type="text"
              value={value.repeatInterval}
              onChange={e => handleChange('repeatInterval', e.target.value)}
              className="w-16"
              disabled={!value.repeatEnabled}
              placeholder="1 hour"
            />
            <span>for a duration of:</span>
            <Input
              type="text"
              value={value.repeatDuration}
              onChange={e => handleChange('repeatDuration', e.target.value)}
              className="w-16"
              disabled={!value.repeatEnabled}
              placeholder="1 day"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.stopIfLongEnabled}
              onChange={e => handleChange('stopIfLongEnabled', e.target.checked)}
            />
            <span>Stop task if it runs longer than:</span>
            <Input
              type="text"
              value={value.stopIfLongDuration}
              onChange={e => handleChange('stopIfLongDuration', e.target.value)}
              className="w-24"
              disabled={!value.stopIfLongEnabled}
              placeholder="3 days"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.expireEnabled}
              onChange={e => handleChange('expireEnabled', e.target.checked)}
            />
            <span>Expire:</span>
            <Input
              type="date"
              value={value.expireDate}
              onChange={e => handleChange('expireDate', e.target.value)}
              className="w-32"
              disabled={!value.expireEnabled}
            />
            <Input
              type="time"
              value={value.expireTime}
              onChange={e => handleChange('expireTime', e.target.value)}
              className="w-24"
              disabled={!value.expireEnabled}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={value.enabled}
              onCheckedChange={checked => handleChange('enabled', checked)}
            />
            <span>Enabled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
