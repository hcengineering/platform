//
// Copyright © 2022 Hardcore Engineering Inc.
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
import type { Asset } from '@hcengineering/platform'
import type { Timestamp } from '@hcengineering/core'
import type { AnySvelteComponent, IconSize } from '@hcengineering/ui'

export interface TimelineItem {
  icon?: Asset | AnySvelteComponent
  iconSize?: IconSize
  iconProps?: Record<string, any>
  presenter?: AnySvelteComponent
  props?: Record<string, any>
  label?: string

  startDate: Timestamp
  targetDate: Timestamp | undefined
}
export interface TimelineRow {
  items: TimelineItem[] | undefined
}
export interface TimelinePoint {
  date: Date
  x: number
  label?: string
}
export interface TimelineMinMax {
  min: TimelinePoint
  max: TimelinePoint
}
export type TTimelineRow = TimelineMinMax | null
export interface TimelineState {
  todayMarker: TimelinePoint
  cursorMarker?: TimelinePoint
  offsetView: number
  renderedRange: {
    left: TimelinePoint
    right: TimelinePoint
    firstDays: number[]
  }
  rows: TTimelineRow[] | undefined
  months: TimelinePoint[]
  days: TimelinePoint[]
  timelineBox: DOMRect
  viewBox: DOMRect
}
