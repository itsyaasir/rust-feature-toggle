const assert = require('assert');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require('vscode');
const myExtension = require('../../extension');
const sinon = require('sinon');

const fs = require('fs');
const { expect } = require('chai');

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');
  let sandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('Test getFeaturesFromWorkspaceMembers function', () => {
    // Here you would call getFeatureFlags with various inputs and check that the output is as expected
    const workspaceMembers = ['member1', 'member2', 'member3'];
    const fakeFsReadFileSync = sandbox.fake.returns(
      '[workspace]\nmembers = ["member1", "member2", "member3"]'
    );

    sandbox.replace(fs, 'readFileSync', fakeFsReadFileSync);

    const result =
      myExtension.getFeaturesFromWorkspaceMembers(workspaceMembers);

    expect(result).to.deep.equal({});

    assert.strictEqual(fakeFsReadFileSync.callCount, 3);
  });
});
