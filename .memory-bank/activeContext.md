# Active Context: mle-tools-node

## Current Work Focus

The project is currently focused on:

1. **Dependency Management**
   - Updating dependencies to their latest versions
   - Ensuring compatibility with the latest Node.js versions

2. **Documentation Enhancement**
   - Implementing the Memory Bank documentation system
   - Ensuring all documentation is up-to-date and consistent

## Recent Changes

### Unreleased Changes
- No unreleased changes at this time

### Version 1.14.2 (Current) - 2025-08-21
- **Launcher System Enhancements**
  - Enhanced thread event handlers in Launcher with proper cleanup to prevent memory leaks
  - Increased process max listeners to prevent warnings when using multiple workers
- **Logging Improvements**
  - Improved logging consistency with "(mtn)" prefix across CacheMiddleware and LoggerPerf
  - Updated Logstash configuration for better log processing

### Version 1.14.1 - 2025-08-11
- **Logger System Enhancements**
  - Refactored Logger format creation into separate methods (createBaseFormat, createConsoleFormat)
  - Implemented dynamic label updating functionality for Logger - labels can now be changed after initialization
  - Improved log formatting with consistent padding for process ID/thread ID and log levels
  - Fixed LoggerFactory setUp method to merge options instead of replacing them, preventing loss of previously set options
  - Updated logstash.conf grok patterns to match the new log format with improved separators
  - Enhanced test:elk script to clean up .gen directory before running ELK setup and verification
  - Updated Logger tests to verify dynamic label functionality and improved test organization
  - Added readLastLogs method to LoggerFactory for centralized log reading functionality
  - Enhanced Logger API with improved method signatures and better path handling

### Version 1.13.6 (Previous)
- **ELK Stack Integration Improvements**
  - Fixed critical index configuration mismatch between Logstash and ILM setup
  - Updated Logstash configuration to use `app-logs` alias instead of dynamic daily indices
  - Resolved Elasticsearch 400 error in log queries due to missing @timestamp mapping
  - Ensured full compatibility between ILM policy (`logs_policy`) and Logstash output patterns
  - Enhanced ELK setup verification script with comprehensive health checks
  - Successfully validated `npm run test:elk` command with all verification steps passing
  - Improved log processing pipeline with proper timestamp handling and field mapping

### Version 1.12.18 (Previous)
- Version bump for internal release

### Version 1.12.17 (Previous)
- Added to the launcher a setWorkerStore hook
- Fixed limit to a large response value (e.g., 10MB -> 50MB)
- Prevented queueLauncher setQueueConcurrency undefined

### Version 1.12.15 - 1.12.16
- Fixed a bug in QueueLauncher.ts where queue names were being removed from the queue list when no parameters were found, preventing future checks on those queues

### Version 1.12.14
- Removed commented-out logger line in Launcher.ts
- Fixed a bug in Launcher.ts by adding a check for threadStrategy when using queueLauncher
- Added '**/*.nolint.*' to the ignorePatterns list in eslint.config.mjs
- Updated bpstatus.json version from 0.0.13 to 0.0.14

### Version 1.12.11 (Previous)
- Version bump for internal release

### Version 1.12.10 (2025-06-16)
- Moved ts-node from dependencies to devDependencies in package.json
- Refactored Launcher.ts initialization logic to use a switch statement based on threadStrategy
- Fixed a bug in Launcher.ts where directWorker was only initialized when polling was not disabled
- Enhanced Launcher.spec.ts with improved test structure and additional test case

### Version 1.12.9 (2025-06-12)
- Improved error handling in asThread.js with better error messages and proper exit codes
- Cleaned up code by removing commented-out sections in asThread.js
- Enhanced switch-dependencies.cjs script to check for dependencies in both dependencies and devDependencies
- Fixed bug in QueueLauncher.ts by changing the order of operations in the release method

### Version 1.12.8 (2025-06-10)
- Version bump for internal release

### Version 1.12.7 (2025-06-09)
- Updated mle-tools-configuration dependency to version 1.0.13
- Reorganized scripts in package.json with bp: prefix
- Added new build process scripts
- Modified BuiltInstance.ts to conditionally delete old builds based on allOldBuild parameter

### Version 1.12.5 (2025-05-20)
- Version bump for internal release
- Updated CI workflow to use Node.js version 22
- Improved build and deployment process

### Version 1.12.3 (2025-04-27)
- Improved CI workflow to use `git push --tags` for more reliable tag pushing
- Updated mle-tools-configuration dependency to version 1.0.12

### Version 1.12.2 (2025-04-23)
- Enhanced type definitions for Configuration class in BuiltInstance.ts

### Version 1.12.1 (2025-04-22)
- Fixed GitHub Actions workflow permissions for tag creation and pushing

### Version 1.12.0 (2025-04-22)
- Added Git tagging process for version tracking
- Enhanced CI workflow to automatically create and push version tags
- Updated release documentation with tagging instructions

## Next Steps

### Short-term Goals
1. **Complete Memory Bank Documentation**
   - Ensure all Memory Bank files are created and populated with relevant information
   - Review and update documentation to reflect the current state of the project

2. **Dependency Audit**
   - Review all dependencies for security vulnerabilities
   - Update dependencies to their latest stable versions

3. **Testing Improvements**
   - Increase test coverage
   - Add more integration tests

### Medium-term Goals
1. **Performance Optimization**
   - Profile and optimize critical paths
   - Improve caching mechanisms

2. **Feature Enhancements**
   - Expand worker thread capabilities
   - Enhance monitoring tools

3. **Documentation**
   - Create more comprehensive examples
   - Improve API documentation

## Active Decisions and Considerations

### Documentation Strategy
- Moved from traditional documentation to the Memory Bank system
- Migrated content from DEVELOPMENT.md to Memory Bank files
- Created developmentExamples.md to preserve valuable examples and specific instructions
- Recommended removing DEVELOPMENT.md as its content has been fully migrated

### Versioning Strategy
- Following semantic versioning
- Using Git tags for version tracking
- Automating version bumping and changelog updates

### Dependency Management
- Balancing between staying current and maintaining stability
- Considering extracting more functionality into separate packages (like mle-tools-configuration)

### Testing Strategy
- Focusing on unit tests with high coverage
- Adding more integration tests for critical components
- Using in-memory Redis for testing cache functionality
