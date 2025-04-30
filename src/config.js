const vscode = require('vscode');
const { getCargoTomlPath, parseCargoToml, extractParsedCargoToml } = require('./toml-parser');

class ConfigManager {
  constructor() {
    this.config = vscode.workspace.getConfiguration('rust-analyzer.cargo');
    this.featureSet = new Set(this.getFeatureList());
  }

  /**
   * @returns {Array<string>}
   *
   */
  getFeatureList() {
    const features = this.config.get('features');
    return features === 'all' ? ['all'] : features;
  }

  /**
   * @param {string} feature
   */
  addFeature(feature) {
    if (feature === 'all') {
      this.activateAllFeatures();
      return;
    }

    if (this.featureSet.has('all')) {
      vscode.window.showInformationMessage(
        'Cannot add individual features when all features are activated'
      );
      return;
    }

    this.featureSet.add(feature);
    this.updateFeatures([...this.featureSet]);
  }

  /**
   * @param {string} feature
   */
  removeFeature(feature) {
    if (feature === 'all' || this.featureSet.has('all')) {
      this.updateFeatures([]);
      this.featureSet.clear();
      return;
    }

    this.featureSet.delete(feature);
    this.updateFeatures([...this.featureSet]);
  }

  /**
   * @param {string} feature
   */
  checkFeature(feature) {
    return this.featureSet.has('all') || this.featureSet.has(feature);
  }

  /**
   * @param {Iterable<string>} featureList
   */
  updateFeatures(featureList) {
    this.config.update(
      'features',
      featureList,
      vscode.ConfigurationTarget.Workspace
    );
    this.featureSet = new Set(featureList);
  }

  activateAllFeatures() {
    // Update the configuration to activate all features
    // but it is not array but string 'all'
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
    if (configManager.featureSet.has('all')) {
      return;
    }

    const cargoTomlPath = getCargoTomlPath();
    const parsed = parseCargoToml(cargoTomlPath);
    const features = extractParsedCargoToml(parsed);
    const featuresFromCargoToml = new Set(Object.keys(features));

    const featuresToRemove = [...configManager.featureSet].filter(
      feature => !featuresFromCargoToml.has(feature)
    );

    featuresToRemove.forEach(feature => {
      configManager.removeFeature(feature);
    });
  } catch (error) {
    console.error(error);
    vscode.window.showErrorMessage(
      'An error occurred while updating the configuration. Please check the logs for more information.'
    );
  }
}

module.exports = {
  updateConfig,
  ConfigManager,
};
