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

/** @public */
export type TierPlan = 'common' | 'rare' | 'epic' | 'legendary'

/** @public */
export interface TierLimitsGB {
  storageGB: number
  trafficGB: number
}

/** @public */
export interface TierLimitsBytes {
  storageBytes: number
  trafficBytes: number
}

/**
 * Plan-level resource limits, expressed in GB.
 *
 * @public
 */
export const TIER_LIMITS_GB: Record<TierPlan, TierLimitsGB> = {
  common: { storageGB: 10, trafficGB: 10 },
  rare: { storageGB: 100, trafficGB: 100 },
  epic: { storageGB: 1000, trafficGB: 500 },
  legendary: { storageGB: 10000, trafficGB: 2000 }
}

/**
 * Limits used when no plan is active or the plan id is unknown.
 *
 * @public
 */
export const DEFAULT_TIER_LIMITS_GB: TierLimitsGB = TIER_LIMITS_GB.common

const GB_IN_BYTES = 1e9

function normalisePlan (plan: string | undefined): TierPlan | undefined {
  if (plan === undefined) return undefined
  const key = plan.toLowerCase() as TierPlan
  return key in TIER_LIMITS_GB ? key : undefined
}

/**
 * Resolve plan limits in GB, falling back to the default tier when the plan is
 * unknown or undefined.
 *
 * @public
 */
export function getTierLimitsGB (plan: string | undefined): TierLimitsGB {
  const key = normalisePlan(plan)
  return key !== undefined ? TIER_LIMITS_GB[key] : DEFAULT_TIER_LIMITS_GB
}

/**
 * Same as {@link getTierLimitsGB}, but expressed in bytes — handy for direct
 * comparison with raw `storageBytes` / `livekitTrafficBytes` usage values.
 *
 * @public
 */
export function getTierLimitsBytes (plan: string | undefined): TierLimitsBytes {
  const limits = getTierLimitsGB(plan)
  return {
    storageBytes: limits.storageGB * GB_IN_BYTES,
    trafficBytes: limits.trafficGB * GB_IN_BYTES
  }
}
