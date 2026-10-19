import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { discoverRelatedSymbolsInText } from '../../../src/completion/related/discover';

describe('discoverRelatedSymbolsInText', () => {
	it('finds implements types', () => {
		const refs = discoverRelatedSymbolsInText(
			'class Foo implements Bar, Baz {\n}\n'
		);
		const names = refs.map((r) => r.name).sort();
		assert.deepEqual(names, ['Bar', 'Baz']);
		assert.ok(refs.every((r) => r.kind === 'implements'));
	});

	it('finds extends types', () => {
		const refs = discoverRelatedSymbolsInText('class X extends Base {\n}\n');
		assert.equal(refs.length, 1);
		assert.equal(refs[0].name, 'Base');
		assert.equal(refs[0].kind, 'extends');
	});

	it('finds implements after extends (common in PHP/Java)', () => {
		const refs = discoverRelatedSymbolsInText(
			'class ProductModel extends Model implements ProductInterface {\n'
		);
		const names = refs.map((r) => r.name);
		assert.ok(names.includes('ProductInterface'));
		assert.ok(refs.some((r) => r.name === 'ProductInterface' && r.kind === 'implements'));
	});

	it('positions extends Model after the extends keyword, not inside the class name', () => {
		const line = 'class ProductModel extends Model implements ProductInterface {';
		const refs = discoverRelatedSymbolsInText(line + '\n');
		const model = refs.find((r) => r.name === 'Model' && r.kind === 'extends');
		assert.ok(model);
		const extendsIdx = line.indexOf('extends ');
		const modelIdx = line.indexOf('Model', extendsIdx);
		assert.equal(model!.position.character, modelIdx);
	});

	it('finds C#-style inheritance list', () => {
		const refs = discoverRelatedSymbolsInText('class X : I1, I2 {\n}\n');
		const names = refs.map((r) => r.name).sort();
		assert.deepEqual(names, ['I1', 'I2']);
		assert.ok(refs.every((r) => r.kind === 'inherits'));
	});
});
