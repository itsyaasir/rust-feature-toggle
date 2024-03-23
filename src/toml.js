const fs = require('fs');
const path = require('path');
const toml = require('toml');
const vscode = require('vscode');

/**
 * Extracts features from the workspace members defined in the Cargo.toml files.
 *
 * Loops through the workspace members and reads the Cargo.toml file at the given
 * path to parse out any defined features. Features are added to the returned
 * features object, namespaced by the workspace member name if not already
 * defined in the mainFeatures object.
 *
 * @param {Array<string>} workspaceMembers - The list of workspace members from the Cargo.toml file
 * @param {{ [x: string]: any; }} mainFeatures - Features already defined for the workspace
 * @returns {Object} - The aggregated features from all workspace members
 */
function getFeaturesFromWorkspaceMembers(workspaceMembers, mainFeatures) {
  const features = {};

  if (!vscode.workspace.workspaceFolders) {
    return features;
  }

  workspaceMembers.forEach((member) => {
    if (!ignoreCommentedOutMember(member)) {
      const cargoTomlPath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        member,
        'Cargo.toml'
      );
      try {
        const contents = fs.readFileSync(cargoTomlPath, 'utf8');
        const parsed = toml.parse(contents);
        if (parsed.features) {
          for (const [feature, value] of Object.entries(parsed.features)) {
            // Check if the feature already exists in mainFeatures
            if (mainFeatures[feature]) {
              // If it does, use the original feature name
              features[feature] = value;
            } else {
              features[`${member}.${feature}`] = value;
            }
          }
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
 * Parses the Cargo.toml file at the given file path.
 *
 * @param {string} filePath - The path to the Cargo.toml file
 * @returns {Object} - The parsed contents of the Cargo.toml file
 */
function parseCargoToml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const parsed = toml.parse(content);
  return parsed;
}

/**
 * Extracts the feature list from a parsed Cargo.toml object
 * @param {Object} parsedCargoToml - The object representing the parsed Cargo.toml file
 * @returns {Object} - The extracted feature list
 */
function extractParsedCargoToml(parsedCargoToml) {
  const features = {};
  if (parsedCargoToml.features) {
    Object.assign(features, parsedCargoToml.features);
  }

  if (parsedCargoToml.workspace && parsedCargoToml.workspace.members) {
    const workspaceFeatures = getFeaturesFromWorkspaceMembers(
      parsedCargoToml.workspace.members,
      features
    );
    Object.assign(features, workspaceFeatures);
  }

  return features;
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
  getFeaturesFromWorkspaceMembers,
  ignoreCommentedOutMember,
  extractParsedCargoToml,
};
