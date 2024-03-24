const path = require('path');
const vscode = require('vscode');
const { ConfigManager } = require('./config');
const { parseCargoToml, getCargoTomlPath, extractParsedCargoToml } = require('./toml');


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
 * Gets the lines from the [features] section of the Cargo.toml file
 *
 * Parses the given document text to extract the lines between the [features]
 * section header and the next section header. Returns an array of trimmed
 * non-comment lines.
 *
 * @param {import('vscode').TextDocument | any} document - The document to parse
 * @returns {string[]} Array of feature line strings
 */
function getFeatureLines(document) {
  const lines = document.getText().split('\n');
  const startIndex = lines.findIndex(
    (/** @type {string} */ line) => line.trim() === '[features]'
  );
  if (startIndex !== -1) {
    const endIndex = lines.findIndex(
      (/** @type {string} */ line, /** @type {number} */ index) =>
        index > startIndex && line.startsWith('[')
    );
    return lines
      .slice(startIndex + 1, endIndex !== -1 ? endIndex : lines.length)
      .map((/** @type {string} */ line) => line.trim())
      .filter((/** @type {string} */ line) => line && !line.startsWith('#'));
  }
  return [];
}


/**
 * Generates decorations for features in the editor based on the given feature list and lines.
 *
 * Loops through each feature line, extracts the feature name, checks if it is in the given
 * feature list, and if so generates a decoration with the feature's enabled/disabled state.
 *
 * @param {vscode.TextEditor | any} editor - The editor to decorate
 * @param {string[]} featureList - List of features to check for
 * @param {string[]} featureLines - Lines from Cargo.toml with feature names
 * @returns {Object[]} Decorations to apply
 */
function generateDecorations(editor, featureList, featureLines) {
  const config = new ConfigManager();
  const decorations = [];
  const documentText = editor.document.getText();
  const featureMap = new Map(featureList.map(feature => [feature, true]));

  for (const line of featureLines) {
    const equalIndex = line.indexOf('=');
    if (equalIndex !== -1) {
      const featureName = line.slice(0, equalIndex).trim();
      if (featureMap.has(featureName)) {
        const lineStart = documentText.indexOf(line);
        const startPosition = editor.document.positionAt(lineStart);
        const endPosition = startPosition.translate(0, featureName.length);
        const range = new vscode.Range(startPosition, endPosition);
        const isEnabled = config.checkFeature(featureName);

        decorations.push({
          range,
          hoverMessage: isEnabled ? 'Feature enabled' : 'Feature disabled',
          renderOptions: isEnabled ? checkedBox : uncheckedBox,
        });
      }
    }
  }

  return decorations;
}


/**
 * Draws decorations for Rust features in the active Cargo.toml file.
 *
 * Parses the Cargo.toml file to extract feature names and lines. Generates
 * decorations based on these and sets them on the editor.
 */
function drawDecorations() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  if (!editor.document.fileName.endsWith('Cargo.toml')) {
    return;
  }

  const contents = parseCargoToml(getCargoTomlPath());
  const features = extractParsedCargoToml(contents);
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
