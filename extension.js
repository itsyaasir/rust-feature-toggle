const vscode = require('vscode');
const toml = require('toml');
const path = require('path');
const fs = require('fs');
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
  console.log('Congratulations, your extension "rust-feature" is now active!');

  let statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'rust-feature.toggleFeature';
  statusBarItem.text = `$(gear) Toggle Feature`;

  updateStatusBarItem(statusBarItem);

  statusBarItem.show();

  let disposable = vscode.commands.registerCommand(
    'rust-feature.toggleFeature',
    function () {
      const cargoTomlPath = getCargoTomlPath();

      console.log(cargoTomlPath);

      const features = parseCargoToml(cargoTomlPath);

      if (Object.keys(features).length === 0) {
        vscode.window.showInformationMessage('No features found');
        return;
      }

      console.log(features);

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
              `Feature ${featureName} toggled`
            );
            updateStatusBarItem(statusBarItem);
            vscode.commands.executeCommand('rust-analyzer.restartServer');
          }
        });
    }
  );

  context.subscriptions.push(disposable, statusBarItem);
}

/**
 * Updates the tooltip of the status bar item with the list of enabled features.
 * @param {vscode.StatusBarItem} statusBarItem - The status bar item to update.
 */
function updateStatusBarItem(statusBarItem) {
  const featureList = getFeatureListFromSettingsJson();
  statusBarItem.tooltip =
    featureList.length === 0
      ? 'No features enabled'
      : `Enabled Features\n${featureList
          .map((feature) => `\n[✓] ${feature}`)
          .join('\n')}`;
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
function checkSettingsJson() {
  const settingsPath = path.join(
    getWorkspaceFolderPath(),
    '.vscode/settings.json'
  );
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, '{}');
  }
  return settingsPath;
}

/**
 * Utility function to read settings from the settings.json file
 * @returns {object} - The settings object.
 */
function readSettings() {
  const settingsPath = checkSettingsJson();
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

/**
 * Utility function to write settings to the settings.json file
 * @param {object} settings - The settings object.
 * @returns {void}
 */
function writeSettings(settings) {
  const settingsPath = checkSettingsJson();
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
      (f) => f !== feature
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

function deactivate() {
  console.log('Your extension "rust-feature" is now deactivated!');
}

module.exports = {
  activate,
  deactivate,
  getCargoTomlPath,
  getFeatureListFromSettingsJson,
  getWorkspaceFolderPath,
  getFeaturesFromWorkspaceMembers,
  addFeatureToSettingsJson,
  updateStatusBarItem,
  removeFeatureFromSettingsJson,
  checkFeatureInSettingsJson,
  parseCargoToml,
  sanitizeTomlFile,
  ignoreCommentedOutMember,
  readSettings,
  writeSettings,
  checkSettingsJson,
};
