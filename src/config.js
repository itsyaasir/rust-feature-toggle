const vscode = require('vscode');

const { getCargoTomlPath, parseCargoToml } = require('./toml');

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

module.exports = {
  addFeatureToConfig,
  removeFeatureFromConfig,
  checkFeatureInConfig,
  getFeatureListFromConfig,
  updateConfig,
};
