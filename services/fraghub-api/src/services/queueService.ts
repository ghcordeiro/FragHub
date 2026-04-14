import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger';

/**
 * Queue Service (Phase 5 Matchmaking)
 *
 * Manages queue state machine, team balancing, and veto logic
 * State: WAITING_PLAYERS → PLAYERS_FOUND → MAP_VOTE → IN_PROGRESS → FINISHED
 * QUEUE-REQ-001 through QUEUE-REQ-012
 */

export enum QueueState {
  WAITING_PLAYERS = 'WAITING_PLAYERS',
  PLAYERS_FOUND = 'PLAYERS_FOUND',
  MAP_VOTE = 'MAP_VOTE',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

export interface QueueStatusResponse {
  state: string; // 'NOT_IN_QUEUE' or QueueState
  position?: number;
  totalInQueue?: number;
  teamA?: any[];
  teamB?: any[];
  mapSelected?: string;
  connectString?: string;
  vetoState?: {
    banHistory: Array<{ banningTeam: string; map: string }>;
    remainingMaps: string[];
    currentTurn: 'TEAM_A' | 'TEAM_B';
    isCaptain: boolean;
  };
  avgEloA?: number;
  avgEloB?: number;
}

// In-memory veto state storage
const vetoStates = new Map<
  string,
  {
    banHistory: Array<{ banningTeam: string; map: string }>;
    remainingMaps: string[];
    currentTurn: 'TEAM_A' | 'TEAM_B';
    vetoStartTime: Date;
    vetoTimeoutHandle?: NodeJS.Timeout;
  }
>();

/**
 * Join queue: add player to current queue session or create new one
 * QUEUE-REQ-001: Validate Steam, prevent duplicates, enforce rate limit
 */
export async function joinQueue(
  userId: string,
  knex: Knex,
  config: { maxQueueSize: number; maxEloDiff: number }
): Promise<{ position: number; totalInQueue: number }> {
  // Validate user exists and has Steam linked
  const user = await knex('users').where('id', userId).first();
  if (!user) {
    throw { error: 'User not found', code: 'USER_NOT_FOUND', statusCode: 404 };
  }

  if (!user.steam_id) {
    throw { error: 'Steam account not linked', code: 'NO_STEAM_LINKED', statusCode: 403 };
  }

  // Check if user already in active queue
  const existingQueuePlayer = await knex('queue_players as qp')
    .join('queue_sessions as qs', 'qp.queue_session_id', 'qs.id')
    .where('qp.user_id', userId)
    .where('qs.state', '!=', QueueState.FINISHED)
    .first();

  if (existingQueuePlayer) {
    throw { error: 'Already in queue', code: 'ALREADY_IN_QUEUE', statusCode: 409 };
  }

  // Check if user in in-progress match
  const inProgressMatch = await knex('queue_players as qp')
    .join('queue_sessions as qs', 'qp.queue_session_id', 'qs.id')
    .where('qp.user_id', userId)
    .where('qs.state', QueueState.IN_PROGRESS)
    .first();

  if (inProgressMatch) {
    throw { error: 'In in-progress match', code: 'IN_PROGRESS_MATCH', statusCode: 400 };
  }

  // Find or create queue session in WAITING_PLAYERS state
  let queueSession = await knex('queue_sessions')
    .where('state', QueueState.WAITING_PLAYERS)
    .first();

  if (!queueSession) {
    queueSession = {
      id: uuidv4(),
      state: QueueState.WAITING_PLAYERS,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await knex('queue_sessions').insert(queueSession);
    logger.info(`[QUEUE] Created new session: ${queueSession.id}`);
  }

  // Add player to queue
  await knex('queue_players').insert({
    id: uuidv4(),
    queue_session_id: queueSession.id,
    user_id: userId,
    team_assignment: null,
    joined_at: new Date(),
  });

  // Get position and total count
  const playersInQueue = await knex('queue_players')
    .where('queue_session_id', queueSession.id)
    .orderBy('joined_at', 'asc');

  const position = playersInQueue.findIndex(p => p.user_id === userId) + 1;
  const totalInQueue = playersInQueue.length;

  logger.info(`[QUEUE] Player ${userId} joined queue: position ${position}/${totalInQueue}`);

  // If queue is now full (10 players), advance state to PLAYERS_FOUND
  if (totalInQueue === config.maxQueueSize) {
    await advanceQueueState(
      QueueState.WAITING_PLAYERS,
      QueueState.PLAYERS_FOUND,
      queueSession.id,
      knex,
      config
    );
  }

  return { position, totalInQueue };
}

/**
 * Leave queue: remove player from queue session
 * QUEUE-REQ-002: Idempotent, always returns 200
 */
export async function leaveQueue(userId: string, knex: Knex): Promise<void> {
  const queuePlayer = await knex('queue_players')
    .where('user_id', userId)
    .join('queue_sessions as qs', 'queue_players.queue_session_id', 'qs.id')
    .where('qs.state', '!=', QueueState.FINISHED)
    .first();

  if (!queuePlayer) {
    logger.info(`[QUEUE] Player ${userId} not in queue (idempotent)`);
    return;
  }

  const queueSessionId = queuePlayer.queue_session_id;

  // Remove player
  await knex('queue_players').where('user_id', userId).delete();

  // Check if queue is now empty
  const remainingCount = await knex('queue_players')
    .where('queue_session_id', queueSessionId)
    .count('* as cnt')
    .first();

  if (remainingCount?.cnt === 0) {
    await knex('queue_sessions').where('id', queueSessionId).delete();
    logger.info(`[QUEUE] Queue ${queueSessionId} emptied; deleted session`);
  } else {
    logger.info(`[QUEUE] Player ${userId} left queue (${remainingCount?.cnt} remaining)`);
  }
}

/**
 * Get current queue status for a user
 * QUEUE-REQ-003: Return state, composition, veto state, connect string
 */
export async function getQueueStatus(userId: string, knex: Knex): Promise<QueueStatusResponse> {
  const queuePlayer = await knex('queue_players as qp')
    .join('queue_sessions as qs', 'qp.queue_session_id', 'qs.id')
    .where('qp.user_id', userId)
    .select('qp.*', 'qs.*')
    .first();

  if (!queuePlayer) {
    return { state: 'NOT_IN_QUEUE' };
  }

  const queueSessionId = queuePlayer.queue_session_id;
  const state = queuePlayer.state;

  // Get all players in session
  const allPlayers = await knex('queue_players as qp')
    .join('users as u', 'qp.user_id', 'u.id')
    .where('qp.queue_session_id', queueSessionId)
    .select('qp.*', 'u.id', 'u.displayName', 'u.elo_rating', 'u.role');

  const position = allPlayers.findIndex(p => p.user_id === userId) + 1;
  const totalInQueue = allPlayers.length;

  const response: QueueStatusResponse = {
    state,
    position,
    totalInQueue,
  };

  // Add team composition if state >= PLAYERS_FOUND
  if (
    state === QueueState.PLAYERS_FOUND ||
    state === QueueState.MAP_VOTE ||
    state === QueueState.IN_PROGRESS
  ) {
    const teamAPlayers = allPlayers.filter(p => p.team_assignment === 'TEAM_A');
    const teamBPlayers = allPlayers.filter(p => p.team_assignment === 'TEAM_B');

    response.teamA = teamAPlayers.map(p => ({
      id: p.user_id,
      displayName: p.displayName,
      elo: p.elo_rating,
      level: Math.max(1, Math.min(10, Math.floor((p.elo_rating - 600) / 80) + 1)),
    }));

    response.teamB = teamBPlayers.map(p => ({
      id: p.user_id,
      displayName: p.displayName,
      elo: p.elo_rating,
      level: Math.max(1, Math.min(10, Math.floor((p.elo_rating - 600) / 80) + 1)),
    }));

    if (teamAPlayers.length > 0) {
      const avgEloA = teamAPlayers.reduce((sum, p) => sum + (p.elo_rating || 1000), 0) / teamAPlayers.length;
      response.avgEloA = Math.round(avgEloA);
    }
    if (teamBPlayers.length > 0) {
      const avgEloB = teamBPlayers.reduce((sum, p) => sum + (p.elo_rating || 1000), 0) / teamBPlayers.length;
      response.avgEloB = Math.round(avgEloB);
    }
  }

  // Add veto state if state >= MAP_VOTE
  if (state === QueueState.MAP_VOTE || state === QueueState.IN_PROGRESS) {
    const vetoState = vetoStates.get(queueSessionId);
    if (vetoState) {
      const userTeam =
        allPlayers.find(p => p.user_id === userId)?.team_assignment === 'TEAM_A'
          ? 'TEAM_A'
          : 'TEAM_B';
      const captains =
        userTeam === 'TEAM_A'
          ? allPlayers
              .filter(p => p.team_assignment === 'TEAM_A')
              .sort((a, b) => (b.elo_rating || 0) - (a.elo_rating || 0))[0]
          : allPlayers
              .filter(p => p.team_assignment === 'TEAM_B')
              .sort((a, b) => (b.elo_rating || 0) - (a.elo_rating || 0))[0];

      response.vetoState = {
        banHistory: vetoState.banHistory,
        remainingMaps: vetoState.remainingMaps,
        currentTurn: vetoState.currentTurn,
        isCaptain: captains?.user_id === userId,
      };
    }
  }

  // Add connect string if in-progress
  if (state === QueueState.IN_PROGRESS) {
    response.connectString = queuePlayer.connect_string;
    response.mapSelected = queuePlayer.map_selected;
  }

  return response;
}

/**
 * Balance teams using snake draft
 * QUEUE-REQ-004: Minimize ELO difference between teams (< MAX_ELO_DIFF)
 */
export async function balanceTeams(
  userIds: string[],
  knex: Knex,
  config: { maxEloDiff: number }
): Promise<{ teamA: string[]; teamB: string[]; avgEloA: number; avgEloB: number }> {
  if (userIds.length !== 10) {
    throw new Error('balanceTeams requires exactly 10 players');
  }

  // Fetch user ELO ratings
  const users = await knex('users')
    .whereIn('id', userIds)
    .select('id', 'elo_rating', 'displayName');

  const userMap = new Map(users.map(u => [u.id, u]));

  // Sort by ELO descending
  const sorted = userIds.sort((a, b) => {
    const eloA = userMap.get(a)?.elo_rating || 1000;
    const eloB = userMap.get(b)?.elo_rating || 1000;
    return eloB - eloA;
  });

  // Snake draft: 1→A, 2→B, 3→B, 4→A, 5→A, 6→B, 7→B, 8→A, 9→A, 10→B
  let teamA: string[] = [];
  let teamB: string[] = [];

  for (let i = 0; i < 10; i++) {
    const pattern = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const position = i % 10;
    if ([0, 3, 4, 8].includes(position)) {
      teamA.push(sorted[i]);
    } else {
      teamB.push(sorted[i]);
    }
  }

  // Calculate average ELOs
  const avgEloA = Math.round(
    teamA.reduce((sum, id) => sum + (userMap.get(id)?.elo_rating || 1000), 0) / 5
  );
  const avgEloB = Math.round(
    teamB.reduce((sum, id) => sum + (userMap.get(id)?.elo_rating || 1000), 0) / 5
  );

  const eloDiff = Math.abs(avgEloA - avgEloB);

  if (eloDiff > config.maxEloDiff) {
    logger.warn(
      `[QUEUE] Team balance warning: ELO diff ${eloDiff} > max ${config.maxEloDiff}; proceeding anyway`
    );
  }

  // Update queue_players with team assignments
  await knex('queue_players')
    .where('queue_session_id', (qb) =>
      qb
        .select('queue_session_id')
        .from('queue_players')
        .whereIn('user_id', teamA)
        .limit(1)
    )
    .whereIn('user_id', teamA)
    .update({ team_assignment: 'TEAM_A' });

  await knex('queue_players')
    .where('queue_session_id', (qb) =>
      qb
        .select('queue_session_id')
        .from('queue_players')
        .whereIn('user_id', teamB)
        .limit(1)
    )
    .whereIn('user_id', teamB)
    .update({ team_assignment: 'TEAM_B' });

  logger.info(
    `[QUEUE] Teams balanced: Team A avg ${avgEloA}, Team B avg ${avgEloB} (diff: ${eloDiff})`
  );

  return { teamA, teamB, avgEloA, avgEloB };
}

/**
 * Advance queue state with state transition validation
 * QUEUE-REQ-006: Enforce valid transitions
 */
export async function advanceQueueState(
  currentState: QueueState,
  nextState: QueueState,
  queueSessionId: string,
  knex: Knex,
  config: { maxEloDiff: number; mapPool: string[]; vetoTimeoutSeconds: number }
): Promise<void> {
  // Validate state transition
  const validTransitions: Record<QueueState, QueueState[]> = {
    [QueueState.WAITING_PLAYERS]: [QueueState.PLAYERS_FOUND],
    [QueueState.PLAYERS_FOUND]: [QueueState.MAP_VOTE, QueueState.WAITING_PLAYERS],
    [QueueState.MAP_VOTE]: [QueueState.IN_PROGRESS, QueueState.WAITING_PLAYERS],
    [QueueState.IN_PROGRESS]: [QueueState.FINISHED],
    [QueueState.FINISHED]: [],
  };

  if (!validTransitions[currentState].includes(nextState)) {
    throw new Error(`Invalid state transition: ${currentState} → ${nextState}`);
  }

  // Update state
  await knex('queue_sessions').where('id', queueSessionId).update({
    state: nextState,
    updated_at: new Date(),
  });

  logger.info(`[QUEUE] Session ${queueSessionId} transitioned: ${currentState} → ${nextState}`);

  // Handle state-specific logic
  if (nextState === QueueState.PLAYERS_FOUND) {
    // Get all players and balance teams
    const players = await knex('queue_players')
      .where('queue_session_id', queueSessionId)
      .select('user_id');

    const userIds = players.map(p => p.user_id);
    await balanceTeams(userIds, knex, config);

    // Advance to MAP_VOTE
    await advanceQueueState(
      QueueState.PLAYERS_FOUND,
      QueueState.MAP_VOTE,
      queueSessionId,
      knex,
      config
    );
  } else if (nextState === QueueState.MAP_VOTE) {
    // Initialize veto state
    vetoStates.set(queueSessionId, {
      banHistory: [],
      remainingMaps: [...config.mapPool],
      currentTurn: 'TEAM_A',
      vetoStartTime: new Date(),
    });
    logger.info(`[QUEUE] Veto started for session ${queueSessionId}`);
  } else if (nextState === QueueState.IN_PROGRESS) {
    // Fire match ready notification (caller responsibility via discordNotifyService)
    const session = await knex('queue_sessions').where('id', queueSessionId).first();
    logger.info(`[QUEUE] Match ready: session ${queueSessionId}, map: ${session.map_selected}`);
  } else if (nextState === QueueState.FINISHED) {
    // Clean up veto state and queue_players
    vetoStates.delete(queueSessionId);
    await knex('queue_players').where('queue_session_id', queueSessionId).delete();
    logger.info(`[QUEUE] Session ${queueSessionId} finished`);
  }
}

/**
 * Vote on map during veto phase
 * QUEUE-REQ-007: Validate captain, enforce turn order, auto-advance on completion
 */
export async function voteMap(
  userId: string,
  action: 'ban',
  map: string,
  queueSessionId: string,
  knex: Knex,
  config: { vetoTimeoutSeconds: number }
): Promise<void> {
  const vetoState = vetoStates.get(queueSessionId);
  if (!vetoState) {
    throw { error: 'Veto not in progress', code: 'NO_VETO_IN_PROGRESS', statusCode: 400 };
  }

  // Get user's team
  const queuePlayer = await knex('queue_players')
    .where('queue_session_id', queueSessionId)
    .where('user_id', userId)
    .first();

  if (!queuePlayer) {
    throw { error: 'User not in queue', code: 'NOT_IN_QUEUE', statusCode: 404 };
  }

  const userTeam = queuePlayer.team_assignment as 'TEAM_A' | 'TEAM_B';

  // Check if it's user's team's turn
  if (vetoState.currentTurn !== userTeam) {
    throw { error: 'Not your team turn', code: 'NOT_YOUR_TURN', statusCode: 403 };
  }

  // Check if user is captain (highest ELO in team)
  const teamPlayers = await knex('queue_players as qp')
    .join('users as u', 'qp.user_id', 'u.id')
    .where('qp.queue_session_id', queueSessionId)
    .where('qp.team_assignment', userTeam)
    .select('qp.user_id', 'u.elo_rating')
    .orderBy('u.elo_rating', 'desc');

  const captain = teamPlayers[0];
  if (captain.user_id !== userId) {
    throw { error: 'Not captain', code: 'NOT_CAPTAIN', statusCode: 403 };
  }

  // Validate map is in remaining pool
  if (!vetoState.remainingMaps.includes(map)) {
    throw { error: 'Map not available', code: 'MAP_NOT_AVAILABLE', statusCode: 400 };
  }

  // Ban the map
  vetoState.banHistory.push({
    banningTeam: userTeam === 'TEAM_A' ? 'TEAM_A' : 'TEAM_B',
    map,
  });

  vetoState.remainingMaps = vetoState.remainingMaps.filter(m => m !== map);

  logger.info(
    `[QUEUE] Session ${queueSessionId}: ${userTeam} banned ${map}. Remaining: ${vetoState.remainingMaps.join(', ')}`
  );

  // Check if veto is complete (1 map remaining)
  if (vetoState.remainingMaps.length === 1) {
    const selectedMap = vetoState.remainingMaps[0];
    await knex('queue_sessions')
      .where('id', queueSessionId)
      .update({ map_selected: selectedMap });

    // Auto-advance to IN_PROGRESS
    await advanceQueueState(
      QueueState.MAP_VOTE,
      QueueState.IN_PROGRESS,
      queueSessionId,
      knex,
      { maxEloDiff: 50, mapPool: [], vetoTimeoutSeconds: 0 } // dummy config
    );

    logger.info(`[QUEUE] Veto complete: ${selectedMap} selected`);
  } else {
    // Switch turn to other team
    vetoState.currentTurn = userTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
  }
}

/**
 * Check for inactive players and remove them from queue
 * QUEUE-REQ-005: Background task run every 60 seconds
 */
export async function checkQueueTimeouts(
  knex: Knex,
  timeoutMinutes: number
): Promise<void> {
  const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  const timedOutPlayers = await knex('queue_players as qp')
    .join('queue_sessions as qs', 'qp.queue_session_id', 'qs.id')
    .where('qs.state', QueueState.WAITING_PLAYERS)
    .where('qp.joined_at', '<', timeoutDate)
    .select('qp.user_id', 'qp.queue_session_id', 'qp.id');

  for (const player of timedOutPlayers) {
    await knex('queue_players').where('id', player.id).delete();
    logger.info(`[QUEUE] Removed timed-out player ${player.user_id} from session ${player.queue_session_id}`);

    // Check if queue is now empty
    const remainingCount = await knex('queue_players')
      .where('queue_session_id', player.queue_session_id)
      .count('* as cnt')
      .first();

    if (remainingCount?.cnt === 0) {
      await knex('queue_sessions').where('id', player.queue_session_id).delete();
      logger.info(`[QUEUE] Deleted empty queue session ${player.queue_session_id}`);
    }
  }
}

export default {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  balanceTeams,
  advanceQueueState,
  voteMap,
  checkQueueTimeouts,
};
