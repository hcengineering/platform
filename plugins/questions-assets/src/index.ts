//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { loadMetadata } from '@hcengineering/platform'
import questions from '@hcengineering/questions'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
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
