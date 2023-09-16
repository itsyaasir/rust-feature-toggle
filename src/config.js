const vscode = require('vscode');
const fs = require('fs');
const toml = require('toml');
const path = require('path');

const {
  getCargoTomlPath,
  parseCargoToml,
  ignoreCommentedOutMember,
  sanitizeTomlFile,
} = require('./toml');

/**
 * Utility function to read settings from the configuration
 * @returns {vscode.WorkspaceConfiguration} - The configuration object.
 */
function readConfig() {
  return vscode.workspace.getConfiguration('rust-analyzer.cargo');
}

/**
 * Utility function to write values to the configuration
 * @param {string} settings
 * @returns {void}
 */
function writeConfig(settings) {
  const config = vscode.workspace.getConfiguration('rust-analyzer.cargo');
  const featureList = config.get('features');
  featureList.push(settings);
  config.update('features', featureList, vscode.ConfigurationTarget.Workspace);
}

/**
 * Adds a feature to the configuration
 * @param {string} feature - The feature to add.
 * @returns {void}
 */
function addFeatureToConfig(feature) {
  writeConfig(feature);
}

/**
 * Removes a feature from the configuration
 * @param {string} feature - The feature to remove.
 * @returns {void}
 */
function removeFeatureFromConfig(feature) {
  const config = readConfig();
  const featureList = config.get('features');
  const index = featureList.indexOf(feature);
  if (index > -1) {
    featureList.splice(index, 1);
  }
  config.update('features', featureList, vscode.ConfigurationTarget.Workspace);
}

/**
 * Checks if a feature is enabled in the configuration
 * @param {string} feature - The feature to check.
 * @returns {boolean} - True if the feature is enabled, false otherwise.
 */
function checkFeatureInConfig(feature) {
  const config = readConfig();
  const featureList = config.get('features');
  return featureList.includes(feature);
}

/**
 * Get the feature list from the configuration
 * @returns {Array<string>} - The list of features.
 */
function getFeatureListFromConfig() {
  const config = readConfig();
  return config.get('features');
}

/**
 * Get workspace folder path
 * @returns {string} - The workspace folder path.
 * @private
 */
function getWorkspaceFolderPath() {
  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

function updateConfig() {
  try {
    const featureList = getFeatureListFromConfig();
    const cargoTomlPath = getCargoTomlPath();
    const features = parseCargoToml(cargoTomlPath);
    const featuresFromCargoToml = Object.keys(features);

    const featuresToRemove = featureList.filter(
      (feature) => !featuresFromCargoToml.includes(feature)
    );

    featuresToRemove.forEach((feature) => {
      removeFeatureFromConfig(feature);
    });
  } catch (error) {
    console.log(error);
  }
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

module.exports = {
  addFeatureToConfig,
  removeFeatureFromConfig,
  checkFeatureInConfig,
  getFeatureListFromConfig,
  getWorkspaceFolderPath,
  updateConfig,
  getFeaturesFromWorkspaceMembers,
};
