# Product Context

Why it exists
- Standardize internal Node tooling across projects
- Reduce boilerplate for logging, caching, and worker processing
- Provide battle-tested integrations (ELK) with simple APIs

Problems solved
- Consistent logging format and transport
- Simple queue and worker lifecycle with multiple strategies
- Pluggable cache with Redis support

How it should work
- Install as dependency and import specific modules
- Minimal configuration with sensible defaults
- Scripts for CI/testing/ELK verification included

User experience goals
- Clear docs and examples in README/specs
- Stable semantic versioning and changelog
- Developer-friendly diagnostics and tests
