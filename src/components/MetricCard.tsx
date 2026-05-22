import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  className, 
  description,
  trend 
}: MetricCardProps) {
  return (
    <Card className={`shadow-sm hover:shadow-md transition-all duration-200 border-0 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${className?.includes('text-white') ? 'text-white/90' : 'text-muted-foreground'}`}>
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full ${className?.includes('text-white') ? 'bg-background/20 text-white' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${className?.includes('text-white') ? 'text-white' : ''}`}>{value}</div>
        {description && (
          <p className={`text-xs mt-1 ${className?.includes('text-white') ? 'text-white/80' : 'text-muted-foreground'}`}>
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            <span className={trend.value >= 0 ? 'text-green-500' : 'text-red-500'}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
