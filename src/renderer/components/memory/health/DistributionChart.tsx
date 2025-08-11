import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';

interface DistributionData {
  name: string;
  value: number;
  percentage: number;
}

interface DistributionChartProps {
  title: string;
  data: DistributionData[];
  colors?: string[];
  chartType?: 'circle' | 'square';
}

const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const DistributionChart: React.FC<DistributionChartProps> = ({
  title,
  data,
  colors = DEFAULT_COLORS,
  chartType = 'circle'
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ p: 2 }}>
          {data.map((entry, index) => (
            <Box key={entry.name} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: colors[index % colors.length],
                  borderRadius: chartType === 'circle' ? '50%' : 2,
                  mr: 2
                }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2">
                  {entry.name}: {entry.value} ({entry.percentage}%)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={entry.percentage}
                  sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
