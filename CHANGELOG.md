# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.16.3] - 2025-12-02

### Fixed

- do not start already started QueueLauncher polling: this.pollingTimer?.startTime

## [1.16.2] - 2025-11-26

### Changed

- fix QueueLauncher -> startPolling
- added to CacheFactory: removeByPattern

## [1.16.1] - 2025-11-26

### Changed

- decorators removed (useless) but breaking changes => 1.16.x
- Track the polling lastActivity/isRunning

## [1.15.2] - 2025-10-13

### Changed

- Launcher.push returns the id from workerStore => can be used potentially in 'idsToWait'

## [1.15.1] - 2025-10-12

### Changed

- Queue refacto: breaking changes (1.14.x => 1.15.x)

## [1.14.4] - 2025-09-03

### Changed

- Bumped package version to 1.14.4 and synchronized bpInfo export
- Updated documentation: README badges and Memory Bank section clarified
- Routine maintenance: dependency metadata and scripts untouched

## [1.14.3] - 2025-09-03

### Changed

- Internal maintenance release

## [1.14.2] - 2025-08-21

### Changed

- Increase process max listeners to prevent warnings when using multiple workers
- Enhanced thread event handlers in Launcher with proper cleanup to prevent memory leaks
- Improved logging consistency with "(mtn)" prefix across CacheMiddleware and LoggerPerf
- Logstash new conf

## [1.14.1] - 2025-08-11

### Changed

- Refactored Logger format creation into separate methods (createBaseFormat, createConsoleFormat)
- Implemented dynamic label updating functionality for Logger - labels can now be changed after initialization
- Improved log formatting with consistent padding for process ID/thread ID and log levels
- Fixed LoggerFactory setUp method to merge options instead of replacing them, preventing loss of previously set options
- Updated logstash.conf grok patterns to match the new log format with improved separators
- Enhanced test:elk script to clean up .gen directory before running ELK setup and verification
- Updated Logger tests to verify dynamic label functionality and improved test organization

### Added

- Added readLastLogs method to LoggerFactory for centralized log reading functionality
- Enhanced Logger API with improved method signatures and better path handling

## [1.13.5] - 2025-07-28

### Added

- Cache setIfNotExists

## [1.13.2] - 2025-07-25

### Fixed

- Some log messages and options
- Queue & Launcher orders and stop

## [1.13.1] - 2025-07-24

### Changed

- Logger setup (breaking change)
- Added some log messages
- Added log filters

## [1.12.19] - 2025-07-23

### Fixed

- prevent queueLauncher setWorkerStore undefined

## [1.12.18] - 2025-07-23

### Changed

- Version bump for internal release

## [1.12.17] - 2025-07-23

### added

- add to the launcher a setWorkerStore hook

### Fixed

- limit to a large response value (e.g., 10MB -> 50MB)
- prevent queueLauncher setQueueConcurrency undefined

## [1.12.15] - 2025-06-25

### Fixed

- Fixed a bug in QueueLauncher.ts where queue names were being removed from the queue list when no parameters were
  found, preventing future checks on those queues

## [1.12.14] - 2025-06-24

### Added

- Added a new optional `key` property to `IWorkerData` interface to better identify duplicate workers
- Enhanced duplicate detection in `DefaultWorkerStore` using the new key property

## [1.12.13] - 2025-06-19

### Changed

- Enhanced AbstractWorkerStore.release method to accept a shouldKeepInQueue parameter
- Refactored QueueLauncher to pass shouldKeepInQueue parameter to workerStore.release
- Updated DefaultWorkerStore to support the new release method signature

## [1.12.12] - 2025-06-18

### Changed

- Removed commented-out logger line in Launcher.ts
- Fixed a bug in Launcher.ts by adding a check for threadStrategy when using queueLauncher
- Added '**/*.nolint.*' to the ignorePatterns list in eslint.config.mjs
- Updated bpstatus.json version from 0.0.13 to 0.0.14

## [1.12.10] - 2025-06-16

### Changed

- Moved ts-node from dependencies to devDependencies in package.json
- Refactored Launcher.ts initialization logic to use a switch statement based on threadStrategy
- Fixed a bug in Launcher.ts where directWorker was only initialized when polling was not disabled
- Enhanced Launcher.spec.ts with improved test structure and additional test case

## [1.12.9] - 2025-06-12

### Changed

- Improved error handling in asThread.js with better error messages and proper exit codes
- Cleaned up code by removing commented-out sections in asThread.js
- Enhanced switch-dependencies.cjs script to check for dependencies in both dependencies and devDependencies
- Fixed bug in QueueLauncher.ts by changing the order of operations in the release method

## [1.12.8] - 2025-06-10

### Changed

- Version bump for internal release

## [1.12.7] - 2025-06-09

### Changed

- Updated mle-tools-configuration dependency to version 1.0.13
- Reorganized scripts in package.json with bp: prefix
- Added new build process scripts
- Modified BuiltInstance.ts to conditionally delete old builds based on allOldBuild parameter

## [1.12.5] - 2025-05-20

### Changed

- Version bump for internal release
- Updated CI workflow to use Node.js version 22
- Improved build and deployment process

## [1.12.3] - 2025-04-27

### Changed

- Improved CI workflow to use `git push --tags` for more reliable tag pushing
- Updated mle-tools-configuration dependency to version 1.0.12

## [1.12.2] - 2025-04-27

### Changed

- Enhanced type definitions for Configuration class in BuiltInstance.ts

## [1.12.1] - 2025-04-22

### Fixed

- Fixed GitHub Actions workflow permissions for tag creation and pushing

## [1.12.0] - 2025-04-22

### Added

- Git tagging process for version tracking
- Enhanced CI workflow to automatically create and push version tags
- Updated release documentation with tagging instructions

## [1.11.16] - 2024-11-30

### Added

- Cache bypass functionality

## [1.10.x] - 2024-10-15

### Changed

- Extracted configuration into mle-tools-configuration

## [1.9.x] - 2024-09-01

### Added

- Cache tools and middleware

## [1.8.x] - 2024-08-15

### Changed

- Simplified Launcher and Queue

## [1.7.x] - 2024-07-01

### Added

- New features for Launcher and Queue: resume, remove

## [1.6.x] - 2024-06-15

### Changed

- Extended Configuration merge capabilities

## [1.5.x] - 2024-05-01

### Added

- TimeTracking middleware

## [1.4.x] - 2024-04-15

### Changed

- New Queue storing/polling mechanism

## [1.3.x] - 2024-03-01

### Changed

- Launcher optimisation (concurrency, filtering)

## [1.2.x] - 2024-02-15

### Added

- OS metrics

## [1.1.x] - 2024-01-01

### Fixed

- Consolidated API (launchers, decorators, logs)

## [0.0.1] - 2023-12-01

### Added

- First try from servers
