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
)

func (u *uploader) postpone(id string, action func()) {
	u.wg.Add(1)
	var ctx, cancel = context.WithCancel(context.Background())
	var startCh = time.After(u.postponeDuration)

	if v, ok := u.contexts.Load(id); ok {
		(*v.(*context.CancelFunc))()
	}
	u.contexts.Store(id, &cancel)

	go func() {
		u.wg.Done()
		defer cancel()
		select {
		case <-ctx.Done():
			return
		case <-startCh:
			action()
			u.contexts.CompareAndDelete(id, &cancel)
		}
	}()
}
