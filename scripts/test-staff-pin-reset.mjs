import assert from 'node:assert/strict'
import test from 'node:test'

import { canManagePinResets } from '../recovered-production/assets/staff-pin-reset.js'

test('only active Owner and GOD accounts can manage PIN resets', () => {
  assert.equal(canManagePinResets({ role: 'owner', active: true }), true)
  assert.equal(canManagePinResets({ role: 'god', active: true }), true)
  assert.equal(canManagePinResets({ role: 'owner', active: false }), false)
  assert.equal(canManagePinResets({ role: 'ceo', active: true }), false)
  assert.equal(canManagePinResets(null), false)
})
