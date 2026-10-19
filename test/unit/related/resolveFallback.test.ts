import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	fallbackExcludeGlob,
	isVendorOrNodeModulesPath,
} from '../../../src/completion/related/resolveFallback';

describe('fallbackExcludeGlob', () => {
	it('excludes vendor when allowVendor is false', () => {
		assert.match(fallbackExcludeGlob(false), /vendor/);
	});

	it('allows vendor when allowVendor is true', () => {
		assert.doesNotMatch(fallbackExcludeGlob(true), /vendor/);
		assert.match(fallbackExcludeGlob(true), /\.git/);
	});
});

describe('isVendorOrNodeModulesPath', () => {
	it('detects vendor paths', () => {
		assert.ok(isVendorOrNodeModulesPath('/proj/vendor/laravel/framework/src/Model.php'));
	});

	it('detects node_modules paths', () => {
		assert.ok(isVendorOrNodeModulesPath('/proj/node_modules/foo/index.js'));
	});

	it('ignores app paths', () => {
		assert.ok(!isVendorOrNodeModulesPath('/proj/app/Models/Product.php'));
	});
});
