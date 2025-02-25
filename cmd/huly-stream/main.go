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
	"golang.org/x/exp/slog"

	"github.com/huly-stream/internal/pkg/config"
	"github.com/huly-stream/internal/pkg/log"
	"github.com/huly-stream/internal/pkg/pprof"
	"github.com/huly-stream/internal/pkg/transcoding"
	tusd "github.com/tus/tusd/v2/pkg/handler"
)

const basePath = "/recording"

func main() {
	var ctx, cancel = signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGHUP,
		syscall.SIGTERM,
		syscall.SIGQUIT,
	)
	defer cancel()
	ctx = log.WithLoggerFields(ctx)

	var logger = log.FromContext(ctx)
	var conf = must(config.FromEnv())
	logger.Sugar().Debugf("provided config is %v", conf)

	logger.Sugar().Info(conf.Endpoint())

	mustNoError(os.MkdirAll(conf.OutputDir, os.ModePerm))
	if conf.PprofEnabled {
		go pprof.ListenAndServe(ctx, "localhost:6060")
	}
	scheduler := transcoding.NewScheduler(ctx, conf)

	tusComposer := tusd.NewStoreComposer()
	tusComposer.UseCore(scheduler)
	tusComposer.UseTerminater(scheduler)
	tusComposer.UseConcater(scheduler)
	tusComposer.UseLengthDeferrer(scheduler)

	var handler = must(tusd.NewHandler(tusd.Config{
		BasePath:      basePath,
		StoreComposer: tusComposer,
		Logger:        slog.New(slog.NewTextHandler(discardTextHandler{}, nil)),
	}))

	http.Handle("/recording/", http.StripPrefix("/recording/", handler))
	http.Handle("/recording", http.StripPrefix("/recording", handler))

	go func() {
		logger.Info("started to listen")
		defer logger.Info("server has finished")
		// #nosec
		var err = http.ListenAndServe(conf.ServeURL, nil)
		if err != nil {
			cancel()
			logger.Debug("unable to listen", zap.Error(err))
		}
	}()

	<-ctx.Done()
}

type discardTextHandler struct{}

func (discardTextHandler) Write([]byte) (int, error) {
	return 0, nil
}

func mustNoError(err error) {
	if err != nil {
		panic(err.Error())
	}
}

func must[T any](val T, err error) T {
	mustNoError(err)
	return val
}
