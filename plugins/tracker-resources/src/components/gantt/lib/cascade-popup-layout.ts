//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 *  fix — pure layout helpers for {@link ConfirmCascadePopup}.
 *
 * The previous `bodyHeight = min(rows * ROW_HEIGHT + BAR_TOP_PADDING,
 * BODY_MAX_HEIGHT)` formula matched the svg's content height exactly but
 * forgot the `.body` element's CSS padding (4 px top + 4 px bottom), so
 * the bottom edge of the last row was clipped by the scroller — visible
 * as a sliced-off bar in the  "3 issues will be shifted" test.
 *
 * This helper folds the padding + a small safety margin into the height
 * so the popup grows to fit the typical N<10 case without scrolling,
 * and only scrolls once the rendered timeline genuinely exceeds the
 * BODY_MAX_HEIGHT ceiling.
 */
export interface CascadePopupLayoutInput {
  rowCount: number
  rowHeight: number
  barTopPadding: number
  bodyVerticalPadding: number
  bodyBottomSafety: number
  bodyMaxHeight: number
}

export function computeCascadeBodyHeight (input: CascadePopupLayoutInput): number {
  const desired =
    input.rowCount * input.rowHeight +
    input.barTopPadding +
    input.bodyVerticalPadding +
    input.bodyBottomSafety
  return Math.min(desired, input.bodyMaxHeight)
}
