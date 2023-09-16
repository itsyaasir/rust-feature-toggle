const vscode = require('vscode');

const {
  checkFeatureInConfig,
  removeFeatureFromConfig,
  addFeatureToConfig,
  getFeatureListFromConfig,
  updateConfig,
} = require('./src/config');

const { getCargoTomlPath, parseCargoToml } = require('./src/toml');

const { getFeatureLines } = require('./src/decorations');
const path = require('path');

let currentTheme = vscode.window.activeColorTheme.kind;

let checked_svgPath;
let unchecked_svgPath;

function updateSvgPaths() {
  const basePath = path.join(__filename, '..', 'assets');
  const themeSuffix =
    currentTheme === vscode.ColorThemeKind.Dark ? 'light' : 'dark';

  checked_svgPath = path.join(basePath, `checked_${themeSuffix}.svg`);
  unchecked_svgPath = path.join(basePath, `unchecked_${themeSuffix}.svg`);
}

updateSvgPaths();

let checkedBox = vscode.window.createTextEditorDecorationType({
  gutterIconPath: checked_svgPath,
  gutterIconSize: 'contain',
});

let uncheckedBox = vscode.window.createTextEditorDecorationType({
  gutterIconPath: unchecked_svgPath,
  gutterIconSize: 'contain',
});

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

    if (newTheme !== currentTheme) {
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

/**
 * @param {vscode.TextEditor} editor
 * @param {string | any[]} featureList
 * @param {any[]} featureLines
 */
function generateDecorations(editor, featureList, featureLines) {
  const decorations = [];

  featureLines.forEach((line) => {
    const [featureName] = line.split('=');
    if (featureName) {
      const trimmedFeatureName = featureName.trim();
      if (featureList.includes(trimmedFeatureName)) {
        const lineStart = editor.document.getText().indexOf(line);
        const startPosition = editor.document.positionAt(
          lineStart + line.indexOf(trimmedFeatureName)
        );
        const endPosition = startPosition.translate(
          0,
          trimmedFeatureName.length
        );
        const range = new vscode.Range(startPosition, endPosition);
        const isEnabled = checkFeatureInConfig(trimmedFeatureName);

        decorations.push({
          range,
          hoverMessage: isEnabled ? 'Feature enabled' : 'Feature disabled',
          renderOptions: isEnabled ? checkedBox : uncheckedBox,
        });
      }
    }
  });

  return decorations;
}

function drawDecorations() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  if (!editor.document.fileName.endsWith('Cargo.toml')) {
    return;
  }

  const features = parseCargoToml(getCargoTomlPath());
  const featureList = Object.keys(features);
  const featureLines = getFeatureLines(editor.document);
  const decorations = generateDecorations(editor, featureList, featureLines);

  editor.setDecorations(
    checkedBox,
    decorations.filter((deco) => deco.renderOptions === checkedBox)
  );
  editor.setDecorations(
    uncheckedBox,
    decorations.filter((deco) => deco.renderOptions === uncheckedBox)
  );
}

function updateDecorationTypes() {
  checkedBox.dispose();
  uncheckedBox.dispose();

  checkedBox = vscode.window.createTextEditorDecorationType({
    gutterIconPath: checked_svgPath,
    gutterIconSize: 'contain',
  });

  uncheckedBox = vscode.window.createTextEditorDecorationType({
    gutterIconPath: unchecked_svgPath,
    gutterIconSize: 'contain',
  });

  drawDecorations();
}

function deactivate() {
  console.log('Your extension "rust-feature-toggler" is now deactivated!');
  updateConfig();
}

module.exports = {
  activate,
  deactivate,
};
