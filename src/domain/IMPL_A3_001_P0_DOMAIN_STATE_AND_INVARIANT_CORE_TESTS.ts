import { describe, it } from 'vitest';
import {
  initializeMatchState,
  levelForDevelopmentPoints,
  validateMatchState,
  type TestFixtureInput,
  type ValidationIssue,
} from './IMPL_A3_001_P0_DOMAIN_STATE_AND_INVARIANT_CORE.js';

const adjacency: Record<string, string[]> = {
  t_a_home: ['t_center', 't_a_west', 't_a_north', 't_block_a', 't_edge_a'],
  t_center: ['t_a_home', 't_b_home', 't_a_north', 't_b_north', 't_a_west', 't_b_east'],
  t_a_west: ['t_a_home', 't_center', 't_edge_a'],
  t_a_north: ['t_a_home', 't_center'],
  t_b_home: ['t_center', 't_b_east', 't_b_north', 't_edge_b'],
  t_b_east: ['t_b_home', 't_center'],
  t_b_north: ['t_b_home', 't_center'],
  t_block_a: ['t_a_home'],
  t_edge_a: ['t_a_home', 't_a_west'],
  t_edge_b: ['t_b_home'],
};

type FixtureTile = [string, 'playerA' | 'playerB' | 'neutral', 'empty' | 'occupied', string | null, 1 | 2 | 3];

const fixtureTiles: FixtureTile[] = [
  ['t_center', 'neutral', 'empty', null, 2],
  ['t_a_home', 'playerA', 'occupied', 'unit_a1', 1],
  ['t_a_west', 'playerA', 'empty', null, 1],
  ['t_a_north', 'playerA', 'occupied', 'unit_a3', 1],
  ['t_b_home', 'playerB', 'occupied', 'unit_b1', 1],
  ['t_b_east', 'playerB', 'occupied', 'unit_b2', 1],
  ['t_b_north', 'playerB', 'occupied', 'unit_b3', 2],
  ['t_block_a', 'playerA', 'occupied', 'unit_a2', 1],
  ['t_edge_a', 'playerA', 'empty', null, 1],
  ['t_edge_b', 'playerB', 'empty', null, 1],
];

const fixture: TestFixtureInput = {
  fixtureId: 'p0-test-core-001',
  rulesetVersion: 'P0-baseline-candidate',
  matchId: 'match-test-001',
  initialPlayer: 'playerA',
  tiles: fixtureTiles.map(([tileId, ownership, occupancy, occupantUnitId, difficultyLevel]) => ({
    tileId,
    ownership,
    occupancy,
    occupantUnitId,
    neighborTileIds: adjacency[tileId],
    difficultyLevel,
    isTestOnly: true,
  })),
  units: [
    { unitId: 'unit_a1', ownerPlayerId: 'playerA', currentTileId: 't_a_home', level: 1, developmentPoints: 0, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_a2', ownerPlayerId: 'playerA', currentTileId: 't_block_a', level: 1, developmentPoints: 0, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_a3', ownerPlayerId: 'playerA', currentTileId: 't_a_north', level: 2, developmentPoints: 5, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_b1', ownerPlayerId: 'playerB', currentTileId: 't_b_home', level: 1, developmentPoints: 0, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_b2', ownerPlayerId: 'playerB', currentTileId: 't_b_east', level: 1, developmentPoints: 0, status: 'active', roundAvailability: 'available' },
    { unitId: 'unit_b3', ownerPlayerId: 'playerB', currentTileId: 't_b_north', level: 2, developmentPoints: 5, status: 'active', roundAvailability: 'available' },
  ],
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

describe('IMPL-A3-001 domain state invariants', () => {
  it('maps Development Points to Levels', () => {
    assert(levelForDevelopmentPoints(0) === 1, '0 points must be Level 1');
    assert(levelForDevelopmentPoints(4) === 1, '4 points must be Level 1');
    assert(levelForDevelopmentPoints(5) === 2, '5 points must be Level 2');
    assert(levelForDevelopmentPoints(9) === 2, '9 points must be Level 2');
    assert(levelForDevelopmentPoints(10) === 3, '10 points must be Level 3');
  });

  it('accepts the deterministic fixture', () => {
    const state = initializeMatchState(fixture);
    const valid = validateMatchState(state);
    assert(valid.valid, `fixture should be valid: ${valid.issues.map((issue: ValidationIssue) => issue.code).join(', ')}`);
  });

  it('rejects ownership mismatch', () => {
    const state = initializeMatchState(fixture);
    state.tiles.t_a_home.ownership = 'playerB';
    assert(!validateMatchState(state).valid, 'owner mismatch must be rejected');
  });

  it('rejects occupied Tile without occupant', () => {
    const state = initializeMatchState(fixture);
    state.tiles.t_a_west.occupancy = 'occupied';
    state.tiles.t_a_west.occupantUnitId = null;
    assert(!validateMatchState(state).valid, 'occupied Tile without occupant must be rejected');
  });

  it('rejects Level/points mismatch', () => {
    const state = initializeMatchState(fixture);
    state.units.unit_a3.developmentPoints = 4;
    assert(!validateMatchState(state).valid, 'Level/points mismatch must be rejected');
  });

  it('rejects non-reciprocal adjacency', () => {
    const state = initializeMatchState(fixture);
    state.tiles.t_a_home.neighborTileIds = ['t_center'];
    assert(!validateMatchState(state).valid, 'non-reciprocal adjacency must be rejected');
  });
});
