import type { MatchState, PlayerId, TileId, UnitId } from './IMPL_A3_001_P0_DOMAIN_STATE_AND_INVARIANT_CORE.js';

export type ActionType = 'Move' | 'Conquer' | 'Attack' | 'Rest';
export type ClassificationStatus = 'Classified' | 'Rejected';
export type RequestedAction = 'Rest' | 'Move' | 'Conquer' | 'Attack';

export interface ActivationContext {
  activationId: string;
  playerId: PlayerId;
  unitId: UnitId;
  stepIndex: 1 | 2;
  maxSteps: 1 | 2;
  status: 'Open' | 'Resolving' | 'Completed' | 'Rejected';
  openedAtEventSequence: number;
  previousStepAction: ActionType | null;
  movedOnPreviousStep: boolean;
}

export interface ActionRequest {
  matchState: MatchState;
  playerId: PlayerId;
  unitId: UnitId;
  targetTileId?: TileId;
  requestedAction?: RequestedAction;
  activation: ActivationContext;
}

export interface ClassificationResult {
  classificationStatus: ClassificationStatus;
  actionType?: ActionType;
  playerId: PlayerId;
  unitId: UnitId;
  sourceTileId?: TileId;
  targetTileId?: TileId;
  stepIndex: 1 | 2;
  requiresQuestion: boolean;
  requiresDuel: boolean;
  isFinalStep: boolean;
  rejectionReason?: string;
}

export interface ActivationOpenResult {
  accepted: boolean;
  activation?: ActivationContext;
  rejectionReason?: string;
}

function rejected(request: ActionRequest, reason: string): ClassificationResult {
  return {
    classificationStatus: 'Rejected',
    playerId: request.playerId,
    unitId: request.unitId,
    stepIndex: request.activation.stepIndex,
    requiresQuestion: false,
    requiresDuel: false,
    isFinalStep: true,
    rejectionReason: reason,
  };
}

function isOpponent(playerId: PlayerId, ownership: MatchState['tiles'][string]['ownership']): boolean {
  return ownership !== 'neutral' && ownership !== playerId;
}

export function openActivation(state: MatchState, playerId: PlayerId, unitId: UnitId, activationId: string): ActivationOpenResult {
  if (state.completionStatus !== 'active') return { accepted: false, rejectionReason: 'MATCH_NOT_ACTIVE' };
  if (state.openActivation !== null) return { accepted: false, rejectionReason: 'ACTIVATION_ALREADY_OPEN' };
  if (state.roundState.activePlayerId !== playerId) return { accepted: false, rejectionReason: 'PLAYER_NOT_ACTIVE' };

  const unit = state.units[unitId];
  if (!unit) return { accepted: false, rejectionReason: 'UNIT_NOT_FOUND' };
  if (unit.ownerPlayerId !== playerId) return { accepted: false, rejectionReason: 'UNIT_NOT_OWNED' };
  if (unit.status !== 'active') return { accepted: false, rejectionReason: 'UNIT_NOT_ACTIVE' };
  if (unit.roundAvailability !== 'available') return { accepted: false, rejectionReason: 'UNIT_ALREADY_ACTIVATED' };
  if (unit.currentTileId === null || !state.tiles[unit.currentTileId]) return { accepted: false, rejectionReason: 'UNIT_TILE_INVALID' };
  if (!activationId) return { accepted: false, rejectionReason: 'ACTIVATION_ID_REQUIRED' };

  const activation: ActivationContext = {
    activationId,
    playerId,
    unitId,
    stepIndex: 1,
    maxSteps: unit.level === 3 ? 2 : 1,
    status: 'Open',
    openedAtEventSequence: state.eventSequence,
    previousStepAction: null,
    movedOnPreviousStep: false,
  };

  return { accepted: true, activation };
}

