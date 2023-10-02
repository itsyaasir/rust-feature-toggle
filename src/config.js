const vscode = require('vscode');
const { getCargoTomlPath, parseCargoToml } = require('./toml');

class ConfigManager {
  constructor() {
    this.config = vscode.workspace.getConfiguration('rust-analyzer.cargo');
  }

  getFeatureList() {
    const features = this.config.get('features');
    return features === 'all' ? ['all'] : features;
  }

  /**
   * Add feature to the list of features
   * @param {string} feature
   */
  addFeature(feature) {
    if (feature === 'all') {
      this.activateAllFeatures();
      return;
    }

    const featureList = this.getFeatureList();
    if (featureList.includes('all')) {
      vscode.window.showInformationMessage(
        'Cannot add individual features when all features are activated'
      );
      return;
    }

    featureList.push(feature);
    this.updateFeatures(featureList);
  }

  /**
   * Remove feature from the list of configured features
   * @param {string} feature
   */
  removeFeature(feature) {
    if (feature === 'all' || this.getFeatureList().includes('all')) {
      this.updateFeatures([]);
      return;
    }

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
    const featureList = this.config.get('features');
    return (
      featureList === 'all' ||
      (Array.isArray(featureList) && featureList.includes(feature))
    );
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

  /** Activate all features
   *
   */
  activateAllFeatures() {
    this.config.update('features', 'all', vscode.ConfigurationTarget.Workspace);
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
    if (featureList.includes('all')) {
      // If 'all' feature is active, do not remove any features
      return;
    }

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
