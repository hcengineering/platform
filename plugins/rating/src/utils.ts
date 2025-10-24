import type { PluginConfiguration } from '@hcengineering/core'
import type { PersonRating } from '.'

export interface LevelInfo {
  level: number
  progress: number // 0-100 percentage to next level
  currentThreshold: number
  nextThreshold: number
}

const BASE_MULTIPLIER = 1.5
export function ratingToLevel (rating: number): number {
  // Convert experience rating to level (1-99) using logarithmic progression
  // Base: level 1 at rating 0, multiplier 1.5 per level
  // Level = 1 + log(rating + 1) / log(1.5)

  const level = 1 + Math.log(Math.max(rating, 0) + 1) / Math.log(BASE_MULTIPLIER)

  // Clamp to valid range 1-99
  return Math.max(1, Math.min(99, Math.floor(level)))
}

export function getLevelInfo (rating: number): LevelInfo {
  // Calculate current level
  const currentLevel = ratingToLevel(rating)

  // Calculate rating thresholds for current and next level
  // Inverse formula: rating = multiplier^(level - 1) - 1
  const currentThreshold = Math.round((Math.pow(BASE_MULTIPLIER, currentLevel - 1) - 1) * 100) / 100
  const nextThreshold = Math.round((Math.pow(BASE_MULTIPLIER, currentLevel) - 1) * 100) / 100

  // Calculate progress within current level (0-100)
  const levelRange = nextThreshold - currentThreshold
  const progressInLevel = rating - currentThreshold
  const progress = levelRange > 0 ? Math.min(100, Math.max(0, (progressInLevel / levelRange) * 100)) : 0

  return {
    level: currentLevel,
    progress,
    currentThreshold,
    nextThreshold
  }
}

export function getRaiting (total: number, rating: PersonRating | undefined, list: PluginConfiguration[]): number {
  if (rating?.stats == null || total === 0) return 0
  let result = 0
  for (const name of list) {
    const st = rating.stats[name.pluginId]
    if (st === undefined) {
      continue
    }
    result += ((st[0] + st[1] + st[2]) / total) * 100
  }
  return Math.round(result * 100) / 100
}
