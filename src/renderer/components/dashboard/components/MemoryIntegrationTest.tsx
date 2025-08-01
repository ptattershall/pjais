import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  TrendingUp as TierIcon,
} from '@mui/icons-material';

export const MemoryIntegrationTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [testError, setTestError] = useState<string>('');
  const [tierMetrics, setTierMetrics] = useState<any>(null);
  const [memoryHealth, setMemoryHealth] = useState<any>(null);

  const loadMemoryData = async () => {
    setLoading(true);
    setTestError('');
    try {
      if (window.electronAPI?.memory) {
        // Get memory health and tier metrics
        const [healthData, metrics] = await Promise.all([
          window.electronAPI.memory.getHealth(),
          window.electronAPI.memory.getTierMetrics()
        ]);
        
        setMemoryHealth(healthData);
        setTierMetrics(metrics);
        setTestResult(`✅ Successfully loaded memory health and tier metrics`);
        console.log('Memory health:', healthData);
        console.log('Tier metrics:', metrics);
      }
    } catch (error) {
      console.error('Failed to load memory data:', error);
      setTestError(`❌ Failed to load memory data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestMemory = async () => {
    setLoading(true);
    setTestError('');
    try {
      if (window.electronAPI?.memory) {
        const testMemory = {
          content: `Test memory created at ${new Date().toISOString()}`,
          type: 'text' as const,
          importance: Math.floor(Math.random() * 100),
          tags: ['test', 'integration', 'database']
        };
        
        const created = await window.electronAPI.memory.create(testMemory);
        setTestResult(`✅ Successfully created memory: ${created.content.substring(0, 50)}...`);
        console.log('Created memory:', created);
        
        // Reload data to show the new memory
        await loadMemoryData();
      }
    } catch (error) {
      console.error('Failed to create memory:', error);
      setTestError(`❌ Failed to create memory: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemoryData();
  }, []);

  const totalMemories = tierMetrics ? 
    (tierMetrics.hot?.count || 0) + (tierMetrics.warm?.count || 0) + (tierMetrics.cold?.count || 0) : 0;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <MemoryIcon sx={{ mr: 2, color: 'secondary.main' }} />
        <Typography variant="h6">
          Memory Integration Test
        </Typography>
        <Chip
          label={`${totalMemories} memories`}
          size="small"
          sx={{ ml: 'auto', mr: 2 }}
          color={totalMemories > 0 ? 'success' : 'default'}
        />
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadMemoryData}
            disabled={loading}
          >
            Load Memory Data
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={createTestMemory}
            disabled={loading}
          >
            Create Test Memory
          </Button>
          {loading && <CircularProgress size={24} />}
        </Box>

        {testResult && (
          <Alert severity="success" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {testResult}
          </Alert>
        )}

        {testError && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {testError}
          </Alert>
        )}

        {tierMetrics && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Memory Tier Distribution:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {['hot', 'warm', 'cold'].map((tier) => (
                <Box key={tier} sx={{ minWidth: 100 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TierIcon sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                      {tier}
                    </Typography>
                  </Box>
                  <Typography variant="h6" component="div">
                    {tierMetrics[tier]?.count || 0}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(((tierMetrics[tier]?.count || 0) / Math.max(totalMemories, 1)) * 100, 100)}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {memoryHealth && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Memory Health Status:
            </Typography>
            <Chip
              label={memoryHealth.status || 'Unknown'}
              size="small"
              color={memoryHealth.status === 'healthy' ? 'success' : 'warning'}
            />
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default MemoryIntegrationTest;