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

package transcoding

import "sync/atomic"

// Limiter is a simple CAS data structure for managing resources.
type Limiter struct {
	capacity    int64
	maxCapacity int64
}

// NewLimiter creates a new limiter with the given initial capacity.
func NewLimiter(capacity int64) *Limiter {
	return &Limiter{
		capacity:    capacity,
		maxCapacity: capacity,
	}
}

// TryConsume attempts to consume the specified amount of capacity.
// Returns true if successful, false otherwise.
func (l *Limiter) TryConsume(amount int64) bool {
	if amount <= 0 {
		return false
	}

	for {
		current := atomic.LoadInt64(&l.capacity)
		if current < amount {
			return false
		}
		updated := current - amount
		if atomic.CompareAndSwapInt64(&l.capacity, current, updated) {
			return true
		}
	}
}

// ReturnCapacity adds the specified amount back to the limiter's capacity.
// Does not exceed the maximum capacity.
func (l *Limiter) ReturnCapacity(amount int64) {
	if amount <= 0 {
		return
	}

	for {
		current := atomic.LoadInt64(&l.capacity)
		updated := current + amount
		if updated > l.maxCapacity {
			updated = l.maxCapacity
		}
		if atomic.CompareAndSwapInt64(&l.capacity, current, updated) {
			break
		}
	}
}

// GetCapacity retrieves the current capacity for debugging or monitoring purposes.
func (l *Limiter) GetCapacity() int64 {
	return atomic.LoadInt64(&l.capacity)
}

// GetMaxCapacity retrieves the maximum capacity.
func (l *Limiter) GetMaxCapacity() int64 {
	return l.maxCapacity
}
