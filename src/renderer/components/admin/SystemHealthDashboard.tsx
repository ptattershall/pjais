'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SystemHealthReport, ServiceHealth, ServiceStatus } from '@shared/types/system';

// Assuming you have a way to call IPC functions, e.g., a preloaded API
// const ipcApi = window.electronIpc;

const getStatusColor = (status: ServiceStatus) => {
  switch (status) {
    case 'ok':
      return 'text-green-500';
    case 'initializing':
      return 'text-blue-500';
    case 'degraded':
      return 'text-yellow-500';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

const SystemHealthDashboard: React.FC = () => {
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await window.electronAPI.system.getHealth();
      setHealthReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error('Failed to fetch system health:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (isLoading && !healthReport) {
    return <div>Loading system health...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading system health: {error}</div>;
  }

  if (!healthReport) {
    return <div>No system health data available.</div>;
  }

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">System Health</h2>
        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-gray-500"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="mb-4">
        <strong>Overall Status:</strong>
        <span className={`ml-2 font-semibold ${getStatusColor(healthReport.overallStatus)}`}>
          {healthReport.overallStatus.toUpperCase()}
        </span>
      </div>
      
      <div className="space-y-2">
        {healthReport.services.map((service: ServiceHealth) => (
          <div key={service.service} className="p-3 bg-gray-700 rounded-md">
            <div className="flex justify-between">
              <span className="font-semibold">{service.service}</span>
              <span className={`font-bold ${getStatusColor(service.status)}`}>
                {service.status.toUpperCase()}
              </span>
            </div>
            {service.details && (
              <div className="text-sm text-gray-400 mt-2">
                {Object.entries(service.details).map(([key, value]) => (
                  <div key={key}>
                    <span>{key}: </span>
                    <span>{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 mt-4">
        Last updated: {new Date(healthReport.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default SystemHealthDashboard; 