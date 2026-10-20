import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	addApprovedHostPure,
	getApprovedHosts,
	hostFromBaseUrl,
	HostTrustService,
	removeApprovedHostPure,
} from '../../../src/security/hostTrust';

function memento(initial: Record<string, unknown> = {}): {
	get: <T>(key: string, defaultValue: T) => T;
	update: (key: string, value: unknown) => Promise<void>;
	store: Record<string, unknown>;
} {
	const store = { ...initial };
	return {
		store,
		get<T>(key: string, defaultValue: T): T {
			return (store[key] as T) ?? defaultValue;
		},
		async update(key: string, value: unknown): Promise<void> {
			store[key] = value;
		},
	};
}

describe('hostFromBaseUrl', () => {
	it('lowercases host', () => {
		assert.equal(hostFromBaseUrl('http://LOCALHOST:8080/v1'), 'localhost:8080');
	});
});

describe('approved host list helpers', () => {
	it('add and remove host', () => {
		let hosts = addApprovedHostPure([], 'example.com');
		hosts = addApprovedHostPure(hosts, 'Example.com');
		assert.deepEqual(hosts, ['example.com']);
		hosts = removeApprovedHostPure(hosts, 'example.com');
		assert.deepEqual(hosts, []);
	});
});

describe('HostTrustService', () => {
	it('returns true when host already approved', async () => {
		const mem = memento();
		mem.store['localAiAutocomplete.approvedHosts'] = ['127.0.0.1:1234'];
		const svc = new HostTrustService(mem as never);
		const ok = await svc.ensureHostApproved('http://127.0.0.1:1234/v1');
		assert.equal(ok, true);
	});

	it('prompts once and persists on approve', async () => {
		const mem = memento();
		let prompted = 0;
		const ui = {
			showWarningMessage: async () => {
				prompted++;
				return 'Approve';
			},
		};
		const svc = new HostTrustService(mem as never, ui);
		const ok = await svc.ensureHostApproved('http://newhost.test/v1');
		assert.equal(ok, true);
		assert.equal(prompted, 1);
		assert.deepEqual(getApprovedHosts(mem as never), ['newhost.test']);
	});

	it('session-denied host does not re-prompt', async () => {
		const mem = memento();
		let prompted = 0;
		const ui = {
			showWarningMessage: async () => {
				prompted++;
				return 'Cancel';
			},
		};
		const svc = new HostTrustService(mem as never, ui);
		assert.equal(await svc.ensureHostApproved('http://deny.test/v1'), false);
		assert.equal(await svc.ensureHostApproved('http://deny.test/v1'), false);
		assert.equal(prompted, 1);
	});

	it('revokeHost removes from list', async () => {
		const mem = memento();
		mem.store['localAiAutocomplete.approvedHosts'] = ['a.test', 'b.test'];
		const svc = new HostTrustService(mem as never);
		await svc.revokeHost('a.test');
		assert.deepEqual(getApprovedHosts(mem as never), ['b.test']);
	});
});
