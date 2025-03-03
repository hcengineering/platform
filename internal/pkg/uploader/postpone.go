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
	"time"

	"github.com/huly-stream/internal/pkg/log"
	"go.uber.org/zap"
)

func (u *uploader) postpone(fileName string, action func(ctx context.Context)) {
	u.waitJobs.Add(1)
	var ctx, cancel = context.WithCancel(context.Background())
	ctx = log.WithLoggerFields(ctx, zap.String("pospone", "action"))
	var startCh = time.After(u.postponeDuration)

	if v, ok := u.contexts.Load(fileName); ok {
		(*v.(*context.CancelFunc))()
	}
	u.contexts.Store(fileName, &cancel)

	go func() {
		u.waitJobs.Done()
		defer cancel()
		select {
		case <-ctx.Done():
			return
		case <-startCh:
			action(ctx)
			if ctx.Err() == nil {
				u.contexts.CompareAndDelete(fileName, &cancel)
			}
		}
	}()
}
