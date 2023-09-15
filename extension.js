const vscode = require('vscode');
const toml = require('toml');
const path = require('path');
const fs = require('fs');

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
 * Constant which stores the key for the settings.json file.
 * @type {string}
 * @constant
 * @default
 * @readonly
 * @private
 */
const SETTINGS_KEY = 'rust-analyzer.cargo.features';

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log(
    'Congratulations, your extension "🚀 rust-feature-toggler" is now active!'
  );

  initializeSettingJSON();

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
      return checkFeatureInSettingsJson(feature)
        ? `[✓] ${feature}`
        : `[ ] ${feature}`;
    });

    vscode.window
      .showQuickPick(featureList, { placeHolder: 'Select a feature' })
      .then((feature) => {
        if (feature) {
          const featureName = feature.slice(4);
          feature.startsWith('[✓]')
            ? removeFeatureFromSettingsJson(featureName)
            : addFeatureToSettingsJson(featureName);

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
  const featureListFromSettings = getFeatureListFromSettingsJson();

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
/**
 * Retrieves the path to the Cargo.toml file in the current workspace.
 * @returns {string} - The path to the Cargo.toml file.
 */
function getCargoTomlPath() {
  return path.join(getWorkspaceFolderPath(), 'Cargo.toml');
}

/**
 * Parses the Cargo.toml file to extract the feature list.
 * @param {string} filePath - The path to the Cargo.toml file.
 * @returns {Object} - The list of features from the Cargo.toml file.
 */
function parseCargoToml(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');
  const sanitizedContent = sanitizeTomlFile(file);

  const parsed = toml.parse(sanitizedContent);

  if (parsed.features) {
    return parsed.features;
  }

  if (parsed.workspace && parsed.workspace.members) {
    return getFeaturesFromWorkspaceMembers(parsed.workspace.members);
  }

  return {};
}

/**
 * Extracts features from the workspace members defined in the Cargo.toml file.
 * @param {Array<string>} workspaceMembers - The list of workspace members from the Cargo.toml file.
 * @returns {Object} - The features aggregated from all workspace members.
 */
function getFeaturesFromWorkspaceMembers(workspaceMembers) {
  const features = {};
  workspaceMembers.forEach((member) => {
    if (!ignoreCommentedOutMember(member)) {
      const cargoTomlPath = path.join(
        getWorkspaceFolderPath(),
        member,
        'Cargo.toml'
      );
      try {
        const fileContent = fs.readFileSync(cargoTomlPath, 'utf8');
        const sanitizedContent = sanitizeTomlFile(fileContent);

        const parsed = toml.parse(sanitizedContent);
        if (parsed.features) {
          Object.assign(features, parsed.features);
        }
      } catch (error) {
        console.log(error);
      }
    }
  });
  return features;
}

/**
 * Sanitize the toml file content
 * @param {string} file - The toml file content.
 * @returns {string} - The sanitized toml file content.
 */
function sanitizeTomlFile(file) {
  return file.replace(/^\s*\w+\.\w+\s*=.*$/gm, '# $&');
}

/**
 * Checks if a workspace member entry in the Cargo.toml file is commented out.
 * @param {string} member - The workspace member entry to check.
 * @returns {boolean} - True if the member is commented out, false otherwise.
 */
function ignoreCommentedOutMember(member) {
  return member.startsWith('#');
}

/**
 * Function which checks if the settings.json file exists in the workspace
 * If it does not exist, it creates the file
 * @returns {string} - The path of the settings.json file
 *
 */
function initializeSettingJSON() {
  const settingsPath = path.join(
    getWorkspaceFolderPath(),
    '.vscode/settings.json'
  );

  try {
    if (!fs.existsSync(settingsPath)) {
      fs.mkdirSync(path.join(getWorkspaceFolderPath(), '.vscode'));

      fs.writeFileSync(settingsPath, '{}');

      vscode.window.showInformationMessage(
        'Rust Feature Toggle : Created settings.json file in .vscode folder'
      );

      // Add the SETTINGS_KEY to the settings.json file
      const settings = readSettings();
      settings[SETTINGS_KEY] = [];
      writeSettings(settings);
    }

    return settingsPath;
  } catch (error) {
    console.log(error);
  }

  return settingsPath;
}

/**
 * Utility function to read settings from the settings.json file
 * @returns {object} - The settings object.
 */
function readSettings() {
  const settingsPath = initializeSettingJSON();
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

/**
 * Utility function to write settings to the settings.json file
 * @param {object} settings - The settings object.
 * @returns {void}
 */
function writeSettings(settings) {
  const settingsPath = initializeSettingJSON();
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * Adds a feature to the settings.json file
 * @param {string} feature - The feature to add.
 * @returns {void}
 */
function addFeatureToSettingsJson(feature) {
  const settings = readSettings();
  settings[SETTINGS_KEY] = settings[SETTINGS_KEY] || [];
  if (!settings[SETTINGS_KEY].includes(feature)) {
    settings[SETTINGS_KEY].push(feature);
    writeSettings(settings);
  }
}

/**
 * Removes a feature from the settings.json file
 * @param {string} feature - The feature to remove.
 * @returns {void}
 */
function removeFeatureFromSettingsJson(feature) {
  const settings = readSettings();
  if (settings[SETTINGS_KEY]) {
    settings[SETTINGS_KEY] = settings[SETTINGS_KEY].filter(
      (/** @type {string} */ f) => f !== feature
    );
    writeSettings(settings);
  }
}

/**
 * Checks if a feature is enabled in the settings.json file.
 * @param {string} feature - The feature to check.
 * @returns {boolean} - True if the feature is enabled, false otherwise.
 */
function checkFeatureInSettingsJson(feature) {
  const settings = readSettings();
  return settings[SETTINGS_KEY]
    ? settings[SETTINGS_KEY].includes(feature)
    : false;
}

/**
 * Get the feature list from the settings.json file
 * @returns {Array<string>} - The list of features.
 */
function getFeatureListFromSettingsJson() {
  const settings = readSettings();
  return settings[SETTINGS_KEY] || [];
}

/**
 * Get workspace folder path
 * @returns {string} - The workspace folder path.
 * @private
 */
function getWorkspaceFolderPath() {
  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

// Remove features from settings.json if they are not present in Cargo.toml
// This is useful when a feature is removed from Cargo.toml
function updateSettingsJson() {
  try {
    const featureList = getFeatureListFromSettingsJson();
    const cargoTomlPath = getCargoTomlPath();
    const features = parseCargoToml(cargoTomlPath);
    const featuresFromCargoToml = Object.keys(features);

    const featuresToRemove = featureList.filter(
      (feature) => !featuresFromCargoToml.includes(feature)
    );

    featuresToRemove.forEach((feature) => {
      removeFeatureFromSettingsJson(feature);
    });
  } catch (error) {
    console.log(error);
  }
}

function deactivate() {
  console.log('Your extension "rust-feature-toggler" is now deactivated!');

  // Remove features from settings.json if they are not present in Cargo.toml
  // This is useful when a feature is removed from Cargo.toml
  updateSettingsJson();
}

/**
 * @param {vscode.TextDocument} document
 */
function getFeatureLines(document) {
  const regex = /\[features\]\n((?:(?![\[]).*\n)*)/gm;
  const match = regex.exec(document.getText());
  if (match) {
    return match[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  }
  return [];
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
        const isEnabled = checkFeatureInSettingsJson(trimmedFeatureName);

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
module.exports = {
  activate,
  deactivate,
  getFeaturesFromWorkspaceMembers,
};
