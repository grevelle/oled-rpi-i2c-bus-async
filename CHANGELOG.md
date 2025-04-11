# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- New Bluetooth and WiFi example files in ES6 module format
- Additional npm scripts for running the new examples

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