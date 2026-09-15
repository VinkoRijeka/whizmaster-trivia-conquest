import { describe, it } from 'vitest';
import { initializeMatchState, levelForDevelopmentPoints, validateMatchState, type ValidationIssue } from './IMPL_A3_001_P0_DOMAIN_STATE_AND_INVARIANT_CORE.js';
import { createP0TestFixture } from './test-fixtures/p0TestFixture.js';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(message); }

describe('IMPL-A3-001 domain state invariants', () => {
  it('maps Development Points to Levels', () => { assert(levelForDevelopmentPoints(0) === 1, '0 points must be Level 1'); assert(levelForDevelopmentPoints(4) === 1, '4 points must be Level 1'); assert(levelForDevelopmentPoints(5) === 2, '5 points must be Level 2'); assert(levelForDevelopmentPoints(9) === 2, '9 points must be Level 2'); assert(levelForDevelopmentPoints(10) === 3, '10 points must be Level 3'); });
  it('accepts the deterministic fixture', () => { const state = initializeMatchState(createP0TestFixture()); const valid = validateMatchState(state); assert(valid.valid, `fixture should be valid: ${valid.issues.map((issue: ValidationIssue) => issue.code).join(', ')}`); });
  it('rejects ownership mismatch', () => { const state = initializeMatchState(createP0TestFixture()); state.tiles.t_a_home.ownership = 'playerB'; assert(!validateMatchState(state).valid, 'owner mismatch must be rejected'); });
  it('rejects occupied Tile without occupant', () => { const state = initializeMatchState(createP0TestFixture()); state.tiles.t_a_west.occupancy = 'occupied'; state.tiles.t_a_west.occupantUnitId = null; assert(!validateMatchState(state).valid, 'occupied Tile without occupant must be rejected'); });
  it('rejects Level/points mismatch', () => { const state = initializeMatchState(createP0TestFixture()); state.units.unit_a3.developmentPoints = 4; assert(!validateMatchState(state).valid, 'Level/points mismatch must be rejected'); });
  it('rejects non-reciprocal adjacency', () => { const state = initializeMatchState(createP0TestFixture()); state.tiles.t_a_home.neighborTileIds = ['t_center']; assert(!validateMatchState(state).valid, 'non-reciprocal adjacency must be rejected'); });
  it('rejects a broken unit/tile reciprocal reference', () => { const state = initializeMatchState(createP0TestFixture()); state.tiles.t_a_north.occupantUnitId = null; assert(validateMatchState(state).issues.some((issue) => issue.code === 'UNIT_TILE_MISMATCH'), 'unit/tile mismatch must be rejected'); });
});
