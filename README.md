# Rust Feature Toggle VSCode Extension

## Overview

The "Rust Feature Toggle" is a Visual Studio Code extension designed to enhance the workflow of Rust developers by providing an easy way to toggle feature flags directly from the VSCode interface. Utilizing the status bar and command palette, you can quickly enable or disable features in your Rust project.

## Demo

![Rust Feature Toggle Demo](https://github.com/itsyaasir/rust-feature-toggle/assets/7762687/5a82326a-08a7-44cb-93bd-af8dc9b7ed19)

## Installation

### From Visual Studio Marketplace

1. Open Visual Studio Code
2. Click on the Extensions icon in the Activity Bar on the side of the window
3. Search for "Rust Feature Toggle"
4. Click Install
5. Reload VSCode

### From Open VSX Registry

1. Open Visual Studio Code
2. Click on the Extensions icon in the Activity Bar on the side of the window
3. Click on the "More Actions" menu (three dots) and select "Install from VSIX..."
4. Paste the following URL: `https://open-vsx.org/api/itsyaasir/rust-feature-toggler/latest`
5. Click Install
6. Reload VSCode

### From Source

1. Clone the repository: `git clone https://github.com/itsyaasir/rust-feature-toggle.git`
2. Navigate to the extension directory: `cd rust-feature-toggle`
3. Install dependencies: `npm install`
4. Build the extension: `npm run compile`
5. Press `F5` to open a new window with the extension loaded
6. Run the command `Rust Feature Toggle` in the Command Palette to activate the extension

## Features

- Toggle features from the status bar: Click on the feature name in the status bar to toggle it on or off
- Toggle features from the command palette: Open the command palette (Ctrl+Shift+P) and search for "Rust Feature Toggle" to select and toggle features
- Quick pick list of features to toggle: When running the "Rust Feature Toggle" command, a quick pick list of available features is displayed for easy selection
- Gutter decorations to indicate feature status: Gutter decorations (icons) are displayed next to feature flags in your Rust code to indicate their current status

## Usage

1. Open a Rust project in Visual Studio Code
2. The extension will automatically detect feature flags in your Rust code
3. Click on a feature name in the status bar to toggle it on or off
4. Alternatively, open the command palette (Ctrl+Shift+P) and search for "Rust Feature Toggle" to select and toggle features
5. Gutter decorations will update in real-time to reflect the current status of each feature flag

## Configuration (To Be Implemented)

The extension provides the following configuration options:

- `rustFeatureToggle.statusBar`: Enable or disable the feature toggle status bar item (default: `true`)
- `rustFeatureToggle.gutterDecorations`: Enable or disable gutter decorations for feature flags (default: `true`)

To modify these settings:

1. Open the Settings editor in Visual Studio Code (File > Preferences > Settings)
2. Search for "Rust Feature Toggle"
3. Update the desired configuration options

## Contributing

Contributions are welcome! If you encounter any issues, have suggestions for improvements, or would like to add new features, please open an issue or submit a pull request on the [GitHub repository](https://github.com/itsyaasir/rust-feature-toggle).

## License

This project is licensed under the [MIT License](LICENSE).
