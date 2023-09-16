const vscode = require('vscode');

const {
  checkFeatureInConfig,
  removeFeatureFromConfig,
  addFeatureToConfig,
  getFeatureListFromConfig,
  updateConfig,
} = require('./src/config');

const { getCargoTomlPath, parseCargoToml } = require('./src/toml');

const {
  drawDecorations,
  updateSvgPaths,
  updateDecorationTypes,
} = require('./src/decorations');

let currentTheme = vscode.window.activeColorTheme.kind;

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
  drawDecorations();
  statusBarItem.show();

  let disposable = vscode.commands.registerCommand(
    'rust-feature.toggleFeature',
    () => toggleFeature(statusBarItem)
  );

  const updateFeatureListAndDecorations = () => {
    updateStatusBarItem(statusBarItem);
    drawDecorations();
  };

  const createWatcher = (/** @type {vscode.GlobPattern} */ globPattern) => {
    const watcher = vscode.workspace.createFileSystemWatcher(globPattern);
    watcher.onDidChange(updateFeatureListAndDecorations);
    watcher.onDidCreate(updateFeatureListAndDecorations);
    watcher.onDidDelete(updateFeatureListAndDecorations);
    return watcher;
  };

  const cargoTomlWatcher = createWatcher('**/Cargo.toml');
  const gitWatcher = createWatcher('**/.git/HEAD');

  const editorWatcher =
    vscode.window.onDidChangeActiveTextEditor(drawDecorations);
  const editorSaveWatcher =
    vscode.workspace.onDidSaveTextDocument(drawDecorations);

  const themeWatcher = vscode.window.onDidChangeActiveColorTheme(() => {
    const newTheme = vscode.window.activeColorTheme.kind;
    console.log(`current theme: ${currentTheme}, new theme: ${newTheme}`);
    if (newTheme !== currentTheme) {
      console.log('Theme changed');
      currentTheme = newTheme;
      updateSvgPaths();
      updateDecorationTypes();
      drawDecorations();
    }
  });

  disposable = vscode.Disposable.from(
    disposable,
    statusBarItem,
    cargoTomlWatcher,
    gitWatcher,
    editorWatcher,
    themeWatcher,
    editorSaveWatcher
  );

  context.subscriptions.push(disposable);
}

/**
 * @param {vscode.StatusBarItem} statusBarItem
 */
function toggleFeature(statusBarItem) {
  try {
    const cargoTomlPath = getCargoTomlPath();
    const features = parseCargoToml(cargoTomlPath);

    if (Object.keys(features).length === 0) {
      vscode.window.showInformationMessage('No features found');
      return;
    }

    const featureList = Object.keys(features).map((feature) => {
      return checkFeatureInConfig(feature)
        ? `[✓] ${feature}`
        : `[ ] ${feature}`;
    });

    vscode.window
      .showQuickPick(featureList, { placeHolder: 'Select a feature' })
      .then((feature) => {
        if (feature) {
          const featureName = feature.slice(4);
          feature.startsWith('[✓]')
            ? removeFeatureFromConfig(featureName)
            : addFeatureToConfig(featureName);

          vscode.window.showInformationMessage(
            `Feature ${featureName} ${
              feature.startsWith('[✓]') ? 'disabled' : 'enabled'
            }`
          );

          vscode.commands.executeCommand('rust-analyzer.restartServer');

          updateStatusBarItem(statusBarItem);
        }
      });
  } catch (error) {
    console.log(error);
  }
}

/**
 * @param {vscode.StatusBarItem} statusBarItem
 */
function updateStatusBarItem(statusBarItem) {
  const cargoTomlPath = getCargoTomlPath();
  const features = parseCargoToml(cargoTomlPath);
  const featureListFromSettings = getFeatureListFromConfig();

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

function deactivate() {
  console.log('Your extension "rust-feature-toggler" is now deactivated!');
  updateConfig();
}

module.exports = {
  activate,
  deactivate,
};
