const vscode = require('vscode');
const path = require('path');
const { checkFeatureInConfig } = require('./config');
const { parseCargoToml, getCargoTomlPath } = require('./toml');

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

module.exports = {
  drawDecorations,
  updateSvgPaths,
  checkedBox,
  uncheckedBox,
  getFeatureLines,
  generateDecorations,
  checked_svgPath,
  unchecked_svgPath,
  updateDecorationTypes,
};
