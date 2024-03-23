const assert = require('assert');
const vscode = require('vscode');
const sinon = require('sinon');
const { getFeatureLines, generateDecorations } = require('../../src/decorations');
const { ConfigManager } = require('../../src/config');


suite('Decorations', () => {
    let sandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getFeatureLines should return feature lines from Cargo.toml', () => {
        const document = {
            getText: () => `
        [package]
        name = "my-package"

        [features]
        feature1 = []
        feature2 = []
        # comment
        feature3 = []
        `,
        };


        const featureLines = getFeatureLines(document);

        assert.deepStrictEqual(featureLines, ['feature1 = []', 'feature2 = []', 'feature3 = []']);
    });

    test('getFeatureLines should return empty array if no features section', () => {
        const document = {
            getText: () => `
        [package]
        name = "my-package"
        `,
        };

        const featureLines = getFeatureLines(document);

        assert.deepStrictEqual(featureLines, []);
    });


    test('generateDecorations should generate decorations for enabled and disabled features', () => {
        const editor = {
            document: {
                getText: () => `
            [features]
            feature1 = []
            feature2 = []
        `,
                positionAt: () => new vscode.Position(0, 0),
            },
        };
        const featureList = ['feature1', 'feature2'];
        const featureLines = ['feature1 = []', 'feature2 = []'];

        sandbox.stub(ConfigManager.prototype, 'checkFeature').callsFake((feature) => feature === 'feature1');

        const decorations = generateDecorations(editor, featureList, featureLines);

        assert.strictEqual(decorations.length, 2);
        assert.strictEqual(decorations[0].hoverMessage, 'Feature enabled');
        assert.strictEqual(decorations[1].hoverMessage, 'Feature disabled');
    });

});