export function classifyAction(request: ActionRequest): ClassificationResult {
  const { matchState: state, activation } = request;
  const unit = state.units[request.unitId];

  if (state.completionStatus !== 'active') return rejected(request, 'MATCH_NOT_ACTIVE');
  if (state.roundState.activePlayerId !== request.playerId) return rejected(request, 'PLAYER_NOT_ACTIVE');
  if (activation.status !== 'Open') return rejected(request, 'ACTIVATION_NOT_OPEN');
  if (activation.playerId !== request.playerId || activation.unitId !== request.unitId) return rejected(request, 'ACTIVATION_CONTEXT_MISMATCH');
  if (activation.stepIndex === 2 && (activation.maxSteps !== 2 || !activation.movedOnPreviousStep)) return rejected(request, 'SECOND_STEP_NOT_ALLOWED');
  if (!unit) return rejected(request, 'UNIT_NOT_FOUND');
  if (unit.ownerPlayerId !== request.playerId) return rejected(request, 'UNIT_NOT_OWNED');
  if (unit.status !== 'active') return rejected(request, 'UNIT_NOT_ACTIVE');
  if (unit.currentTileId === null || !state.tiles[unit.currentTileId]) return rejected(request, 'UNIT_TILE_INVALID');
  if (request.requestedAction && request.requestedAction !== 'Rest') return rejected(request, 'CLIENT_ACTION_TYPE_NOT_ALLOWED');

  const sourceTile = state.tiles[unit.currentTileId];
  const isFinalStep = activation.stepIndex === activation.maxSteps;

  if (request.requestedAction === 'Rest') {
    return {
      classificationStatus: 'Classified',
      actionType: 'Rest',
      playerId: request.playerId,
      unitId: request.unitId,
      sourceTileId: sourceTile.tileId,
      stepIndex: activation.stepIndex,
      requiresQuestion: false,
      requiresDuel: false,
      isFinalStep: true,
    };
  }

  const targetTileId = request.targetTileId;
  if (!targetTileId) return rejected(request, 'TARGET_REQUIRED');
  const targetTile = state.tiles[targetTileId];
  if (!targetTile) return rejected(request, 'TARGET_NOT_FOUND');
  if (!sourceTile.neighborTileIds.includes(targetTileId)) return rejected(request, 'TARGET_NOT_ADJACENT');
  if (targetTile.occupancy === 'occupied' && targetTile.occupantUnitId === null) return rejected(request, 'TARGET_OCCUPANCY_INVALID');

  if (targetTile.occupancy === 'occupied') {
    const occupant = targetTile.occupantUnitId ? state.units[targetTile.occupantUnitId] : undefined;
    if (!occupant || occupant.ownerPlayerId !== targetTile.ownership) return rejected(request, 'TARGET_OCCUPANT_OWNER_MISMATCH');
    if (targetTile.ownership === request.playerId) return rejected(request, 'OWN_OCCUPIED_TARGET');
    if (!isOpponent(request.playerId, targetTile.ownership)) return rejected(request, 'INVALID_OCCUPIED_TARGET');
    return {
      classificationStatus: 'Classified',
      actionType: 'Attack',
      playerId: request.playerId,
      unitId: request.unitId,
      sourceTileId: sourceTile.tileId,
      targetTileId,
      stepIndex: activation.stepIndex,
      requiresQuestion: false,
      requiresDuel: true,
      isFinalStep: true,
    };
  }

  if (targetTile.ownership === request.playerId) {
    return {
      classificationStatus: 'Classified',
      actionType: 'Move',
      playerId: request.playerId,
      unitId: request.unitId,
      sourceTileId: sourceTile.tileId,
      targetTileId,
      stepIndex: activation.stepIndex,
      requiresQuestion: false,
      requiresDuel: false,
      isFinalStep,
    };
  }

  return {
    classificationStatus: 'Classified',
    actionType: 'Conquer',
    playerId: request.playerId,
    unitId: request.unitId,
    sourceTileId: sourceTile.tileId,
    targetTileId,
    stepIndex: activation.stepIndex,
    requiresQuestion: true,
    requiresDuel: false,
    isFinalStep: true,
  };
}
