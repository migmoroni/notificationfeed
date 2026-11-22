import assert from 'node:assert/strict';
import { hash } from './lib.mjs';

export function receiptChecks(receipt, content, current, registry, allowHistorical = false) {
	assert.deepEqual(JSON.parse(content), receipt, 'Recibo em memória difere do arquivo.');
	if (JSON.stringify(receipt.expectedChecks) === JSON.stringify(current)) return current;
	assert.equal(allowHistorical, true, 'Recibo antigo não aprova o novo fechamento.');
	const approved = registry.approvals.find((entry) => entry.sha256 === hash(content));
	assert.ok(approved, 'Recibo histórico sem hash de aprovação registrado.');
	assert.equal(approved.phase, receipt.phase);
	assert.equal(approved.unit, receipt.unit);
	assert.deepEqual(receipt.expectedChecks, approved.checks);
	return approved.checks;
}
