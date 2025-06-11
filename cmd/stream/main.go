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
	"sync"

	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"go.uber.org/zap"

	"github.com/hcengineering/stream/internal/pkg/api/v1/recording"
	"github.com/hcengineering/stream/internal/pkg/api/v1/transcoding"
	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/queue"
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
	logger.Sugar().Debug("using config", zap.Any("config", cfg))

	if cfg.SentryDsn != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:  cfg.SentryDsn,
			Tags: map[string]string{"application": "stream"},
		}); err != nil {
			logger.Sugar().Fatalf("sentry.Init: %s", err)
		}
		// ensure buffered events are sent before exit
		defer sentry.Flush(2 * time.Second)
	}

	var recordingHandler = recording.NewHandler(ctx, cfg)
	var transcodingHandler = transcoding.NewHandler(ctx, cfg)

	// setup HTTP routes
	mux := http.NewServeMux()
	mux.Handle("/recording/", http.StripPrefix("/recording/", recordingHandler))
	mux.Handle("/recording", http.StripPrefix("/recording", recordingHandler))
	mux.Handle("/transcoding", http.StripPrefix("/transcoding", transcodingHandler))

	// wrap with Sentry HTTP handler if enabled
	var handler http.Handler = mux
	if cfg.SentryDsn != "" {
		sentryHandler := sentryhttp.New(sentryhttp.Options{
			Repanic:         true,
			WaitForDelivery: true,
			Timeout:         2 * time.Second,
		})
		handler = sentryHandler.Handle(mux)
	}

	server := &http.Server{
		Addr:    cfg.ServeURL,
		Handler: handler,
	}

	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()

		logger.Info("http server started", zap.String("ServeURL", cfg.ServeURL))
		defer logger.Info("http server finished")

		// #nosec
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("http server error", zap.Error(err))
			cancel()
		}
	}()

	config := queue.ParseConfig(cfg.QueueConfig, "stream", cfg.Region)
	logger.Info("using queue config", zap.Any("config", config))
	consumer := queue.NewConsumer(ctx, queue.TopicTranscodeRequest, "stream", config)
	producer := queue.NewProducer(ctx, queue.TopicTranscodeResult, config)

	wg.Add(1)
	go func() {
		defer wg.Done()

		logger.Info("queue worker started")
		defer logger.Info("queue worker finished")

		worker := queue.NewWorker(ctx, consumer, producer, cfg)
		if err := worker.Start(ctx); err != nil {
			logger.Error("queue worker error", zap.Error(err))
			cancel()
		}
	}()

	<-ctx.Done()

	// Stop HTTP server to prevent accepting new connections
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("http server shutdown error", zap.Error(err))
	}

	// Wait for all workers to complete
	wg.Wait()

	// Close the consumer
	if err := consumer.Close(); err != nil {
		logger.Error("failed to close queue consumer", zap.Error(err))
	}

	logger.Info("shutdown complete")
}
