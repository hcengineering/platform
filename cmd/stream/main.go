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

// Package main provides huly-stream entry point function
package main

import (
	"context"
	"net/http"

	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"

	"github.com/hcengineering/stream/internal/pkg/api/v1/recording"
	"github.com/hcengineering/stream/internal/pkg/api/v1/transcoding"
	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
)

func main() {
	var ctx, cancel = signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGHUP,
		syscall.SIGTERM,
		syscall.SIGQUIT,
	)
	defer cancel()
	ctx = log.WithFields(ctx)

	var logger = log.FromContext(ctx)
	var cfg, err = config.FromEnv()
	if err != nil {
		panic(err.Error())
	}
	logger.Sugar().Debugf("parsed config is %v", cfg)

	var recordingHandler = recording.NewHandler(ctx, cfg)
	var transcodingHandler = transcoding.NewHandler(ctx, cfg)

	http.Handle("/recording/", http.StripPrefix("/recording/", recordingHandler))
	http.Handle("/recording", http.StripPrefix("/recording", recordingHandler))
	http.Handle("/transcoding", http.StripPrefix("/transcoding", transcodingHandler))

	go func() {
		logger.Info("server started serving", zap.String("ServeURL", cfg.ServeURL))
		defer logger.Info("server finished")

		// #nosec
		var err = http.ListenAndServe(cfg.ServeURL, nil)
		if err != nil {
			cancel()
			logger.Debug("unable to listen", zap.Error(err))
		}
	}()

	<-ctx.Done()
}
