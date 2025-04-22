# 🛠️ mle-tools-node

> A collection of Node.js utilities and tools for building applications

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.12.0-green.svg)](https://github.com/mlefree/mle-tools-node)
[![CI](https://github.com/mlefree/mle-tools-node/actions/workflows/ci.yml/badge.svg)](https://github.com/mlefree/mle-tools-node/actions/workflows/ci.yml)

## 🌟 Features

- **🚀 High-Performance Task Processing**
    - Direct execution
    - Thread-based processing
    - Queue management with retry capabilities

- **💾 Advanced Caching**
    - In-memory LRU cache
    - Redis integration
    - Flexible cache middleware

- **📊 Monitoring & Metrics**
    - CPU usage tracking
    - Performance metrics
    - Time tracking middleware

- **📝 Logging & Debugging**
    - Winston-based logging
    - Daily rotating log files
    - Customizable log levels

- **🔧 Utility Tools**
    - Secure property management
    - CSV processing with fast-csv
    - HTTP requests with axios
    - Configuration management

## 📦 Installation

```bash
npm install mle-tools-node
```

## 🚀 Quick Start

```typescript
import {Logger, Cache, WorkerProcessor} from 'mle-tools-node';

// Set up logging
const logger = new Logger('my-app');
logger.info('Application started');

// Use caching
const cache = new Cache();
await cache.set('key', 'value', 3600); // Cache for 1 hour
const value = await cache.get('key');

// Process tasks
const worker = new WorkerProcessor();
await worker.push('myTask', async () => {
    // Your task logic here
});
```

## 🔧 Configuration

The library can be configured through environment variables or a configuration file:

```typescript
import {Config} from 'mle-tools-node';

const config = {
    cache: {
        type: 'redis',
        ttl: 3600
    },
    logging: {
        level: 'info',
        rotation: true
    }
};

Config.initialize(config);
```

## 📚 Documentation

For detailed documentation, please read the [specifications](./specs).

For development guidelines, please read the [DEVELOPMENT.md](./DEVELOPMENT.md) file.

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run test-coverage
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📈 Release History

See [Changelog](./CHANGELOG.md) for a detailed version history.

## 🏗️ Built With

- [TypeScript](https://www.typescriptlang.org/) - Main programming language
- [Winston](https://github.com/winstonjs/winston) - Logging framework
- [Cache Manager](https://github.com/node-cache-manager/node-cache-manager) - Flexible caching
- [Mocha](https://mochajs.org/) - Testing framework
- [Redis](https://redis.io/) - Optional caching backend

## 🙋‍♂️ Support

For support, please raise an issue in the GitHub repository or contact the maintainers.

---

Made with ❤️ by [mle](https://github.com/mlefree)
