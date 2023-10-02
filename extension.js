const vscode = require('vscode');

const { ConfigManager, updateConfig } = require('./src/config');
const { getCargoTomlPath, parseCargoToml } = require('./src/toml');
const { drawDecorations } = require('./src/decorations');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log(
    'Congratulations, your extension "🚀 rust-feature-toggler" is now active!'
  );

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'rust-feature.toggleFeature';
  updateStatusBarItem(statusBarItem);
  statusBarItem.show();

  drawDecorations();

  let disposable = vscode.commands.registerCommand(
    'rust-feature.toggleFeature',
    toggleFeature
  );

  const watchers = setupWatchers(statusBarItem);

  disposable = vscode.Disposable.from(disposable, ...watchers);
  context.subscriptions.push(disposable);
}

/**
 * Toggle feature
 */
/**
 * Toggles a feature in the Rust project.
 * @returns {Promise<void>} A Promise that resolves when the feature has been toggled.
 */
async function toggleFeature() {
  try {
    const config = new ConfigManager();
    const cargoTomlPath = getCargoTomlPath();
    const features = parseCargoToml(cargoTomlPath);

    if (Object.keys(features).length === 0 && !config.checkFeature('all')) {
      vscode.window.showInformationMessage('No features found');
      return;
    }

    const featureList = buildFeatureList(config, features);
    const selectedFeature = await vscode.window.showQuickPick(featureList, {
      placeHolder: 'Select a feature',
    });

    if (selectedFeature) {
      await handleSelectedFeature(config, selectedFeature);
      await vscode.commands.executeCommand('rust-analyzer.restartServer');
    }
  } catch (error) {
    console.error(error);
    vscode.window.showErrorMessage(
      'An error occurred while toggling the feature. Please check the console for more details.'
    );
  }
}

/**
 * Builds a list of features based on the given configuration and feature object.
 *
 * @param {Object} config - The configuration object.
 * @param {Object} features - The feature object.
 * @returns {Array} An array of feature strings with checkboxes indicating whether each feature is enabled or not.
 */
function buildFeatureList(config, features) {
  return [
    config.checkFeature('all') ? '[✓] all' : '[ ] all',
    ...Object.keys(features).map((feature) =>
      config.checkFeature(feature) ? `[✓] ${feature}` : `[ ] ${feature}`
    ),
  ];
}

/**
 * Handles the selected feature based on the configuration and displays a message to the user.
 * @param {Object} config - The configuration object.
 * @param {string} selectedFeature - The selected feature to handle.
 * @returns {Promise<void>}
 */
async function handleSelectedFeature(config, selectedFeature) {
  const featureName = selectedFeature.slice(4);

  if (featureName === 'all') {
    if (selectedFeature.startsWith('[✓]')) {
      config.removeFeature('all');
      vscode.window.showInformationMessage('All features disabled');
    } else {
      config.activateAllFeatures();
      vscode.window.showInformationMessage('All features enabled');
    }
    return;
  }

  if (selectedFeature.startsWith('[✓]')) {
    config.removeFeature(featureName);
    vscode.window.showInformationMessage(`Feature ${featureName} disabled`);
  } else {
    config.addFeature(featureName);
    vscode.window.showInformationMessage(`Feature ${featureName} enabled`);
  }
}

/**
 * Update status bar item
 * @param {vscode.StatusBarItem} statusBarItem
 * @returns {void}
 */
function updateStatusBarItem(statusBarItem) {
  const config = new ConfigManager();
  const cargoTomlPath = getCargoTomlPath();
  const features = parseCargoToml(cargoTomlPath);
  const featureListFromSettings = config.getFeatureList();

  if (featureListFromSettings.includes('all')) {
    statusBarItem.text = '$(gear) All Features Active';
    statusBarItem.tooltip = 'All features are currently activated.';
    return;
  }

  if (Object.keys(features).length === 0) {
    statusBarItem.text = 'No features found';
    statusBarItem.tooltip = 'No features available to activate.';
  } else {
    statusBarItem.text = '$(gear) Toggle Feature';
    statusBarItem.tooltip = `Enabled Features\n${featureListFromSettings
      .map((/** @type {string} */ feature) => `[✓] ${feature}`)
      .join('\n')}`;
  }
}

/**
 * Setup watchers
 * @param {vscode.StatusBarItem} statusBarItem
 */
function setupWatchers(statusBarItem) {
  const updateExtension = () => {
    updateStatusBarItem(statusBarItem);

    drawDecorations();
  };

  const fileWatcherCallback = (
    /** @type {vscode.GlobPattern} */ pattern,
    /** @type {{ (): void; }} */ callback
  ) => {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    watcher.onDidChange(callback);
    watcher.onDidCreate(callback);
    watcher.onDidDelete(callback);
    return watcher;
  };

  const fileWatchers = [
    fileWatcherCallback('**/Cargo.toml', updateExtension),
    fileWatcherCallback('**/.git/HEAD', updateExtension),
  ];

  const editorWatchers = [
    vscode.window.onDidChangeActiveTextEditor(updateExtension),
    vscode.workspace.onDidSaveTextDocument(updateExtension),
  ];

  const configWatcher = vscode.workspace.onDidChangeConfiguration(() => {
    updateConfig();
    updateStatusBarItem(statusBarItem);
    drawDecorations();
  });

  return [statusBarItem, ...fileWatchers, ...editorWatchers, configWatcher];
}

function deactivate() {
  console.log('Your extension "rust-feature-toggler" is now deactivated!');
  updateConfig();
}

module.exports = {
  activate,
  deactivate,
};
