const fs = require('fs');
const path = require('path');
const toml = require('toml');

const {
  getWorkspaceFolderPath,
  getFeaturesFromWorkspaceMembers,
} = require('./config');
/**
 * Retrieves the path to the Cargo.toml file in the current workspace.
 * @returns {string} - The path to the Cargo.toml file.
 */
function getCargoTomlPath() {
  return path.join(getWorkspaceFolderPath(), 'Cargo.toml');
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
