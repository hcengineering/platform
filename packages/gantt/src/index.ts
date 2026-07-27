//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

// Domain-neutral Gantt engine: scheduling, zoom, drag/pointer, time-scale and
// viewport primitives with no dependency on any platform package.

export * from './types'
export * from './breakpoint'
export * from './cascade-popup-layout'
export * from './cascade-token'
export * from './confirm-gate'
export * from './cp-scheduler'
export * from './drag-controller'
export * from './drag-state'
export * from './flash-store'
export * from './gantt-view-options'
// `initial` is re-exported from './pinch-zoom' (consumed as `pinchInitial`);
// long-press's own `initial` is only used inside its unit test (which imports it
// directly), so it is intentionally left out of the barrel to avoid the clash.
export {
  LONG_PRESS_MS,
  MOVE_THRESHOLD_PX,
  reduceLongPress,
  type LongPressState,
  type LongPressEvent
} from './long-press'
export * from './pan-target'
export * from './pinch-zoom'
export * from './pointer-classify'
export * from './sidebar-columns'
export * from './time-scale'
export * from './toolbar-overflow'
export * from './tree-expand-store'
export * from './viewport'
export * from './working-days'
export * from './y-viewport'
export * from './zoom-dropdown'
export * from './zoom'
