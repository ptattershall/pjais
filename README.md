# PJai's

A modern Electron-based desktop application for managing AI personas and plugins with advanced memory management, privacy controls, and collaborative features.

## Features

- **AI Persona Management**: Create, customize, and manage AI personas with personality traits and behavioral patterns
- **Advanced Memory System**: D3.js-powered memory visualization with tiered storage and optimization
- **Privacy-First Design**: GDPR/CCPA compliant privacy controls with local data storage
- **Plugin Ecosystem**: Extensible plugin system for custom AI capabilities
- **Real-time Collaboration**: Share and collaborate on personas and plugins
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/pjais/ai-hub.git

# Navigate to project directory
cd pjais

# Install dependencies
pnpm install

# Start development server
pnpm start
```

### Development

```bash
# Run tests
pnpm test

# Build for production
pnpm run make

# Run specific test suites
pnpm test:main        # Main process tests
pnpm test:renderer    # Renderer process tests
pnpm test:integration # Integration tests
pnpm test:e2e         # End-to-end tests
```

## Architecture

PJai's is built with modern technologies:

- **Electron**: Cross-platform desktop application framework
- **React 19**: Modern UI with TypeScript
- **Material-UI**: Component library and theming
- **Effect**: Functional programming for error handling
- **SQLite**: Local database with connection pooling
- **D3.js**: Advanced data visualization
- **Vite**: Fast build tooling

## Project Structure

src/
├── main/           # Electron main process
├── renderer/       # React UI components
├── preload/        # IPC bridge
└── shared/         # Shared types and utilities

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

- **Documentation**: [docs.pjais.ai](https://docs.pjais.ai)
- **Issues**: [GitHub Issues](https://github.com/pjais/ai-hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/pjais/ai-hub/discussions)

## License

MIT License - see [LICENSE](LICENSE) for details.
