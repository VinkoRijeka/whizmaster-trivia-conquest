import { describe, it } from 'vitest';
import { classifyAction, openActivation, type ActionRequest } from './IMPL_A3_002_ACTION_CLASSIFICATION_AND_ACTIVATION_CORE.js';
import { initializeMatchState } from './IMPL_A3_001_P0_DOMAIN_STATE_AND_INVARIANT_CORE.js';
import { createP0TestFixture } from './test-fixtures/p0TestFixture.js';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(message); }
function state(level3 = false) { return initializeMatchState(createP0TestFixture({ level3 })); }
function request(overrides: Partial<ActionRequest> = {}): ActionRequest { const matchState = state(); const opened = openActivation(matchState, 'playerA', 'unit_a1', 'activation-1'); if (!opened.accepted || !opened.activation) throw new Error('activation fixture failed'); return { matchState, playerId: 'playerA', unitId: 'unit_a1', targetTileId: 't_a_west', activation: opened.activation, ...overrides }; }
describe('IMPL-A3-002 activation and action classification', () => {
  it('opens activation only for active Player and available owned Unit', () => { const result = openActivation(state(), 'playerA', 'unit_a1', 'activation-1'); assert(result.accepted, 'activation should open'); });
  it('classifies own empty adjacent target as Move', () => { const result = classifyAction(request()); assert(result.actionType === 'Move' && !result.requiresQuestion, 'expected Move'); });
  it('classifies neutral target as Conquer with question', () => { const result = classifyAction(request({ targetTileId: 't_center' })); assert(result.actionType === 'Conquer' && result.requiresQuestion, 'expected Conquer'); });
  it('classifies opponent occupied target as Attack with Duel', () => { const result = classifyAction(request({ targetTileId: 't_b_home' })); assert(result.actionType === 'Attack' && result.requiresDuel, 'expected Attack'); });
  it('classifies explicit Rest', () => { const result = classifyAction(request({ targetTileId: undefined, requestedAction: 'Rest' })); assert(result.actionType === 'Rest' && result.isFinalStep, 'expected Rest'); });
  it('rejects client-forced action type', () => { const result = classifyAction(request({ requestedAction: 'Attack' })); assert(result.classificationStatus === 'Rejected' && result.rejectionReason === 'CLIENT_ACTION_TYPE_NOT_ALLOWED', 'expected rejection'); });
  it('does not mutate MatchState', () => { const input = request(); const before = JSON.stringify(input.matchState); classifyAction(input); assert(JSON.stringify(input.matchState) === before, 'classification must be pure'); });
  it('allows Level 3 second-step context only after Move', () => { const matchState = state(true); const opened = openActivation(matchState, 'playerA', 'unit_a3', 'activation-3'); if (!opened.accepted || !opened.activation) throw new Error('activation fixture failed'); const second = classifyAction({ matchState, playerId: 'playerA', unitId: 'unit_a3', targetTileId: 't_center', activation: { ...opened.activation, stepIndex: 2, previousStepAction: 'Move', movedOnPreviousStep: true } }); assert(second.classificationStatus === 'Classified', 'expected second step classification'); });
});
