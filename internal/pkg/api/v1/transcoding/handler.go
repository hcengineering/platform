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

// Package transcoding provides transcoding http handler.
package transcoding

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/transcoder"
	"go.uber.org/zap"
)

type trascodeHandler struct {
	taskQueue *transcoder.Scheduler
	logger    *zap.Logger
}

func (t *trascodeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "" {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = fmt.Fprint(w, "uri is not allowed")
		return
	}

	if r.Header.Get("Authorization") == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = fmt.Fprint(w, "missed Authorization header")
		return
	}

	var decoder = json.NewDecoder(r.Body)
	var task transcoder.Task

	if err := decoder.Decode(&task); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = fmt.Fprint(w, "can not decode request body")
		return
	}

	t.taskQueue.Schedule(&task)
	w.WriteHeader(http.StatusOK)
}

// NewHandler creates a new trnascoding http handler, requires context and config.
func NewHandler(ctx context.Context, cfg *config.Config) http.Handler {
	return &trascodeHandler{
		taskQueue: transcoder.NewScheduler(ctx, cfg),
		logger:    log.FromContext(ctx).With(zap.String("handler", "transcoding")),
	}
}
