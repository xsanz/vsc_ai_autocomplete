import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { discoverFileImportsInText } from '../../../src/completion/related/discoverImports';

describe('discoverFileImportsInText', () => {
	it('finds PHP use lines', () => {
		const refs = discoverFileImportsInText(
			'<?php\nuse App\\Models\\Product;\nuse Illuminate\\Database\\Eloquent\\Model;\n'
		);
		const names = refs.map((r) => r.name).sort();
		assert.deepEqual(names, ['Model', 'Product']);
		assert.ok(refs.every((r) => r.kind === 'import'));
	});

	it('finds PHP use alias', () => {
		const refs = discoverFileImportsInText('use Foo\\Bar as Baz;\n');
		assert.equal(refs.length, 1);
		assert.equal(refs[0].name, 'Baz');
	});

	it('skips PHP use function', () => {
		const refs = discoverFileImportsInText('use function array_map;\n');
		assert.equal(refs.length, 0);
	});

	it('finds TS import from', () => {
		const refs = discoverFileImportsInText(
			"import { Foo, Bar as B } from './lib';\n"
		);
		const names = refs.map((r) => r.name).sort();
		assert.deepEqual(names, ['B', 'Foo']);
	});

	it('finds Java import', () => {
		const refs = discoverFileImportsInText('import com.example.MyType;\n');
		assert.equal(refs[0].name, 'MyType');
	});
});
