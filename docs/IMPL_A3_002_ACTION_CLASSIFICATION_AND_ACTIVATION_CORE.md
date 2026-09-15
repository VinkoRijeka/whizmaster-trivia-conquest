# IMPL-A3-002 — Action Classification and Activation Core

- **Phase:** A3 — smallest next implementation step
- **Status:** proposed — code not yet authorized
- **Depends on:** `IMPL-A3-001`
- **Source contracts:** `SPEC_A2_004_ACTION_CLASSIFICATION_CONTRACT.md`, `SPEC_A2_005_ACTIVATION_AND_ROUND_RESOLVER_CONTRACT.md`

## Goal

Implement the smallest pure, testable core for opening an activation and classifying a target-driven request. This task must not resolve Move, Conquer, Attack, Duel or Question outcomes.

## Scope

- `ActionRequest` and `ActivationContext` domain types.
- Open activation for the active Player and an eligible Unit.
- Validate activation ownership and round availability.
- Deterministic target-driven classification: `Move`, `Conquer`, `Attack`, `Rest`.
- Explicit Rest classification and automatic Rest fallback when no legal target exists.
- Level 1/2 one-step limit.
- Level 3 second-step eligibility after a successful Move context only.
- Pure classification result; no MatchState mutation.
- Rejection reasons for invalid player, unit, target, adjacency, occupancy or stale step context.
- Unit tests for positive and negative classification cases.

## Non-goals

- Move/Conquer/Attack/Duel resolver effects.
- Question selection or resolution.
- Event persistence or external transport.
- UI, backend, networking or persistence.
- Canonical map.
- Siege, castle, defense, rewards or monetization.

## Acceptance criteria

### Activation

- Only the active Player can open an activation.
- Only an active, owned, available Unit can be activated.
- Opening an activation does not resolve an action.
- Invalid activation requests do not mutate MatchState.
- A Unit cannot be activated twice in the same round unless the contract explicitly permits a Level 3 second step.

### Classification

- Own empty adjacent target → `Move`, no Question, no Duel.
- Neutral empty adjacent target → `Conquer`, Question required.
- Opponent-owned empty adjacent target → `Conquer`, two-Question flow required.
- Opponent-owned occupied adjacent target → `Attack`, Duel required.
- Own occupied target → rejected.
- Non-adjacent or missing target → rejected.
- Classification is derived from MatchState, not a client-provided Move/Conquer/Attack label.
- Repeated identical request against identical state/context returns an equivalent result.
- Classification itself does not mutate ownership, occupancy, Level, Points or event sequence.

### Rest and steps

- Eligible explicit Rest returns `Rest` and finalizes the activation context.
- If no legal target exists, automatic Rest fallback is available.
- Level 1/2 has at most one step.
- Level 3 second step is available only after successful Move context.
- Level 3 second step uses the Unit's new current Tile adjacency, not stale adjacency.
- Second step after Conquer, Attack or Rest is rejected.

## Test plan

- Activation happy path.
- Reject inactive Player.
- Reject foreign Unit.
- Reject eliminated or already activated Unit.
- Classify own empty Move.
- Classify neutral Conquer.
- Classify opponent empty Conquer.
- Classify opponent occupied Attack.
- Reject own occupied target.
- Reject non-adjacent target.
- Reject client-forced action type.
- Explicit Rest.
- Automatic Rest fallback.
- Level 3 second-step gating.
- No MatchState mutation from classification.
- Determinism of identical request/context.

## Required evidence

- Typecheck output.
- Test output with counts.
- No claim of production readiness.
- Updated project state and decision log after completion.

## Implementation boundary

Do not implement resolver effects in this task. The expected next task after this one is a small Move resolver, provided this contract is confirmed and tests pass.
