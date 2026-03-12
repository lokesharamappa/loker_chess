# Chess Online - Development Guide

## 🎯 Overview

Chess Online is a professional chess application built with industry best practices, comprehensive TDD, and enterprise-grade architecture. This guide covers development setup, coding standards, testing strategies, and deployment procedures.

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js with ES modules
- **Web Framework**: Express.js with Socket.IO
- **Frontend**: Vanilla JavaScript with modern APIs
- **Testing**: Jest (unit/integration), Playwright (E2E)
- **Code Quality**: ESLint, Prettier, JSDoc
- **Performance**: Benchmark.js, custom metrics

### Project Structure
```
chess-online/
├── src/                    # Source code
│   ├── core/              # Core business logic
│   │   └── RoomManager.js  # Room and game management
│   ├── middleware/        # Express middleware
│   │   └── validation.js  # Input validation
│   ├── socket/            # Socket.IO handlers
│   │   └── handlers.js    # Event handlers
│   ├── utils/             # Utility functions
│   │   └── logger.js      # Logging utility
│   └── server.js          # Main server file
├── tests/                 # Test suite
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/               # End-to-end tests
│   ├── performance/       # Performance tests
│   └── setup/             # Test setup files
├── public/                # Static frontend files
├── docs/                  # Documentation
└── scripts/               # Build and utility scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git for version control

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd chess-online

# Install dependencies
npm install

# Install development dependencies
npm install --include=dev
```

### Running the Application
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Custom port
npm run start:4000
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 🧪 Testing Strategy

### Test-Driven Development (TDD)
1. **Write failing test first**
2. **Implement minimal code to pass**
3. **Refactor for quality**
4. **Repeat**

### Test Types
- **Unit Tests**: Individual functions and classes
- **Integration Tests**: Component interactions
- **End-to-End Tests**: Complete user workflows
- **Performance Tests**: Benchmarking and optimization

### Coverage Requirements
- **Branch Coverage**: 90%
- **Function Coverage**: 90%
- **Line Coverage**: 90%
- **Statement Coverage**: 90%

### Test Organization
```
tests/
├── unit/                  # Fast, isolated tests
│   ├── game.test.js      # Chess logic tests
│   └── roomManager.test.js # Room management tests
├── integration/          # Component interaction tests
│   └── socketHandlers.test.js # Socket.IO integration
├── e2e/                  # Full application tests
│   └── chessGame.spec.js # User journey tests
└── performance/          # Performance benchmarks
    └── benchmark.js      # Performance tests
```

## 📋 Coding Standards

### Code Style
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line Length**: 120 characters
- **File Naming**: camelCase.js

### Naming Conventions
- **Variables**: camelCase
- **Functions**: camelCase
- **Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: camelCase.js

### Documentation
- **JSDoc**: All public functions
- **Comments**: Complex logic explanations
- **README**: Project documentation
- **CHANGELOG**: Version history

### Example Code Structure
```javascript
/**
 * @fileoverview Brief description of the file
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

/**
 * Description of the function
 * @param {string} param1 - Description of parameter
 * @param {Object} param2 - Description of parameter
 * @returns {string} Description of return value
 */
const functionName = (param1, param2) => {
  // Implementation
  return result;
};

export default functionName;
```

## 🔧 Development Workflow

### Git Workflow
1. **Create feature branch**: `git checkout -b feature/new-feature`
2. **Write tests**: TDD approach
3. **Implement code**: Make tests pass
4. **Run tests**: Ensure 100% coverage
5. **Lint code**: Fix any style issues
6. **Commit changes**: Clear commit messages
7. **Push branch**: For review
8. **Create PR**: Code review process

### Code Quality Checks
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check

# Security audit
npm run security-check
```

### Pre-commit Hooks
- **Lint**: Automatic code style checking
- **Tests**: Run relevant test suite
- **Coverage**: Ensure minimum coverage
- **Security**: Check for vulnerabilities

## 🚀 Performance Guidelines

### Performance Targets
- **API Response**: <100ms
- **Socket Events**: <50ms
- **Move Generation**: >10,000 ops/sec
- **Memory Usage**: <100KB per room
- **Concurrent Users**: 1000+

### Optimization Techniques
- **Caching**: Redis for session data
- **Lazy Loading**: Load resources on demand
- **Connection Pooling**: Reuse connections
- **Compression**: Gzip for responses
- **Minification**: Optimize assets

### Performance Monitoring
```bash
# Run performance benchmarks
npm run performance-test

# Monitor memory usage
node --inspect src/server.js

# Profile with Chrome DevTools
npm run profile
```

## 🔒 Security Best Practices

### Input Validation
- **Sanitize all inputs**: Prevent injection attacks
- **Validate types**: Ensure correct data types
- **Length limits**: Prevent buffer overflow
- **Rate limiting**: Prevent abuse

### Authentication & Authorization
- **JWT tokens**: Secure authentication
- **Role-based access**: Permission control
- **Session management**: Secure sessions
- **Password security**: Hashing and salting

### Data Protection
- **HTTPS**: Encrypted communication
- **Environment variables**: Secure config
- **Database encryption**: Data at rest
- **Audit logging**: Security events

## 📦 Deployment

### Environment Setup
```bash
# Development
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Production
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### Build Process
```bash
# Build for production
npm run build

# Run production server
npm run start

# Deploy with Docker
docker build -t chess-online .
docker run -p 3000:3000 chess-online
```

### Health Checks
- **Health endpoint**: `/api/health`
- **Metrics endpoint**: `/api/metrics`
- **Status monitoring**: Service health
- **Error tracking**: Error reporting

## 🐛 Debugging

### Debugging Tools
- **Chrome DevTools**: Frontend debugging
- **Node Inspector**: Backend debugging
- **Socket.IO debugger**: Real-time debugging
- **Performance profiler**: Performance analysis

### Common Issues
- **Connection problems**: Check Socket.IO configuration
- **Memory leaks**: Monitor memory usage
- **Performance issues**: Profile and optimize
- **Test failures**: Check test setup

### Logging
```javascript
import logger from './src/utils/logger.js';

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message');
logger.debug('Debug message');
```

## 📊 Monitoring

### Metrics to Track
- **Active users**: Concurrent connections
- **Game statistics**: Games played, moves made
- **Performance**: Response times, throughput
- **Errors**: Error rates, types of errors
- **Resources**: CPU, memory, network usage

### Alerting
- **High error rates**: >5% error rate
- **Slow responses**: >500ms response time
- **Memory usage**: >80% memory usage
- **Connection issues**: High disconnect rate

## 📚 Further Reading

### Documentation
- **API Documentation**: OpenAPI/Swagger specs
- **Architecture Docs**: System design
- **User Guides**: End-user documentation
- **Contributing**: Development guidelines

### Resources
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices
- **Socket.IO Documentation**: https://socket.io/docs/
- **Jest Testing**: https://jestjs.io/docs/getting-started
- **Playwright Testing**: https://playwright.dev/

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch
3. **Write tests** (TDD)
4. **Implement** functionality
5. **Ensure quality** (linting, coverage)
6. **Submit** pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Chess Master Pro - Professional Chess Application**  
*Built with industry best practices and comprehensive TDD* ♟️
