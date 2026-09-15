import {
  type PlayerId,
  type TestFixtureInput,
  type TileId,
  type TileState,
  type UnitState,
} from '../IMPL_A3_001_P0_DOMAIN_STATE_AND_INVARIANT_CORE.js';

type Placement = {
  unitId: string;
  ownerPlayerId: PlayerId;
  currentTileId: TileId;
  level: 1 | 2 | 3;
  developmentPoints: number;
};

const adjacency: Record<string, string[]> = {
  t_center: ['t_a_home', 't_b_home', 't_a_north', 't_b_north', 't_a_west', 't_b_east'],
  t_a_home: ['t_center', 't_b_home', 't_a_west', 't_a_north', 't_block_a', 't_edge_a'],
  t_a_west: ['t_a_home', 't_center', 't_edge_a'],
  t_a_north: ['t_a_home', 't_center'],
  t_b_home: ['t_center', 't_a_home', 't_b_east', 't_b_north', 't_edge_b'],
  t_b_east: ['t_b_home', 't_center'],
  t_b_north: ['t_b_home', 't_center'],
  t_block_a: ['t_a_home'],
  t_edge_a: ['t_a_home', 't_a_west'],
  t_edge_b: ['t_b_home'],
};

const placements: Placement[] = [
  { unitId: 'unit_a1', ownerPlayerId: 'playerA', currentTileId: 't_a_home', level: 1, developmentPoints: 0 },
  { unitId: 'unit_a2', ownerPlayerId: 'playerA', currentTileId: 't_block_a', level: 1, developmentPoints: 0 },
  { unitId: 'unit_a3', ownerPlayerId: 'playerA', currentTileId: 't_a_north', level: 2, developmentPoints: 5 },
  { unitId: 'unit_b1', ownerPlayerId: 'playerB', currentTileId: 't_b_home', level: 1, developmentPoints: 0 },
  { unitId: 'unit_b2', ownerPlayerId: 'playerB', currentTileId: 't_b_east', level: 1, developmentPoints: 0 },
  { unitId: 'unit_b3', ownerPlayerId: 'playerB', currentTileId: 't_b_north', level: 2, developmentPoints: 5 },
];

const tileOwnership: Record<string, PlayerId | 'neutral'> = {
  t_center: 'neutral', t_a_home: 'playerA', t_a_west: 'playerA', t_a_north: 'playerA',
  t_b_home: 'playerB', t_b_east: 'playerB', t_b_north: 'playerB', t_block_a: 'playerA',
  t_edge_a: 'playerA', t_edge_b: 'playerB',
};

const difficulty: Record<string, 1 | 2 | 3> = {
  t_center: 2, t_a_home: 1, t_a_west: 1, t_a_north: 1, t_b_home: 1,
  t_b_east: 1, t_b_north: 2, t_block_a: 1, t_edge_a: 1, t_edge_b: 1,
};

export function createP0TestFixture(options: { level3?: boolean } = {}): TestFixtureInput {
  const effectivePlacements = placements.map((placement) =>
    placement.unitId === 'unit_a3' && options.level3
      ? { ...placement, level: 3 as const, developmentPoints: 10 }
      : { ...placement },
  );
  const occupantByTile = new Map(effectivePlacements.map((placement) => [placement.currentTileId, placement.unitId]));
  const tiles: TileState[] = Object.keys(tileOwnership).map((tileId) => ({
    tileId,
    ownership: tileOwnership[tileId],
    occupancy: occupantByTile.has(tileId) ? 'occupied' : 'empty',
    occupantUnitId: occupantByTile.get(tileId) ?? null,
    neighborTileIds: [...adjacency[tileId]],
    difficultyLevel: difficulty[tileId],
    isTestOnly: true,
  }));
  const units: UnitState[] = effectivePlacements.map((placement) => ({
    ...placement,
    status: 'active',
    roundAvailability: 'available',
  }));
  return {
    fixtureId: 'p0-shared-test-fixture',
    rulesetVersion: 'P0-baseline-candidate',
    matchId: 'match-test-001',
    tiles,
    units,
    initialPlayer: 'playerA',
  };
}
