import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
} from '@mui/material';
// Temporarily use text instead of icons to bypass import issues
// import MemoryIcon from '@mui/icons-material/Memory';
// import PersonaIcon from '@mui/icons-material/Person';
// import PluginIcon from '@mui/icons-material/Extension';
// import SecurityIcon from '@mui/icons-material/Security';

interface QuickActionsCardProps {
  onAction?: (action: string) => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ onAction }) => {
  const actions = [
    { label: 'Create Persona', icon: '👤', color: 'primary', action: 'create-persona' },
    { label: 'View Memory', icon: '🧠', color: 'secondary', action: 'view-memory' },
    { label: 'Install Plugin', icon: '🔌', color: 'success', action: 'install-plugin' },
    { label: 'Security Audit', icon: '🔒', color: 'warning', action: 'security-audit' },
  ];

  return (
    <Card variant="glass" sx={{ height: 'fit-content' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
          Quick Actions
        </Typography>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2
        }}>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="glass"
              fullWidth
              startIcon={<span style={{ fontSize: '1.2em' }}>{action.icon}</span>}
              onClick={() => onAction?.(action.action)}
              sx={{
                p: 2,
                flexDirection: 'column',
                gap: 1,
                borderRadius: 2,
                height: 80,
                '& .MuiButton-startIcon': {
                  margin: 0,
                },
              }}
            >
              <Typography variant="caption" textAlign="center">
                {action.label}
              </Typography>
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;