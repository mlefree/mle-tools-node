# System Patterns

Architecture
- Modular packages under src/ (logger, launchers, middlewares, etc.)
- TypeScript compiled to dist via tsc
- Tests under specs using mocha + @testdeck/mocha + chai

Key technical decisions
- Winston for logging with DailyRotateFile and Logstash integration
- Worker processing abstractions with direct/thread/queue strategies
- Cache via cache-manager with Redis adapter option

Design patterns
- Factory for Logger with dynamic label and formats
- Middleware-style components for timing and caching
- Store abstractions for workers with pluggable implementations

Component relationships
- Launcher orchestrates workers and queue
- Logger used across middlewares and worker lifecycle
- ELK integration via scripts and logstash config
