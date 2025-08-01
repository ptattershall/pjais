import { describe, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { expect } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { DashboardOverview } from './DashboardOverview'
import { createTestPersona, createTestMemory } from '../../../test-utils'
import { theme } from '../../theme'

// Mock the electron APIs that components might use
const mockElectronAPI = {
  personas: {
    list: vi.fn(),
    getActive: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  memories: {
    search: vi.fn(),
    getStats: vi.fn(),
    getTierMetrics: vi.fn()
  },
  system: {
    getVersion: vi.fn(),
    getHealth: vi.fn()
  }
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// Mock React components that might have complex dependencies
vi.mock('../personas/PersonaDashboard', () => ({
  PersonaDashboard: () => <div data-testid="persona-dashboard">Persona Dashboard</div>
}))

vi.mock('../memory/MemoryExplorer', () => ({
  MemoryExplorer: () => <div data-testid="memory-explorer">Memory Explorer</div>
}))

vi.mock('../admin/SystemHealthDashboard', () => ({
  SystemHealthDashboard: () => <div data-testid="system-health">System Health</div>
}))

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
)

describe('DashboardOverview', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockElectronAPI.personas.list.mockResolvedValue([
      createTestPersona({ id: 'persona-1', name: 'Assistant 1', isActive: true }),
      createTestPersona({ id: 'persona-2', name: 'Assistant 2', isActive: false })
    ])
    
    mockElectronAPI.personas.getActive.mockResolvedValue(
      createTestPersona({ id: 'persona-1', name: 'Active Assistant', isActive: true })
    )
    
    mockElectronAPI.memories.search.mockResolvedValue({
      memories: [
        createTestMemory({ id: 'memory-1', content: 'Recent memory 1' }),
        createTestMemory({ id: 'memory-2', content: 'Recent memory 2' })
      ],
      total: 2
    })
    
    mockElectronAPI.memories.getStats.mockResolvedValue({
      totalMemories: 150,
      memoryByType: { text: 120, image: 20, file: 10 },
      storageSize: 1024000,
      lastOptimization: new Date()
    })
    
    mockElectronAPI.memories.getTierMetrics.mockResolvedValue({
      tierDistribution: { hot: 50, warm: 60, cold: 40 },
      totalMemories: 150,
      averageImportance: 65,
      lastOptimization: new Date()
    })
    
    mockElectronAPI.system.getVersion.mockResolvedValue({
      app: '1.0.0',
      electron: '28.0.0',
      node: '18.17.0',
      chrome: '120.0.0',
      platform: 'darwin'
    })
    
    mockElectronAPI.system.getHealth.mockResolvedValue({
      status: 'healthy',
      lastCheck: new Date(),
      details: {
        database: 'operational',
        services: 'operational',
        memory: 'normal'
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render dashboard overview with all main sections', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      // Check for main dashboard title
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      
      // Wait for async content to load
      await waitFor(() => {
        expect(screen.getByText(/Active Assistant/i)).toBeInTheDocument()
      })
    })

    it('should display system version information', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument()
      })
    })

    it('should show memory statistics', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/150/)).toBeInTheDocument() // Total memories
      })
    })

    it('should display persona information', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Active Assistant/i)).toBeInTheDocument()
      })
    })

    it('should render with no active persona', async () => {
      mockElectronAPI.personas.getActive.mockResolvedValue(null)

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/no active persona/i)).toBeInTheDocument()
      })
    })
  })

  describe('data loading', () => {
    it('should show loading state initially', () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should handle data loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockElectronAPI.personas.getActive.mockRejectedValue(new Error('Failed to load personas'))

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should retry data loading on error', async () => {
      mockElectronAPI.personas.getActive
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createTestPersona({ name: 'Recovered Assistant' }))

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      // Click retry button
      await waitFor(() => {
        const retryButton = screen.getByText(/retry/i)
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/Recovered Assistant/i)).toBeInTheDocument()
      })
    })

    it('should refresh data periodically', async () => {
      vi.useFakeTimers()

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      // Initial load
      await waitFor(() => {
        expect(mockElectronAPI.personas.getActive).toHaveBeenCalledTimes(1)
      })

      // Advance timer by 30 seconds (assuming auto-refresh interval)
      vi.advanceTimersByTime(30000)

      await waitFor(() => {
        expect(mockElectronAPI.personas.getActive).toHaveBeenCalledTimes(2)
      })

      vi.useRealTimers()
    })
  })

  describe('user interactions', () => {
    it('should navigate to persona management when clicking persona card', async () => {
      const mockNavigate = vi.fn()
      
      // Mock useNavigate hook if using React Router
      vi.mock('react-router-dom', () => ({
        useNavigate: () => mockNavigate,
        Link: ({ children, to }: any) => <a href={to}>{children}</a>
      }))

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        const personaCard = screen.getByText(/Active Assistant/i).closest('[data-testid="persona-card"]')
        if (personaCard) {
          fireEvent.click(personaCard)
        }
      })

      // Verify navigation was attempted
      // This would depend on your routing implementation
    })

    it('should show memory details when clicking memory stats', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        const memoryStats = screen.getByTestId('memory-stats-card')
        fireEvent.click(memoryStats)
      })

      // Verify memory details modal or navigation
      expect(screen.getByTestId('memory-details')).toBeInTheDocument()
    })

    it('should allow quick persona creation', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      const createButton = screen.getByText(/create persona/i)
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByTestId('persona-creation-dialog')).toBeInTheDocument()
      })
    })

    it('should handle quick actions menu', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      // Click quick actions button
      const quickActionsButton = screen.getByTestId('quick-actions-button')
      fireEvent.click(quickActionsButton)

      // Verify dropdown menu appears
      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-menu')).toBeInTheDocument()
      })

      // Test individual actions
      const optimizeMemoryAction = screen.getByText(/optimize memory/i)
      fireEvent.click(optimizeMemoryAction)

      // Verify action was triggered
      expect(mockElectronAPI.memories.optimizeTiers).toHaveBeenCalled()
    })
  })

  describe('responsive design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock window.matchMedia for mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      // Verify mobile-specific layout elements
      expect(screen.getByTestId('mobile-dashboard-layout')).toBeInTheDocument()
    })

    it('should use grid layout for desktop screens', () => {
      // Mock window.matchMedia for desktop viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('min-width: 1024px'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      expect(screen.getByTestId('desktop-grid-layout')).toBeInTheDocument()
    })
  })

  describe('performance', () => {
    it('should not re-render unnecessarily', async () => {
      const renderSpy = vi.fn()
      
      const TestComponent = () => {
        renderSpy()
        return <DashboardOverview />
      }

      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1)

      // Re-render with same props
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Should not trigger unnecessary re-renders
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })

    it('should virtualize large lists efficiently', async () => {
      // Mock large dataset
      const largeMemoryList = Array.from({ length: 1000 }, (_, i) =>
        createTestMemory({
          id: `memory-${i}`,
          content: `Memory content ${i + 1}`
        })
      )

      mockElectronAPI.memories.search.mockResolvedValue({
        memories: largeMemoryList,
        total: 1000
      })

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should only render visible items, not all 1000
        const renderedItems = screen.getAllByTestId(/memory-item-/)
        expect(renderedItems.length).toBeLessThan(50) // Assuming ~10-20 visible items
      })
    })

    it('should debounce rapid user interactions', async () => {
      vi.useFakeTimers()

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      const refreshButton = screen.getByTestId('refresh-button')
      
      // Rapid clicks
      fireEvent.click(refreshButton)
      fireEvent.click(refreshButton)
      fireEvent.click(refreshButton)

      // Fast forward through debounce delay
      vi.advanceTimersByTime(500)

      await waitFor(() => {
        // Should only call API once due to debouncing
        expect(mockElectronAPI.personas.getActive).toHaveBeenCalledTimes(2) // 1 initial + 1 debounced
      })

      vi.useRealTimers()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Dashboard Overview')
      expect(screen.getByRole('region', { name: /persona information/i })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /memory statistics/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      // Tab through interactive elements
      const interactiveElements = screen.getAllByRole('button')
      
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex', '0') // or be naturally focusable
      })
    })

    it('should announce loading states to screen readers', () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })

    it('should provide alternative text for visual elements', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      )

      await waitFor(() => {
        const charts = screen.getAllByRole('img')
        charts.forEach(chart => {
          expect(chart).toHaveAttribute('alt')
        })
      })
    })
  })

  describe('error boundaries', () => {
    it('should catch and display component errors gracefully', () => {
      const ThrowError = () => {
        throw new Error('Test component error')
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <TestWrapper>
          <DashboardOverview>
            <ThrowError />
          </DashboardOverview>
        </TestWrapper>
      )

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      expect(screen.getByText(/reload/i)).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should allow error recovery', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Component that fails on first render, succeeds on second
      let shouldThrow = true
      const ConditionalError = () => {
        if (shouldThrow) {
          shouldThrow = false
          throw new Error('First render error')
        }
        return <div>Recovered successfully</div>
      }

      render(
        <TestWrapper>
          <DashboardOverview>
            <ConditionalError />
          </DashboardOverview>
        </TestWrapper>
      )

      // Initially shows error
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

      // Click retry
      const retryButton = screen.getByText(/retry/i)
      fireEvent.click(retryButton)

      // Should recover
      expect(screen.getByText(/recovered successfully/i)).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })
})