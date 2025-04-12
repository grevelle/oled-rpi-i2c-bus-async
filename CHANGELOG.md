# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2025-04-11

### Added

- Enhanced base class functionality with standardized implementations for common operations
- New optimization methods in the BaseOLED class for device-agnostic improvements
- Common update strategy methods that benefit both display types
- Standardized error handling across all driver implementations

### Changed

- Consolidated duplicate code between SSD1306 and SH1106 drivers into BaseOLED
- Improved display control methods (dim, invert, turnOn, turnOff) with device-specific optimizations
- Enhanced update strategies for both full and partial screen updates
- Optimized batch command processing for both display types
- Refactored driver initialization to use a shared base method

### Improved

- Performance optimizations for both SSD1306 and SH1106 displays
- Memory efficiency for display operations
- Code maintainability through better inheritance structure
- Update performance through smarter dirty rectangle handling

## [1.0.6] - 2025-04-11

### Added

- Comprehensive README improvements:
  - Added Table of Contents for better navigation
  - Added TypeScript usage examples
  - Added Performance Optimization section
  - Added Logging and Debugging section
  - Added instructions for running example scripts
- Additional badges in README for build status and PRs welcome

### Changed

- Reorganized documentation into clear sections
- Improved TypeScript usage documentation
- Fixed typos and parameter descriptions
- Enhanced feature descriptions to highlight TypeScript support and logger utility

## [1.0.5] - 2025-04-11

### Added

- TypeScript type definitions for all classes and functions
- New logger utility for consistent logging
- Improved batch command processing for better performance
- More examples for all major features
- Additional npm scripts for running examples
- Added CHANGELOG.md to the npm package

### Changed

- Optimized drawing operations for better performance
- Enhanced error handling throughout the codebase
- Improved documentation with TypeScript types
- Better memory management for large bitmap operations

### Fixed

- Fixed memory leak in animation processing
- Improved SH1106 display initialization sequence
- Fixed potential race conditions in async operations

## [1.0.4] - 2025-04-11

### Added

- `engines` field in package.json specifying Node.js >=16.0.0
- `files` field in package.json to control published files
- Additional npm scripts for running examples
- .npmignore file to exclude unnecessary files from the npm package

### Fixed

- Removed duplicate `turnOnDisplay` method in SSD1306 driver
- Fixed undefined variable `tryImage` in the `image` method

## [1.0.3] - 2023-04-15

### Added

- First public release with async/await support
- Support for SSD1306 and SH1106 OLED displays
- ES6 module syntax

## [1.0.2] - 2023-04-10

### Changed

- Internal development version

## [1.0.1] - 2023-04-05

### Changed

- Internal development version

## [1.0.0] - 2023-04-01

### Added

- Initial fork from oled-rpi-i2c-bus
- Migration to async/await pattern
- Conversion to ES6 modules
