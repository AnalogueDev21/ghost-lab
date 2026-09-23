import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canReceiveOrderAlerts,
  orderAlertDayKey,
  shouldOpenOrderAlert,
} from '../recovered-production/assets/order-notifications.js'

test('restaurant CEO and staff receive order alerts only for the chill branch', () => {
  assert.equal(canReceiveOrderAlerts({ role: 'ceo', branches: { key: 'chill' } }), true)
  assert.equal(canReceiveOrderAlerts({ role: 'chill_staff', branches: { key: 'chill' } }), true)
  assert.equal(canReceiveOrderAlerts({ role: 'ceo', branches: { key: 'garage' } }), false)
  assert.equal(canReceiveOrderAlerts({ role: 'mechanic', branches: { key: 'garage' } }), false)
  assert.equal(canReceiveOrderAlerts({ role: 'owner' }), true)
})

test('alert opens initially and reopens only when another order arrives', () => {
  assert.equal(shouldOpenOrderAlert({ count: 2, previousCount: 0, dismissedCount: 0 }), true)
  assert.equal(shouldOpenOrderAlert({ count: 2, previousCount: 2, dismissedCount: 2 }), false)
  assert.equal(shouldOpenOrderAlert({ count: 3, previousCount: 2, dismissedCount: 2 }), true)
})

test('mute and kitchen page suppress the alert without affecting the badge count', () => {
  assert.equal(shouldOpenOrderAlert({ count: 4, previousCount: 0, dismissedCount: 0, muted: true }), false)
  assert.equal(shouldOpenOrderAlert({ count: 4, previousCount: 0, dismissedCount: 0, onKitchenPage: true }), false)
})

test('Bangkok day key is stable and suitable for daily mute storage', () => {
  assert.match(orderAlertDayKey(), /^\d{4}-\d{2}-\d{2}$/)
})
