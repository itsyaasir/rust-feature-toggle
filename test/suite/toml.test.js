const assert = require('assert');
const { getCargoTomlPath, parseCargoToml, sanitizeCargoToml, getFeaturesFromWorkspaceMembers } = require('../../src/toml');
const sinon = require('sinon');
const vscode = require('vscode');
const fs = require('fs');
const { describe, test, beforeEach, afterEach } = require('mocha');

describe('TOML Utility Tests', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: { fsPath: 'fake/path/to/workspace' },
                name: 'workspace',
            }
        ]);
    });

    afterEach(() => {
        sandbox.restore();
    });


    test('parseCargoToml test scenario 1', () => {
        const cargoPath = 'fake/path/to/Cargo.toml';
        sandbox
            .stub(fs, 'readFileSync')
            .returns(
                '[package]\nname = "my-package"\n\n[dependencies]\nrand = "0.8.3"'
            );

        const result = parseCargoToml(cargoPath);

        let expected = {
            package: { name: 'my-package' },
            dependencies: { rand: '0.8.3' }
        };
        assert.deepEqual(result, expected);
    });

    test("parseCargoToml test scenario 2", () => {
        const cargoPath = 'fake/path/to/Cargo.toml';
        sandbox
            .stub(fs, 'readFileSync')
            .returns(
                '[package]\nname = "my-package"\n\n[dependencies]\nrand = "0.8.3"\n\n[features]\nfeature1 = []\nfeature2 = []\n\n[workspace]\nmembers = ["member1", "member2"]'
            );
        const result = parseCargoToml(cargoPath);
        let expected = {
            package: { name: 'my-package' },
            dependencies: { rand: '0.8.3' },
            features: { feature1: [], feature2: [] },
            workspace: { members: ['member1', 'member2'] }
        };
        assert.deepEqual(result, expected);

    });

    test('getCargoTomlPath returns the path to the Cargo.toml file', () => {
        const workspaceFolders = [
            { uri: vscode.Uri.file('fake/path/to/workspace1') },
            { uri: vscode.Uri.file('fake/path/to/workspace2') },
        ];
        sandbox
            .stub(vscode.workspace, 'workspaceFolders')
            .get(() => workspaceFolders);

        const result = getCargoTomlPath();
        assert.strictEqual(result, '/fake/path/to/workspace1/Cargo.toml');

        sandbox
            .stub(vscode.workspace, 'workspaceFolders')
            .get(() => [workspaceFolders[0]]);

        const result2 = getCargoTomlPath();
        assert.strictEqual(result2, '/fake/path/to/workspace1/Cargo.toml');
    });

    test('getFeaturesFromWorkspaceMembers returns features from all workspace members', () => {
        const workspaceMembers = ['member1', 'member2', 'member3'];
        const mainFeatures = { feature1: [], feature2: [] };

        sandbox
            .stub(fs, 'readFileSync')
            .onFirstCall()
            .returns('[features]\nfeature1 = []\nfeature3 = []')
            .onSecondCall()
            .returns('[features]\nfeature2 = []\nfeature4 = []')
            .onThirdCall()
            .returns('# [features]\n# feature5 = []');

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: {
                    fsPath: '/path/to/workspace',
                },
            },
        ]);

        const result = getFeaturesFromWorkspaceMembers(
            workspaceMembers,
            mainFeatures
        );

        let expected = {
            feature1: [],
            feature2: [],
            'member1.feature3': [],
            'member2.feature4': [],
        };
        assert.deepEqual(result, expected);
    });

    test('getFeaturesFromWorkspaceMembers returns empty object when no workspace members', () => {
        const workspaceMembers = [];
        const mainFeatures = {};

        const result = getFeaturesFromWorkspaceMembers(
            workspaceMembers,
            mainFeatures
        );

        assert.deepEqual(result, {});
    });

    test('getFeaturesFromWorkspaceMembers handles error when reading Cargo.toml', () => {
        const workspaceMembers = ['member1'];
        const mainFeatures = {};

        sandbox.stub(fs, 'readFileSync').throws('Error reading file');

        const result = getFeaturesFromWorkspaceMembers(
            workspaceMembers,
            mainFeatures
        );

        assert.deepEqual(result, {});
    });

    test('getFeaturesFromWorkspaceMembers ignores commented out members', () => {
        const workspaceMembers = ['member1', '#member2', '#member3'];
        const mainFeatures = {};

        sandbox
            .stub(fs, 'readFileSync')
            .onFirstCall()
            .returns('[features]\nfeature1 = []\nfeature3 = []')
            .onSecondCall()
            .returns('[features]\nfeature2 = []\nfeature4 = []')
            .onThirdCall()
            .returns('# [features]\n# feature5 = []');

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: {
                    fsPath: '/path/to/workspace/member1',
                },
                name: 'member1',
            },
            {
                uri: {
                    fsPath: '/path/to/workspace/member2',
                },
                name: 'member2',
            },
            {
                uri: {
                    fsPath: '/path/to/workspace/member3',
                },
                name: 'member3',
            }
        ]);
        const result = getFeaturesFromWorkspaceMembers(
            workspaceMembers,
            mainFeatures
        );

        let expected = {
            'member1.feature1': [],
            'member1.feature3': [],
        };

        assert.deepEqual(result, expected);

        sandbox.restore();

        sandbox
            .stub(fs, 'readFileSync')
            .onFirstCall()
            .returns('# [features]\n# feature1 = []\n# feature3 = []')
            .onSecondCall()
            .returns('# [features]\n# feature2 = []\n# feature4 = []')
            .onThirdCall()
            .returns('# [features]\n# feature5 = []');

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: {
                    fsPath: '/path/to/workspace/member1',
                },
                name: 'member1',
            },
            {
                uri: {
                    fsPath: '/path/to/workspace/member2',
                },
                name: 'member2',
            },
            {
                uri: {
                    fsPath: '/path/to/workspace/member3',
                },
                name: 'member3',
            }
        ]);

        const result2 = getFeaturesFromWorkspaceMembers(
            workspaceMembers,
            mainFeatures
        );

        assert.deepEqual(result2, {});

    });

    test('sanitizeCargoToml sanitizes correctly', () => {
        const cargoToml =
            '[package]\nname = "my-package"\n\n[dependencies]\nrand = "0.8.3"\n\n[features]\nfeature1 = []\nfeature2 = []\n\n[workspace]\nmembers = ["member1", "member2"]';

        const result = sanitizeCargoToml(cargoToml);

        let expected =
            '[package]\nname = "my-package"\n\n[dependencies]\nrand = "0.8.3"\n\n[features]\nfeature1 = []\nfeature2 = []\n\n[workspace]\nmembers = ["member1", "member2"]';

        assert.strictEqual(result, expected);
    });


    test('sanitizeCargoToml sanitizes incorrect toml incorrectly', () => {
        const cargoToml =
            '[package]\nname = "my-package"\n version.workspace = true\n\n[dependencies]\nrand = "0.8.3"\n\n[features]\nfeature1 = []\nfeature2 = []\n\n[workspace]\nmembers = ["member1", "member2"]';

        const result = sanitizeCargoToml(cargoToml);

        let expected =
            "[package]\nname = \"my-package\"\n version = { workspace = true }\n\n[dependencies]\nrand = \"0.8.3\"\n\n[features]\nfeature1 = []\nfeature2 = []\n\n[workspace]\nmembers = [\"member1\", \"member2\"]";

        assert.strictEqual(result, expected);
    });
});
