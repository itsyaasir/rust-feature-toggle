const path = require('path');
const vscode = require('vscode');
const { ConfigManager } = require('./config');
const { parseCargoToml, getCargoTomlPath } = require('./toml');

const BASE_PATH = path.join(__filename, '..', '..', 'assets');

const checkedBox = createDecorationType('checked');
const uncheckedBox = createDecorationType('unchecked');

/**
 * Helper function to create a decoration type
 * @param {string} icon
 * @returns {vscode.TextEditorDecorationType}
 */
function createDecorationType(icon) {
  const iconPath = (/** @type {string} */ partialPath) =>
    path.join(BASE_PATH, partialPath);

  return vscode.window.createTextEditorDecorationType({
    gutterIconSize: 'contain',
    dark: { gutterIconPath: iconPath(`${icon}_light.svg`) },
    light: { gutterIconPath: iconPath(`${icon}_dark.svg`) },
  });
}

/**
 * Get the lines from the [features] section of the Cargo.toml file
 * @param {import('vscode').TextDocument | any} document
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
 * Generate decorations for the features in the Cargo.toml file
 * If the feature is enabled, the decoration will be a checked box
 * If the feature is disabled, the decoration will be an unchecked box
 * @param {vscode.TextEditor | any} editor
 * @param {string | any[]} featureList
 * @param {any[]} featureLines
 * @returns {vscode.DecorationOptions[]}
 */
function generateDecorations(editor, featureList, featureLines) {
  const config = new ConfigManager();
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
        const isEnabled = config.checkFeature(trimmedFeatureName);

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

/**
 * Draw decorations for the features in the Cargo.toml file
 * @returns {void}
 *
 */
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

  const setDecorations = (
    /** @type {vscode.TextEditorDecorationType} */ decorationType,
    /** @type {vscode.DecorationOptions[]} */ decorations
  ) => {
    editor.setDecorations(
      decorationType,
      decorations.filter((deco) => deco.renderOptions === decorationType)
    );
  };

  setDecorations(checkedBox, decorations);
  setDecorations(uncheckedBox, decorations);
}

module.exports = {
  getFeatureLines,
  createDecorationType,
  drawDecorations,
  generateDecorations
};
