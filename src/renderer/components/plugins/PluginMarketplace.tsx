import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tab,
  Tabs,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Rating
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Update as UpdateIcon,
  Delete as DeleteIcon,
  Extension as ExtensionIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { usePluginManager, PluginSearchResult } from '../../hooks/usePluginManager';
import { PluginResponse } from '../../../shared/ipc-contracts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`plugin-tabpanel-${index}`}
      aria-labelledby={`plugin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface PluginCardProps {
  plugin: PluginSearchResult;
  onInstall: (plugin: PluginSearchResult) => void;
  isInstalling: boolean;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, onInstall, isInstalling }) => {
  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[8],
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <ExtensionIcon />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="h2" noWrap>
                {plugin.name}
              </Typography>
              {plugin.verified && (
                <VerifiedIcon color="primary" fontSize="small" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              v{plugin.version} • {plugin.author}
            </Typography>
          </Box>
        </Box>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mb: 2, flexGrow: 1 }}
        >
          {plugin.description}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Rating value={plugin.rating} precision={0.1} size="small" readOnly />
            <Typography variant="caption">
              {plugin.rating.toFixed(1)}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {plugin.downloads.toLocaleString()} downloads
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Updated {plugin.lastUpdated.toLocaleDateString()}
          </Typography>
          <Button
            variant="contained"
            startIcon={isInstalling ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={() => onInstall(plugin)}
            disabled={isInstalling}
            size="small"
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

interface InstalledPluginCardProps {
  plugin: PluginResponse;
  onStart: (pluginId: string) => void;
  onStop: (pluginId: string) => void;
  onUpdate: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
  isStarting: boolean;
  isStopping: boolean;
  isUpdating: boolean;
  isUninstalling: boolean;
}

const InstalledPluginCard: React.FC<InstalledPluginCardProps> = ({
  plugin,
  onStart,
  onStop,
  onUpdate,
  onUninstall,
  isStarting,
  isStopping,
  isUpdating,
  isUninstalling,
}) => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <ExtensionIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" component="h3">
                {plugin.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                v{plugin.version || '1.0.0'} • {plugin.manifest.author || 'Unknown Author'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip 
                  label={plugin.enabled ? 'Running' : 'Stopped'} 
                  color={plugin.enabled ? 'success' : 'default'} 
                  size="small" 
                />
                {plugin.manifest.description && (
                  <Typography variant="caption" color="text.secondary">
                    {plugin.manifest.description}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {plugin.enabled ? (
              <Button
                variant="outlined"
                color="warning"
                startIcon={isStopping ? <CircularProgress size={16} /> : <StopIcon />}
                onClick={() => onStop(plugin.id.toString())}
                disabled={isStopping}
                size="small"
              >
                {isStopping ? 'Stopping...' : 'Stop'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={isStarting ? <CircularProgress size={16} /> : <PlayIcon />}
                onClick={() => onStart(plugin.id.toString())}
                disabled={isStarting}
                size="small"
              >
                {isStarting ? 'Starting...' : 'Start'}
              </Button>
            )}
            
            <Button
              variant="outlined"
              startIcon={isUpdating ? <CircularProgress size={16} /> : <UpdateIcon />}
              onClick={() => onUpdate(plugin.id.toString())}
              disabled={isUpdating}
              size="small"
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={isUninstalling ? <CircularProgress size={16} /> : <DeleteIcon />}
              onClick={() => onUninstall(plugin.id.toString())}
              disabled={isUninstalling}
              size="small"
            >
              {isUninstalling ? 'Removing...' : 'Remove'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export const PluginMarketplace: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'downloads' | 'rating' | 'updated'>('downloads');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginSearchResult | null>(null);

  const {
    plugins,
    statistics,
    searchResults,
    isLoadingPlugins,
    installPlugin,
    uninstallPlugin,
    startPlugin,
    stopPlugin,
    updatePlugin,
    isInstalling,
    isUninstalling,
    isStarting,
    isStopping,
    isUpdating,
    searchPlugins,
  } = usePluginManager();

  // Search plugins when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      searchPlugins(searchQuery, {
        sortBy,
        verified: showVerifiedOnly,
        limit: 20,
      });
    }
  }, [searchQuery, sortBy, showVerifiedOnly, searchPlugins]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInstallClick = (plugin: PluginSearchResult) => {
    setSelectedPlugin(plugin);
    setInstallDialogOpen(true);
  };

  const handleInstallConfirm = () => {
    if (selectedPlugin) {
      installPlugin({
        name: selectedPlugin.name,
        manifest: {
          name: selectedPlugin.name,
          version: selectedPlugin.version,
          description: selectedPlugin.description,
          author: selectedPlugin.author,
          capabilities: [],
          permissions: [],
        }
      });
      setInstallDialogOpen(false);
      setSelectedPlugin(null);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Plugin Marketplace
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover and manage AI plugins to extend your personas&apos; capabilities
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 3, 
        mb: 4 
      }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <ExtensionIcon />
              </Avatar>
              <Box>
                <Typography variant="h5">{statistics.totalPlugins}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Plugins
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <PlayIcon />
              </Avatar>
              <Box>
                <Typography variant="h5">{statistics.runningPlugins}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Running
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge badgeContent={statistics.availableUpdates} color="error">
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <UpdateIcon />
                </Avatar>
              </Badge>
              <Box>
                <Typography variant="h5">{statistics.availableUpdates}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Updates Available
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main' }}>
                <TrendingUpIcon />
              </Avatar>
              <Box>
                <Typography variant="h5">{statistics.healthyPlugins}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Healthy
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="plugin marketplace tabs">
          <Tab label="Browse Marketplace" />
          <Tab label={`Installed (${statistics.totalPlugins})`} />
          <Tab label="Updates" />
        </Tabs>
      </Box>

      {/* Browse Marketplace Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Search and Filters */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              md: '1fr auto auto' 
            }, 
            gap: 2, 
            alignItems: 'center' 
          }}>
            <TextField
              fullWidth
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <MenuItem value="downloads">Downloads</MenuItem>
                <MenuItem value="rating">Rating</MenuItem>
                <MenuItem value="updated">Updated</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant={showVerifiedOnly ? "contained" : "outlined"}
              startIcon={<VerifiedIcon />}
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
            >
              Verified Only
            </Button>
          </Box>
        </Box>

        {/* Search Results */}
        {searchQuery && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Search Results ({searchResults.length})
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: 3 
            }}>
              {searchResults.map((plugin) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onInstall={handleInstallClick}
                  isInstalling={isInstalling}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Popular Plugins */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Popular Plugins
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Plugin marketplace is currently in development. Search above to see mock results.
          </Alert>
        </Box>
      </TabPanel>

      {/* Installed Plugins Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Installed Plugins ({statistics.totalPlugins})
          </Typography>
          {isLoadingPlugins ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : plugins.length === 0 ? (
            <Alert severity="info">
              No plugins installed yet. Browse the marketplace to install your first plugin.
            </Alert>
          ) : (
            plugins.map((plugin) => (
              <InstalledPluginCard
                key={plugin.id}
                plugin={plugin}
                onStart={startPlugin}
                onStop={stopPlugin}
                onUpdate={(id) => updatePlugin({ pluginId: id, updateData: {} })}
                onUninstall={uninstallPlugin}
                isStarting={isStarting}
                isStopping={isStopping}
                isUpdating={isUpdating}
                isUninstalling={isUninstalling}
              />
            ))
          )}
        </Box>
      </TabPanel>

      {/* Updates Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Available Updates ({statistics.availableUpdates})
          </Typography>
          <Alert severity="info">
            No updates available at this time. Update checking is coming soon.
          </Alert>
        </Box>
      </TabPanel>

      {/* Install Confirmation Dialog */}
      <Dialog
        open={installDialogOpen}
        onClose={() => setInstallDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Install Plugin</DialogTitle>
        <DialogContent>
          {selectedPlugin && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to install <strong>{selectedPlugin.name}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedPlugin.description}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Rating value={selectedPlugin.rating} precision={0.1} size="small" readOnly />
                <Typography variant="caption">
                  {selectedPlugin.rating.toFixed(1)} • {selectedPlugin.downloads.toLocaleString()} downloads
                </Typography>
              </Box>
              {selectedPlugin.verified && (
                <Chip 
                  icon={<VerifiedIcon />} 
                  label="Verified Publisher" 
                  color="primary" 
                  size="small" 
                  sx={{ mb: 2 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleInstallConfirm} 
            variant="contained"
            startIcon={isInstalling ? <CircularProgress size={16} /> : <DownloadIcon />}
            disabled={isInstalling}
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
