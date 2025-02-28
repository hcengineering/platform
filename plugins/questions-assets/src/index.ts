//
// Copyright @ 2024 Hardcore Engineering Inc.
//

/// <reference path="../../../common/types/assets.d.ts" />

import { loadMetadata } from '@hcengineering/platform'
import questions from '@hcengineering/questions'
import icons from '../assets/icons.svg'

loadMetadata(questions.icon, {
  ArrowDown: `${icons}#arrow-down`,
  ArrowUp: `${icons}#arrow-up`,
  Assessment: `${icons}#assessment`,
  Checkbox: `${icons}#checkbox`,
  Drag: `${icons}#drag`,
  Duplicate: `${icons}#duplicate`,
  Failed: `${icons}#failed`,
  MiniDrag: `${icons}#mini-drag`,
  Passed: `${icons}#passed`,
  Question: `${icons}#question`,
  RadioButton: `${icons}#radio-button`
})
