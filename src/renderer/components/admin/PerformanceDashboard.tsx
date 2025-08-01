import React, { useEffect, useState } from 'react';

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await window.electronAPI.performance.getMetrics();
      setMetrics(data);
    };

    const intervalId = setInterval(fetchMetrics, 2000); // Refresh every 2 seconds

    fetchMetrics(); // Initial fetch

    return () => clearInterval(intervalId);
  }, []);

  const formatMetricName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-md">
      <h2 className="mb-4 text-xl font-bold text-white">Performance Metrics</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="p-4 bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-300">{formatMetricName(key)}</h3>
            <p className="text-2xl font-bold text-green-400">
              {key.includes('time') ? `${value.toFixed(2)} ms` : value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}; 