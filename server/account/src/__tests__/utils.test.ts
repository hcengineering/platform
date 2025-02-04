//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { generateWorkspaceUrl } from '../utils'

describe('account utils', () => {
  describe('generateWorkspaceUrl', () => {
    const generateWorkspaceUrlTestCases = [
      // Basic cases
      {
        input: 'Simple Project',
        expected: 'simpleproject',
        description: 'removes spaces between words'
      },
      {
        input: 'UPPERCASE',
        expected: 'uppercase',
        description: 'converts uppercase to lowercase'
      },
      {
        input: 'lowercase',
        expected: 'lowercase',
        description: 'preserves already lowercase text'
      },

      // Number handling
      {
        input: '123Project',
        expected: 'project',
        description: 'removes numbers from the beginning of string'
      },
      {
        input: 'Project123',
        expected: 'project123',
        description: 'preserves numbers at the end of string'
      },
      {
        input: 'Pro123ject',
        expected: 'pro123ject',
        description: 'preserves numbers in the middle of string'
      },

      // Special characters
      {
        input: 'My-Project',
        expected: 'my-project',
        description: 'preserves hyphens between words'
      },
      {
        input: 'My_Project',
        expected: 'myproject',
        description: 'removes underscores between words'
      },
      {
        input: 'Project@#$%',
        expected: 'project',
        description: 'removes all special characters'
      },

      // Complex combinations
      {
        input: 'My-Awesome-Project-123',
        expected: 'my-awesome-project-123',
        description: 'preserves hyphens and numbers in complex strings'
      },
      {
        input: '123-Project-456',
        expected: 'project-456',
        description: 'removes leading numbers but preserves hyphens and trailing numbers'
      },
      {
        input: '@#$My&&Project!!',
        expected: 'myproject',
        description: 'removes all special characters while preserving alphanumeric content'
      },

      // Edge cases
      {
        input: '',
        expected: '',
        description: 'returns empty string for empty input'
      },
      {
        input: '123456',
        expected: '',
        description: 'returns empty string when input contains only numbers'
      },
      {
        input: '@#$%^&',
        expected: '',
        description: 'returns empty string when input contains only special characters'
      },
      {
        input: '   ',
        expected: '',
        description: 'returns empty string when input contains only spaces'
      },
      {
        input: 'a-b-c-1-2-3',
        expected: 'a-b-c-1-2-3',
        description: 'preserves alternating letters, numbers, and hyphens'
      },
      {
        input: '---Project---',
        expected: 'project',
        description: 'removes redundant hyphens while preserving content'
      },
      {
        input: 'Project!!!Name!!!123',
        expected: 'projectname123',
        description: 'removes exclamation marks while preserving alphanumeric content'
      },
      {
        input: '!@#Project123Name!@#',
        expected: 'project123name',
        description: 'removes surrounding special characters while preserving alphanumeric content'
      }
    ]

    generateWorkspaceUrlTestCases.forEach(({ input, expected, description }) => {
      it(description, () => {
        expect(generateWorkspaceUrl(input)).toEqual(expected)
      })
    })
  })
})
