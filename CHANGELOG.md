# Change Log

All notable changes to the "rust-feature-toggler" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.8] - 2024-04-24

### Fixed

- Bug fixes for improved stability.

### Changed

- Refactored internal mechanisms for faster performance and efficiency.

## [0.0.7] - 2023-10-02

### Added

- Implemented a new feature toggle `all` allowing users to enable or disable features individually or enable all features at once.

### Fixed

- Fixed a bug where it couldn't parse features from both root and workspace `Cargo.toml` files.

### Changed

- Updated the status bar item tooltip to display more informative messages based on the state of the features.
- Enhanced the config to handle the all feature properly when updating or retrieving the feature list.
- Refactored the status bar to display a message indicating that all features are active when the all feature is activated.
- Optimized the extension to avoid redundant commands and improve performance.

## [0.0.x] - 2023-09-20

- Initial release of rust-feature-toggler
