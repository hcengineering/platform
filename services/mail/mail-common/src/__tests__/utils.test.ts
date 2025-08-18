//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { getEmailMessageIdFromHulyId, getHulyIdFromEmailMessageId, isHulyEmailMessageId } from '../utils'

describe('Email Message ID Conversion', () => {
  describe('getEmailMessageIdFromHulyId', () => {
    it('should convert Huly ID to email Message-ID format', () => {
      const hulyId = 'msg_123456789abcdef'
      const email = 'user@example.com'
      const result = getEmailMessageIdFromHulyId(hulyId, email)
      expect(result).toBe('<msg_123456789abcdef@example.com>')
    })

    it('should handle different domains', () => {
      const hulyId = 'huly_message_001'
      const email = 'admin@company.org'
      const result = getEmailMessageIdFromHulyId(hulyId, email)
      expect(result).toBe('<huly_message_001@company.org>')
    })

    it('should handle subdomain emails', () => {
      const hulyId = 'test_msg'
      const email = 'support@mail.example.com'
      const result = getEmailMessageIdFromHulyId(hulyId, email)
      expect(result).toBe('<test_msg@mail.example.com>')
    })

    it('should handle complex Huly IDs', () => {
      const hulyId = 'channel_123_thread_456_msg_789'
      const email = 'team@startup.io'
      const result = getEmailMessageIdFromHulyId(hulyId, email)
      expect(result).toBe('<channel_123_thread_456_msg_789@startup.io>')
    })

    it('should throw error for invalid email', () => {
      const hulyId = 'msg_123'
      const invalidEmail = 'not-an-email'
      expect(() => getEmailMessageIdFromHulyId(hulyId, invalidEmail)).toThrow('Invalid email address')
    })
  })

  describe('getHulyIdFromEmailMessageId', () => {
    it('should extract Huly ID from email Message-ID', () => {
      const messageId = '<msg_123456789abcdef@example.com>'
      const email = 'user@example.com'
      const result = getHulyIdFromEmailMessageId(messageId, email)
      expect(result).toBe('msg_123456789abcdef')
    })

    it('should handle Message-ID without angle brackets', () => {
      const messageId = 'msg_123456789abcdef@example.com'
      const email = 'user@example.com'
      const result = getHulyIdFromEmailMessageId(messageId, email)
      expect(result).toBe('msg_123456789abcdef')
    })

    it('should return undefined for non-matching domain', () => {
      const messageId = '<msg_123@example.com>'
      const email = 'user@different.com'
      const result = getHulyIdFromEmailMessageId(messageId, email)
      expect(result).toBeUndefined()
    })

    it('should handle complex domains', () => {
      const messageId = '<channel_123_thread_456@mail.company.org>'
      const email = 'admin@mail.company.org'
      const result = getHulyIdFromEmailMessageId(messageId, email)
      expect(result).toBe('channel_123_thread_456')
    })

    it('should handle empty Huly ID part', () => {
      const messageId = '<@example.com>'
      const email = 'user@example.com'
      const result = getHulyIdFromEmailMessageId(messageId, email)
      expect(result).toBe('')
    })

    it('should return undefined for standard email Message-IDs', () => {
      const messageId = '<CABc1234567890abcdef@mail.gmail.com>'
      const email = 'user@example.com'
      const result = getHulyIdFromEmailMessageId(messageId, email)
      expect(result).toBeUndefined()
    })

    it('should handle multiple @ symbols in Message-ID', () => {
      const messageId = '<msg@test@example.com>'
      const email = 'user@example.com'
      const result = getHulyIdFromEmailMessageId(messageId, email)
      expect(result).toBe('msg@test')
    })

    it('should throw error for invalid email', () => {
      const messageId = '<msg_123@example.com>'
      const invalidEmail = 'not-an-email'
      expect(() => getHulyIdFromEmailMessageId(messageId, invalidEmail)).toThrow('Invalid email address')
    })
  })

  describe('isHulyEmailMessageId', () => {
    it('should return true for valid Huly Message-ID', () => {
      const messageId = '<msg_123456789abcdef@example.com>'
      const email = 'user@example.com'
      const result = isHulyEmailMessageId(messageId, email)
      expect(result).toBe(true)
    })

    it('should return false for non-matching domain', () => {
      const messageId = '<msg_123@example.com>'
      const email = 'user@different.com'
      const result = isHulyEmailMessageId(messageId, email)
      expect(result).toBe(false)
    })

    it('should return false for standard email Message-IDs', () => {
      const messageId = '<CABc1234567890abcdef@mail.gmail.com>'
      const email = 'user@example.com'
      const result = isHulyEmailMessageId(messageId, email)
      expect(result).toBe(false)
    })

    it('should return true for Message-ID without angle brackets', () => {
      const messageId = 'msg_123456789abcdef@example.com'
      const email = 'user@example.com'
      const result = isHulyEmailMessageId(messageId, email)
      expect(result).toBe(true)
    })
  })

  describe('Round-trip conversion', () => {
    it('should preserve Huly ID through round-trip conversion', () => {
      const originalHulyId = 'msg_123456789abcdef'
      const email = 'user@example.com'

      const messageId = getEmailMessageIdFromHulyId(originalHulyId, email)
      const extractedHulyId = getHulyIdFromEmailMessageId(messageId, email)

      expect(extractedHulyId).toBe(originalHulyId)
    })

    it('should work with complex Huly IDs', () => {
      const originalHulyId = 'channel_abc123_thread_def456_msg_789xyz'
      const email = 'team@company.com'

      const messageId = getEmailMessageIdFromHulyId(originalHulyId, email)
      const extractedHulyId = getHulyIdFromEmailMessageId(messageId, email)

      expect(extractedHulyId).toBe(originalHulyId)
    })

    it('should work with subdomain emails', () => {
      const originalHulyId = 'notification_001'
      const email = 'alerts@mail.platform.io'

      const messageId = getEmailMessageIdFromHulyId(originalHulyId, email)
      const extractedHulyId = getHulyIdFromEmailMessageId(messageId, email)

      expect(extractedHulyId).toBe(originalHulyId)
    })
  })

  describe('Edge cases', () => {
    it('should handle Huly ID with special characters', () => {
      const hulyId = 'msg-123_test.001'
      const email = 'user@example.com'

      const messageId = getEmailMessageIdFromHulyId(hulyId, email)
      expect(messageId).toBe('<msg-123_test.001@example.com>')

      const extractedHulyId = getHulyIdFromEmailMessageId(messageId, email)
      expect(extractedHulyId).toBe(hulyId)
    })

    it('should handle very long Huly IDs', () => {
      const hulyId = 'very_long_huly_id_with_many_segments_and_characters_123456789abcdef'
      const email = 'user@example.com'

      const messageId = getEmailMessageIdFromHulyId(hulyId, email)
      const extractedHulyId = getHulyIdFromEmailMessageId(messageId, email)

      expect(extractedHulyId).toBe(hulyId)
    })

    it('should handle empty Huly ID', () => {
      const hulyId = ''
      const email = 'user@example.com'

      const messageId = getEmailMessageIdFromHulyId(hulyId, email)
      expect(messageId).toBe('<@example.com>')

      const extractedHulyId = getHulyIdFromEmailMessageId(messageId, email)
      expect(extractedHulyId).toBe('')
    })
  })
})
