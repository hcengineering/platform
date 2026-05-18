//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import {
  extractGanttSavedView,
  mergeGanttSavedView,
  isoDateForTimestamp,
  timestampForIsoDate,
  type GanttSavedViewOptions
} from '../gantt-view-options'

describe('gantt-view-options', () => {
  describe('extractGanttSavedView', () => {
    it('returns defaults for empty input', () => {
      expect(extractGanttSavedView(undefined)).toEqual({ zoomLevel: 'week' })
      expect(extractGanttSavedView({})).toEqual({ zoomLevel: 'week' })
    })

    it('reads zoomLevel and panAnchorDate', () => {
      expect(extractGanttSavedView({ ganttZoomLevel: 'month', ganttPanAnchorDate: '2026-07-01' }))
        .toEqual({ zoomLevel: 'month', panAnchorDate: '2026-07-01' })
    })

    it('ignores unknown zoomLevel and falls back to week', () => {
      expect(extractGanttSavedView({ ganttZoomLevel: 'century' })).toEqual({ zoomLevel: 'week' })
    })

    it('ignores malformed panAnchorDate', () => {
      expect(extractGanttSavedView({ ganttZoomLevel: 'day', ganttPanAnchorDate: 'not-a-date' }))
        .toEqual({ zoomLevel: 'day' })
    })

    it('ignores non-string zoomLevel', () => {
      expect(extractGanttSavedView({ ganttZoomLevel: 42 })).toEqual({ zoomLevel: 'week' })
    })
  })

  describe('mergeGanttSavedView', () => {
    it('preserves unrelated viewOptions keys', () => {
      const base = { ganttShowTitle: true, ganttConfirmMove: false }
      const out = mergeGanttSavedView(base, { zoomLevel: 'day' })
      expect(out.ganttShowTitle).toBe(true)
      expect(out.ganttConfirmMove).toBe(false)
      expect(out.ganttZoomLevel).toBe('day')
    })

    it('writes panAnchorDate when present', () => {
      const out = mergeGanttSavedView({}, { zoomLevel: 'week', panAnchorDate: '2026-09-15' })
      expect(out.ganttPanAnchorDate).toBe('2026-09-15')
    })

    it('omits panAnchorDate when absent', () => {
      const out = mergeGanttSavedView({}, { zoomLevel: 'week' })
      expect(Object.prototype.hasOwnProperty.call(out, 'ganttPanAnchorDate')).toBe(false)
    })

    it('strips stale panAnchorDate from base when new payload has none', () => {
      const base = { ganttPanAnchorDate: '2026-01-01', ganttShowTitle: true }
      const out = mergeGanttSavedView(base, { zoomLevel: 'week' })
      expect(Object.prototype.hasOwnProperty.call(out, 'ganttPanAnchorDate')).toBe(false)
      expect(out.ganttShowTitle).toBe(true)
    })

    it('does not mutate the base object', () => {
      const base = { ganttZoomLevel: 'day', ganttShowTitle: true }
      const out = mergeGanttSavedView(base, { zoomLevel: 'month' })
      expect(base.ganttZoomLevel).toBe('day')
      expect(out.ganttZoomLevel).toBe('month')
    })

    it('accepts undefined base', () => {
      const out = mergeGanttSavedView(undefined, { zoomLevel: 'quarter' })
      expect(out.ganttZoomLevel).toBe('quarter')
    })
  })

  describe('iso/timestamp helpers', () => {
    it('formats UTC midnight back to YYYY-MM-DD', () => {
      const t = Date.UTC(2026, 6, 1) // 2026-07-01
      expect(isoDateForTimestamp(t)).toBe('2026-07-01')
    })

    it('parses YYYY-MM-DD as UTC midnight', () => {
      expect(timestampForIsoDate('2026-07-01')).toBe(Date.UTC(2026, 6, 1))
    })

    it('returns NaN for invalid iso input', () => {
      expect(Number.isNaN(timestampForIsoDate('garbage'))).toBe(true)
    })

    it('round-trips arbitrary timestamps via snap-to-midnight', () => {
      const t = Date.UTC(2026, 6, 1, 14, 30, 0)
      const iso = isoDateForTimestamp(t)
      const back = timestampForIsoDate(iso)
      expect(back).toBe(Date.UTC(2026, 6, 1))
    })

    it('pads single-digit month and day', () => {
      expect(isoDateForTimestamp(Date.UTC(2026, 0, 5))).toBe('2026-01-05')
    })
  })

  it('round-trips through merge → extract', () => {
    const opts: GanttSavedViewOptions = { zoomLevel: 'quarter', panAnchorDate: '2026-03-15' }
    const merged = mergeGanttSavedView({ ganttShowTitle: true }, opts)
    expect(extractGanttSavedView(merged)).toEqual(opts)
  })
})
