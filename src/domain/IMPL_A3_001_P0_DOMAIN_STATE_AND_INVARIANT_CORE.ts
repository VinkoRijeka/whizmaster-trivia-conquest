export type PlayerId = 'playerA' | 'playerB';
export type TileId = string;
export type UnitId = string;
export type MatchId = string;

export type Ownership = PlayerId | 'neutral';
export type Occupancy = 'empty' | 'occupied';
export type UnitStatus = 'active' | 'eliminated';
export type RoundAvailability = 'available' | 'activated';
export type CompletionStatus = 'active' | 'completed' | 'safetyGuardExceeded';

export interface TileState {
  tileId: TileId;
  ownership: Ownership;
  occupancy: Occupancy;
  occupantUnitId: UnitId | null;
  neighborTileIds: TileId[];
  difficultyLevel: 1 | 2 | 3;
  isTestOnly: true;
}

export interface UnitState {
  unitId: UnitId;
  ownerPlayerId: PlayerId;
  currentTileId: TileId | null;
  level: 0 | 1 | 2 | 3;
  developmentPoints: number;
  status: UnitStatus;
  roundAvailability: RoundAvailability;
}

export interface PlayerState {
  playerId: PlayerId;
  isActivePlayer: boolean;
}

export interface RoundState {
  roundNumber: number;
  activePlayerId: PlayerId;
  roundStatus: 'active' | 'completed';
  activationSequence: number;
  roundEventStartSequence: number;
}

export interface MatchState {
  matchId: MatchId;
  rulesetVersion: string;
  fixtureId: string;
  players: Record<PlayerId, PlayerState>;
  units: Record<UnitId, UnitState>;
  tiles: Record<TileId, TileState>;
  roundState: RoundState;
  openActivation: null;
  openResolution: null;
  eventSequence: number;
  completionStatus: CompletionStatus;
  transitionCount: number;
}

export interface TestFixtureInput {
  fixtureId: string;
  rulesetVersion: string;
  matchId: MatchId;
  tiles: TileState[];
  units: UnitState[];
  initialPlayer: PlayerId;
}

export interface ValidationIssue {
  code: string;
  message: string;
  entityId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function levelForDevelopmentPoints(points: number): 1 | 2 | 3 {
  if (!Number.isInteger(points) || points < 0 || points > 10) {
    throw new Error('Development Points must be an integer in range 0..10');
  }
  if (points >= 10) return 3;
  if (points >= 5) return 2;
  return 1;
}

export function validateMatchState(state: MatchState): ValidationResult {
  const issues: ValidationIssue[] = [];
  const activePlayers = Object.values(state.players).filter((player) => player.isActivePlayer);

  if (activePlayers.length !== 1 && state.completionStatus === 'active') {
    issues.push({ code: 'ACTIVE_PLAYER_COUNT', message: 'Active MatchState must have exactly one active Player.' });
  }

  const occupiedUnitIds = new Set<UnitId>();

  for (const tile of Object.values(state.tiles)) {
    if (tile.occupancy === 'empty' && tile.occupantUnitId !== null) {
      issues.push({ code: 'EMPTY_WITH_OCCUPANT', message: 'Empty Tile cannot reference an occupant.', entityId: tile.tileId });
    }

    if (tile.occupancy === 'occupied' && tile.occupantUnitId === null) {
      issues.push({ code: 'OCCUPIED_WITHOUT_OCCUPANT', message: 'Occupied Tile must reference an occupant.', entityId: tile.tileId });
    }

    const reciprocalNeighbors = tile.neighborTileIds.every((neighborId) => {
      const neighbor = state.tiles[neighborId];
      return Boolean(neighbor && neighbor.neighborTileIds.includes(tile.tileId));
    });

    if (!reciprocalNeighbors) {
      issues.push({ code: 'NON_RECIPROCAL_ADJACENCY', message: 'Tile adjacency must be reciprocal.', entityId: tile.tileId });
    }

    if (tile.occupantUnitId) {
      if (occupiedUnitIds.has(tile.occupantUnitId)) {
        issues.push({ code: 'DUPLICATE_OCCUPANCY', message: 'A Unit cannot occupy multiple Tiles.', entityId: tile.occupantUnitId });
      }
      occupiedUnitIds.add(tile.occupantUnitId);
      const unit = state.units[tile.occupantUnitId];
      if (!unit) {
        issues.push({ code: 'MISSING_OCCUPANT', message: 'Tile references a missing Unit.', entityId: tile.tileId });
      } else {
        if (unit.status !== 'active' || unit.currentTileId !== tile.tileId) {
          issues.push({ code: 'UNIT_TILE_MISMATCH', message: 'Tile and Unit references are not reciprocal.', entityId: unit.unitId });
        }
        if (tile.ownership !== unit.ownerPlayerId) {
          issues.push({ code: 'OWNER_MISMATCH', message: 'Occupied Unit must belong to Tile owner.', entityId: tile.tileId });
        }
      }
    }
  }

  for (const unit of Object.values(state.units)) {
    if (!Number.isInteger(unit.developmentPoints) || unit.developmentPoints < 0 || unit.developmentPoints > 10) {
      issues.push({ code: 'INVALID_POINTS', message: 'Development Points must be an integer in range 0..10.', entityId: unit.unitId });
    }

    if (unit.status === 'eliminated') {
      if (unit.level !== 0 || unit.currentTileId !== null) {
        issues.push({ code: 'INVALID_ELIMINATED_UNIT', message: 'Eliminated Unit must have Level 0 and no active Tile.', entityId: unit.unitId });
      }
      continue;
    }

    if (unit.currentTileId === null) {
      issues.push({ code: 'ACTIVE_UNIT_WITHOUT_TILE', message: 'Active Unit must have a current Tile.', entityId: unit.unitId });
      continue;
    }

    const expectedLevel = levelForDevelopmentPoints(unit.developmentPoints);
    if (unit.level !== expectedLevel) {
      issues.push({ code: 'LEVEL_POINTS_MISMATCH', message: `Expected Level ${expectedLevel}, received Level ${unit.level}.`, entityId: unit.unitId });
    }

    const tile = state.tiles[unit.currentTileId];
    if (!tile || tile.occupantUnitId !== unit.unitId || tile.occupancy !== 'occupied') {
      issues.push({ code: 'UNIT_TILE_MISMATCH', message: 'Active Unit must be referenced by its current Occupied Tile.', entityId: unit.unitId });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function initializeMatchState(input: TestFixtureInput): MatchState {
  const units = Object.fromEntries(input.units.map((unit) => [unit.unitId, { ...unit }]));
  const tiles = Object.fromEntries(input.tiles.map((tile) => [tile.tileId, { ...tile, neighborTileIds: [...tile.neighborTileIds] }]));

  const state: MatchState = {
    matchId: input.matchId,
    rulesetVersion: input.rulesetVersion,
    fixtureId: input.fixtureId,
    players: {
      playerA: { playerId: 'playerA', isActivePlayer: input.initialPlayer === 'playerA' },
      playerB: { playerId: 'playerB', isActivePlayer: input.initialPlayer === 'playerB' },
    },
    units,
    tiles,
    roundState: {
      roundNumber: 1,
      activePlayerId: input.initialPlayer,
      roundStatus: 'active',
      activationSequence: 0,
      roundEventStartSequence: 0,
    },
    openActivation: null,
    openResolution: null,
    eventSequence: 0,
    completionStatus: 'active',
    transitionCount: 0,
  };

  const result = validateMatchState(state);
  if (!result.valid) {
    throw new Error(result.issues.map((issue) => `${issue.code}: ${issue.message}`).join('; '));
  }

  return state;
}
