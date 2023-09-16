const vscode = require('vscode');
const { getCargoTomlPath, parseCargoToml } = require('./toml');

class ConfigManager {
  constructor() {
    this.config = vscode.workspace.getConfiguration('rust-analyzer.cargo');
  }

  getFeatureList() {
    return this.config.get('features');
  }

  /**
   * Add feature to the list of features
   * @param {string} feature
   */
  addFeature(feature) {
    const featureList = this.getFeatureList();
    featureList.push(feature);
    this.updateFeatures(featureList);
  }

  /**
   * Remove feature from the list of configured features
   * @param {string} feature
   */
  removeFeature(feature) {
    const featureList = this.getFeatureList();
    const index = featureList.indexOf(feature);
    if (index > -1) {
      featureList.splice(index, 1);
      this.updateFeatures(featureList);
    }
  }

  /**
   * Check if feature is in the list of configured features
   * @param {string} feature
   */
  checkFeature(feature) {
    const featureList = this.getFeatureList();
    return featureList.includes(feature);
  }

  /**
   * @param {any} featureList
   */
  updateFeatures(featureList) {
    this.config.update(
      'features',
      featureList,
      vscode.ConfigurationTarget.Workspace
    );
  }
}

/**
 * Remove features from the list of configured features if they are not present in Cargo.toml
 * @returns {void}
 * @throws {Error}
 */
function updateConfig() {
  try {
    const configManager = new ConfigManager();
    const featureList = configManager.getFeatureList();
    const cargoTomlPath = getCargoTomlPath();
    const features = parseCargoToml(cargoTomlPath);
    const featuresFromCargoToml = Object.keys(features);

    const featuresToRemove = featureList.filter(
      (/** @type {string} */ feature) =>
        !featuresFromCargoToml.includes(feature)
    );

    featuresToRemove.forEach((/** @type {any} */ feature) => {
      configManager.removeFeature(feature);
    });
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  updateConfig,
  ConfigManager,
};
