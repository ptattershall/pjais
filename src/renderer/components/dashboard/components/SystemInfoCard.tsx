import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { SystemInfo } from '@shared/types/system';

interface SystemInfoCardProps {
  onRefresh?: () => void;
}

export const SystemInfoCard: React.FC<SystemInfoCardProps> = ({ onRefresh }) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSystemInfo = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const info = await window.electronAPI.system.getVersion();
        setSystemInfo(info);
      }
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const handleRefresh = () => {
    fetchSystemInfo();
    onRefresh?.();
  };

  return (
    <Card variant="glass" sx={{ height: 'fit-content' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <DashboardIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            System Information
          </Typography>
          <IconButton
            size="small"
            onClick={handleRefresh}
            disabled={loading}
            sx={{ ml: 'auto' }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ py: 4 }}>
            <LinearProgress sx={{ borderRadius: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              Loading system information...
            </Typography>
          </Box>
        ) : systemInfo ? (
          <Box>
            {Object.entries({
              'Platform': systemInfo.platform,
              'App Version': systemInfo.app,
              'Electron': systemInfo.electron,
              'Node.js': systemInfo.node,
              'Chrome': systemInfo.chrome,
            }).map(([key, value]) => (
              <Box
                key={key}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {key}
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Unable to load system information
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemInfoCard;