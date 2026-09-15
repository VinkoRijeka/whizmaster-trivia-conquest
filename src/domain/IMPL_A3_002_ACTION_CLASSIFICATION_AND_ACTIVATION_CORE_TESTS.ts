import { describe, it } from 'vitest';
import { classifyAction, openActivation, type ActionRequest } from './IMPL_A3_002_ACTION_CLASSIFICATION_AND_ACTIVATION_CORE.js';
import { initializeMatchState, type TestFixtureInput } from './IMPL_A3_001_P0_DOMAIN_STATE_AND_INVARIANT_CORE.js';

const adjacency: Record<string, string[]> = {
  t_center: ['t_a_home', 't_b_home', 't_a_north', 't_b_north', 't_a_west', 't_b_east'],
  t_a_home: ['t_center', 't_a_west', 't_a_north', 't_block_a', 't_edge_a'],
  t_a_west: ['t_a_home', 't_center', 't_edge_a'],
  t_a_north: ['t_a_home', 't_center'],
  t_b_home: ['t_center', 't_b_east', 't_b_north', 't_edge_b'],
  t_b_east: ['t_b_home', 't_center'],
  t_b_north: ['t_b_home', 't_center'],
  t_block_a: ['t_a_home'],
  t_edge_a: ['t_a_home', 't_a_west'],
  t_edge_b: ['t_b_home'],
};

const fixture: TestFixtureInput = {
  fixtureId: 'p0-test-core-001', rulesetVersion: 'P0-baseline-candidate', matchId: 'match-test-001', initialPlayer: 'playerA',
  tiles: [
    ['t_center', 'neutral', 'empty', null, 2], ['t_a_home', 'playerA', 'occupied', 'unit_a1', 1], ['t_a_west', 'playerA', 'empty', null, 1], ['t_a_north', 'playerA', 'occupied', 'unit_a3', 1],
    ['t_b_home', 'playerB', 'occupied', 'unit_b1', 1], ['t_b_east', 'playerB', 'occupied', 'unit_b2', 1], ['t_b_north', 'playerB', 'occupied', 'unit_b3', 2], ['t_block_a', 'playerA', 'occupied', 'unit_a2', 1], ['t_edge_a', 'playerA', 'empty', null, 1], ['t_edge_b', 'playerB', 'empty', null, 1],
  ].map(([tileId, ownership, occupancy, occupantUnitId, difficultyLevel]) => ({ tileId, ownership, occupancy, occupantUnitId, neighborTileIds: adjacency[tileId], difficultyLevel, isTestOnly: true })),
  units: [
    { unitId: 'unit_a1', ownerPlayerId: 'playerA', currentTileId: 't_a_home', level: 1, developmentPoints: 0, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_a2', ownerPlayerId: 'playerA', currentTileId: 't_block_a', level: 1, developmentPoints: 0, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_a3', ownerPlayerId: 'playerA', currentTileId: 't_a_north', level: 3, developmentPoints: 10, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_b1', ownerPlayerId: 'playerB', currentTileId: 't_b_home', level: 1, developmentPoints: 0, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_b2', ownerPlayerId: 'playerB', currentTileId: 't_b_east', level: 1, developmentPoints: 0, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_b3', ownerPlayerId: 'playerB', currentTileId: 't_b_north', level: 2, developmentPoints: 5, status: 'active', roundAvailability: 'available' },
  ],
};

function state() { return initializeMatchState(fixture); }
function assert(condition: boolean, message: string): void { if (!condition) throw new Error(message); }
function request(overrides: Partial<ActionRequest> = {}): ActionRequest {
  const matchState = state();
  const opened = openActivation(matchState, 'playerA', 'unit_a1', 'activation-1');
  if (!opened.accepted || !opened.activation) throw new Error('activation fixture failed');
  return { matchState, playerId: 'playerA', unitId: 'unit_a1', targetTileId: 't_a_west', activation: opened.activation, ...overrides };
}

describe('IMPL-A3-002 activation and action classification', () => {
  it('opens activation only for active Player and available owned Unit', () => { const result = openActivation(state(), 'playerA', 'unit_a1', 'activation-1'); assert(result.accepted, 'activation should open'); });
  it('classifies own empty adjacent target as Move', () => { const result = classifyAction(request()); assert(result.actionType === 'Move' && !result.requiresQuestion, 'expected Move'); });
  it('classifies neutral target as Conquer with question', () => { const result = classifyAction(request({ targetTileId: 't_center' })); assert(result.actionType === 'Conquer' && result.requiresQuestion, 'expected Conquer'); });
  it('classifies opponent occupied target as Attack with Duel', () => { const result = classifyAction(request({ targetTileId: 't_b_home' })); assert(result.actionType === 'Attack' && result.requiresDuel, 'expected Attack'); });
  it('classifies explicit Rest', () => { const result = classifyAction(request({ targetTileId: undefined, requestedAction: 'Rest' })); assert(result.actionType === 'Rest' && result.isFinalStep, 'expected Rest'); });
  it('rejects client-forced action type', () => { const result = classifyAction(request({ requestedAction: 'Attack' })); assert(result.classificationStatus === 'Rejected' && result.rejectionReason === 'CLIENT_ACTION_TYPE_NOT_ALLOWED', 'expected rejection'); });
  it('does not mutate MatchState', () => { const input = request(); const before = JSON.stringify(input.matchState); classifyAction(input); assert(JSON.stringify(input.matchState) === before, 'classification must be pure'); });
  it('allows Level 3 second-step context only after Move', () => { const matchState = state(); const opened = openActivation(matchState, 'playerA', 'unit_a3', 'activation-3'); if (!opened.accepted || !opened.activation) throw new Error('activation fixture failed'); const second = classifyAction({ matchState, playerId: 'playerA', unitId: 'unit_a3', targetTileId: 't_center', activation: { ...opened.activation, stepIndex: 2, previousStepAction: 'Move', movedOnPreviousStep: true } }); assert(second.classificationStatus === 'Classified', 'expected second step classification'); });
});
