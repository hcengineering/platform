// Copyright © 2022 Hardcore Engineering Inc.

export function getTagStyle (color: string, selected = false): string {
  return `
    background: ${color + (selected ? 'ff' : '33')};
    border: 1px solid ${color + (selected ? 'ff' : '66')};
  `
}
