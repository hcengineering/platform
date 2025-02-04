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
package transcoding_test

import (
	"sync"
	"sync/atomic"
	"testing"

	"github.com/huly-stream/internal/pkg/transcoding"
	"github.com/stretchr/testify/require"
)

func TestLimiter(t *testing.T) {
	limiter := transcoding.NewLimiter(10)

	t.Run("Initial capacity", func(t *testing.T) {
		require.Equal(t, int64(10), limiter.GetCapacity())
	})

	t.Run("Successful consume", func(t *testing.T) {
		success := limiter.TryConsume(5)
		require.True(t, success)
		require.Equal(t, int64(5), limiter.GetCapacity())
	})

	t.Run("Failed consume", func(t *testing.T) {
		success := limiter.TryConsume(10)
		require.False(t, success)
		require.Equal(t, int64(5), limiter.GetCapacity())
	})

	t.Run("Return capacity", func(t *testing.T) {
		limiter.ReturnCapacity(3)
		require.Equal(t, int64(8), limiter.GetCapacity())
	})

	t.Run("Exceeding max capacity", func(t *testing.T) {
		limiter.ReturnCapacity(10)
		require.Equal(t, int64(10), limiter.GetCapacity())
	})
}

func TestLimiterConcurrency(t *testing.T) {
	limiter := transcoding.NewLimiter(10)
	var wg sync.WaitGroup

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			limiter.TryConsume(2)
		}()
	}

	wg.Wait()
	require.LessOrEqual(t, limiter.GetCapacity(), int64(0))
}

func TestLimiterCAS(t *testing.T) {
	limiter := transcoding.NewLimiter(10)
	var successful int64
	var wg sync.WaitGroup

	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if limiter.TryConsume(1) {
				atomic.AddInt64(&successful, 1)
			}
		}()
	}
	wg.Wait()

	require.Equal(t, int64(10), successful)
	require.Equal(t, int64(0), limiter.GetCapacity())
}
