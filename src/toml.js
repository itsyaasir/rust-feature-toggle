const fs = require('fs');
const path = require('path');
const toml = require('toml');
const vscode = require('vscode');
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
        vscode.workspace.workspaceFolders[0].uri.fsPath,
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
 * Retrieves the path to the Cargo.toml file in the current workspace.
 * @returns {string} - The path to the Cargo.toml file.
 */
function getCargoTomlPath() {
  return path.join(
    vscode.workspace.workspaceFolders[0].uri.fsPath,
    'Cargo.toml'
  );
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

module.exports = {
  getCargoTomlPath,
  parseCargoToml,
  sanitizeTomlFile,
  ignoreCommentedOutMember,
};
