const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const { ConfigManager } = require('../../src/config');

suite('ConfigManager Test Suite', () => {
    let sandbox;
    let configManager;
    let workspaceConfigMock;

    setup(() => {
        sandbox = sinon.createSandbox();
        workspaceConfigMock = {
            get: sandbox.stub(),
            update: sandbox.stub(),
            inspect: sandbox.stub(),
            has: sandbox.stub(),
        };
        sandbox
            .stub(vscode.workspace, 'getConfiguration')
            .returns(workspaceConfigMock);
        configManager = new ConfigManager();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getFeatureList returns "all" when configured so', () => {
        workspaceConfigMock.get.withArgs('features').returns('all');
        assert.deepStrictEqual(configManager.getFeatureList(), ['all']);
    });

    test('getFeatureList returns an array of features', () => {
        workspaceConfigMock.get
            .withArgs('features')
            .returns(['feature1', 'feature2']);
        assert.deepStrictEqual(configManager.getFeatureList(), [
            'feature1',
            'feature2',
        ]);
    });

    test('addFeature adds a feature to the list', () => {
        workspaceConfigMock.get.withArgs('features').returns(['feature1']);
        configManager.addFeature('feature2');
        assert(
            workspaceConfigMock.update.calledWith(
                'features',
                ['feature1', 'feature2'],
                vscode.ConfigurationTarget.Workspace
            )
        );
    });

    test('removeFeature removes a feature from the list', () => {
        workspaceConfigMock.get
            .withArgs('features')
            .returns(['feature1', 'feature2']);
        configManager.removeFeature('feature2');
        assert(
            workspaceConfigMock.update.calledWith(
                'features',
                ['feature1'],
                vscode.ConfigurationTarget.Workspace
            )
        );
    });

    test('checkFeature returns true if feature is in the list', () => {
        workspaceConfigMock.get
            .withArgs('features')
            .returns(['feature1', 'feature2']);
        assert.strictEqual(configManager.checkFeature('feature2'), true);
    });

    test('checkFeature returns false if feature is not in the list', () => {
        workspaceConfigMock.get.withArgs('features').returns(['feature1']);
        assert.strictEqual(configManager.checkFeature('feature2'), false);
    });

    test('activateAllFeatures sets features to "all"', () => {
        configManager.activateAllFeatures();
        assert(
            workspaceConfigMock.update.calledWith(
                'features',
                'all',
                vscode.ConfigurationTarget.Workspace
            )
        );
    });


});
