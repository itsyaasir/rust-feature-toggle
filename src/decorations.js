/**
 * @param {import('vscode').TextDocument} document
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

module.exports = {
  getFeatureLines,
};
