import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Speed as CpuIcon,
  Timeline as EventLoopIcon,
  CheckCircle as HealthyIcon,
  Warning as DegradedIcon,
  Error as UnhealthyIcon,
  Help as UnknownIcon,
} from '@mui/icons-material';

interface HealthMetrics {
  timestamp: number;
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  services: {
    database: ServiceHealthStatus;
    memory: ServiceHealthStatus;
    plugins: ServiceHealthStatus;
    security: ServiceHealthStatus;
  };
  performance: {
    responseTimes: Record<string, number>;
    errorRates: Record<string, number>;
    throughput: Record<string, number>;
  };
}

interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: number;
  responseTime: number;
  errorCount: number;
  details?: Record<string, any>;
}

export const HealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthMetrics = async () => {
    try {
      if (window.electronAPI?.system?.getHealthMetrics) {
        const healthData = await window.electronAPI.system.getHealthMetrics();
        setMetrics(healthData);
        setError('');
      } else {
        // Mock data for development
        setMetrics({
          timestamp: Date.now(),
          uptime: 3600,
          memory: {
            heapUsed: 45 * 1024 * 1024,
            heapTotal: 64 * 1024 * 1024,
            external: 8 * 1024 * 1024,
            rss: 52 * 1024 * 1024,
            arrayBuffers: 2 * 1024 * 1024,
          },
          cpu: {
            usage: 12.5,
            loadAverage: [0.8, 0.9, 1.1],
          },
          eventLoop: {
            lag: 2.3,
            utilization: 15.2,
          },
          services: {
            database: { status: 'healthy', lastCheck: Date.now(), responseTime: 45, errorCount: 0 },
            memory: { status: 'healthy', lastCheck: Date.now(), responseTime: 32, errorCount: 0 },
            plugins: { status: 'degraded', lastCheck: Date.now(), responseTime: 150, errorCount: 2 },
            security: { status: 'healthy', lastCheck: Date.now(), responseTime: 28, errorCount: 0 },
          },
          performance: {
            responseTimes: {
              'database-query': 25,
              'memory-access': 12,
              'plugin-call': 85,
            },
            errorRates: {
              'database-query': 0.2,
              'memory-access': 0.1,
              'plugin-call': 2.5,
            },
            throughput: {
              'database-query': 150,
              'memory-access': 300,
              'plugin-call': 45,
            },
          },
        });
      }
    } catch (err) {
      setError(`Failed to fetch health metrics: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealthMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status: ServiceHealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon color="success" />;
      case 'degraded':
        return <DegradedIcon color="warning" />;
      case 'unhealthy':
        return <UnhealthyIcon color="error" />;
      default:
        return <UnknownIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: ServiceHealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          System Health Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No health metrics available</Alert>
      </Box>
    );
  }

  const overallHealth = Object.values(metrics.services).some(s => s.status === 'unhealthy')
    ? 'unhealthy'
    : Object.values(metrics.services).some(s => s.status === 'degraded')
    ? 'degraded'
    : 'healthy';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          System Health Dashboard
        </Typography>
        <Chip
          label={overallHealth.toUpperCase()}
          color={getStatusColor(overallHealth)}
          sx={{ mr: 2 }}
        />
        <Tooltip title="Refresh metrics">
          <IconButton onClick={fetchHealthMetrics} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* System Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Memory Usage</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Heap: {formatBytes(metrics.memory.heapUsed)} / {formatBytes(metrics.memory.heapTotal)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.memory.heapUsed / metrics.memory.heapTotal) * 100}
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                External: {formatBytes(metrics.memory.external)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                RSS: {formatBytes(metrics.memory.rss)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CpuIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">CPU Usage</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Usage: {metrics.cpu.usage.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(metrics.cpu.usage, 100)}
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Load Average: {metrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uptime: {formatUptime(metrics.uptime)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EventLoopIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Event Loop</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Lag: {metrics.eventLoop.lag.toFixed(1)}ms
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(metrics.eventLoop.lag / 10, 100)} // Scale to 0-100
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Utilization: {metrics.eventLoop.utilization.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Service Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Service Status
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Response Time</TableCell>
                      <TableCell>Error Count</TableCell>
                      <TableCell>Last Check</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(metrics.services).map(([serviceName, serviceHealth]) => (
                      <TableRow key={serviceName}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(serviceHealth.status)}
                            <Typography variant="body2" sx={{ ml: 1, textTransform: 'capitalize' }}>
                              {serviceName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={serviceHealth.status}
                            size="small"
                            color={getStatusColor(serviceHealth.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{serviceHealth.responseTime}ms</TableCell>
                        <TableCell>{serviceHealth.errorCount}</TableCell>
                        <TableCell>
                          {new Date(serviceHealth.lastCheck).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Operation</TableCell>
                      <TableCell>Avg Response Time</TableCell>
                      <TableCell>Error Rate</TableCell>
                      <TableCell>Throughput</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.keys(metrics.performance.responseTimes).map((operation) => (
                      <TableRow key={operation}>
                        <TableCell>{operation}</TableCell>
                        <TableCell>{metrics.performance.responseTimes[operation]?.toFixed(1)}ms</TableCell>
                        <TableCell>{metrics.performance.errorRates[operation]?.toFixed(2)}%</TableCell>
                        <TableCell>{metrics.performance.throughput[operation]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HealthDashboard;