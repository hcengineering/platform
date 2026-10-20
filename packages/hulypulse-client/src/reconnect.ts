//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

export const RECONNECT_BASE_DELAY_MS = 1000
export const RECONNECT_MAX_DELAY_MS = 30 * 1000

/**
 * Delay before reconnect attempt number `attempt` (0-based): exponential backoff
 * capped at `maxDelay`, with jitter in the upper half of the window so that many
 * clients do not reconnect in lockstep after a server restart.
 */
export function getReconnectDelay (
  attempt: number,
  baseDelay: number = RECONNECT_BASE_DELAY_MS,
  maxDelay: number = RECONNECT_MAX_DELAY_MS,
  random: () => number = Math.random
): number {
  const exp = Math.min(maxDelay, baseDelay * Math.pow(2, Math.max(0, Math.min(attempt, 30))))
  return Math.round(exp / 2 + (exp / 2) * random())
}
