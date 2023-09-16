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
 * @returns {void}
 */
function toggleFeature() {
  try {
    const config = new ConfigManager();
    const cargoTomlPath = getCargoTomlPath();
    const features = parseCargoToml(cargoTomlPath);

    if (Object.keys(features).length === 0) {
      vscode.window.showInformationMessage('No features found');
      return;
    }

    const featureList = Object.keys(features).map((feature) => {
      return config.checkFeature(feature) ? `[✓] ${feature}` : `[ ] ${feature}`;
    });

    vscode.window
      .showQuickPick(featureList, { placeHolder: 'Select a feature' })
      .then((feature) => {
        if (feature) {
          const featureName = feature.slice(4);
          feature.startsWith('[✓]')
            ? config.removeFeature(featureName)
            : config.addFeature(featureName);
          vscode.window.showInformationMessage(
            `Feature ${featureName} ${
              feature.startsWith('[✓]') ? 'disabled' : 'enabled'
            }`
          );

          vscode.commands.executeCommand('rust-analyzer.restartServer');
        }
      });
  } catch (error) {
    console.log(error);
    vscode.window.showErrorMessage(
      'An error occurred while toggling the feature. Please check the console for more details.'
    );
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

  if (Object.keys(features).length === 0) {
    statusBarItem.text = 'No features found';
  } else {
    statusBarItem.text = '$(gear) Toggle Feature';
    statusBarItem.tooltip = `Enabled Features\n${Object.values(
      featureListFromSettings
    )
      .map((feature) => `[✓] ${feature}`)
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
