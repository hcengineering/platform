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

// Package recording provides recording http handler.
package recording

import (
	"context"

	"golang.org/x/exp/slog"

	"net/http"
	"sync"

	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/mediaconvert"
	"go.uber.org/zap"

	tusd "github.com/tus/tusd/v2/pkg/handler"
)

type recordingHandler struct {
	logger     *zap.Logger
	once       sync.Once
	cfg        *config.Config
	ctx        context.Context
	tusHandler http.Handler
}

func (h *recordingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !h.cfg.Insecure {
		r.Header.Set("X-Forwarded-Proto", "https")
	}
	h.once.Do(h.initialize)
	h.tusHandler.ServeHTTP(w, r)
}

// NewHandler creates a new recording http handler, requires context and config.
func NewHandler(ctx context.Context, cfg *config.Config) http.Handler {
	return &recordingHandler{
		logger: log.FromContext(ctx).With(zap.String("handler", "recording")),
		cfg:    cfg,
		ctx:    ctx,
	}
}

func (h *recordingHandler) initialize() {
	coordinator := mediaconvert.NewStreamCoordinator(h.ctx, h.cfg)

	tusComposer := tusd.NewStoreComposer()
	tusComposer.UseCore(coordinator)
	tusComposer.UseTerminater(coordinator)
	tusComposer.UseConcater(coordinator)
	tusComposer.UseLengthDeferrer(coordinator)

	var tusHandler, err = tusd.NewHandler(tusd.Config{
		BasePath:                "/recording",
		StoreComposer:           tusComposer,
		RespectForwardedHeaders: true,
		DisableDownload:         true,
		Cors:                    &tusd.DefaultCorsConfig,
		NetworkTimeout:          h.cfg.Timeout,
		Logger:                  slog.Default(),
	})

	if err != nil {
		panic(err.Error())
	}

	h.tusHandler = tusHandler
}
