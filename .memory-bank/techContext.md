# Tech Context

Stack
- Node.js 22 in CI; library targets Node >= 18
- TypeScript 5.x, ts-node for tests, mocha + chai for testing
- ESLint + Prettier configured via eslint.config.mjs

Dependencies
- winston, winston-daily-rotate-file
- cache-manager, cache-manager-redis-yet
- axios, fast-csv, pidusage
- mle-tools-configuration

Development setup
- npm scripts for building, testing, ELK validation
- build-dist compiles TS and copies artifacts to dist
- test:elk sets up and verifies ELK integration via scripts

Constraints
- Semantic versioning with tags; bp scripts manage branches/tags
- Keep docs and memory bank synchronized with code changes
