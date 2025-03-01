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

package uploader

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func Test_Postpone(t *testing.T) {
	var u = uploader{
		postponeDuration: time.Second / 4,
	}
	var counter atomic.Int32
	u.postpone("1", func(context.Context) { counter.Add(1) })
	time.Sleep(time.Second / 8)
	u.postpone("1", func(context.Context) { counter.Add(1) })
	time.Sleep(time.Second / 2)
	require.Equal(t, int32(1), counter.Load())
	time.Sleep(time.Second / 2)
	require.Equal(t, int32(1), counter.Load())
}

func Test_WithoutPostpone(t *testing.T) {
	var counter atomic.Int32
	var u uploader
	u.postpone("1", func(context.Context) { counter.Add(1) })
	time.Sleep(time.Second / 10)
	require.Equal(t, int32(1), counter.Load())
}
