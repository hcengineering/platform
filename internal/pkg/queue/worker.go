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

package queue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/mediaconvert"
	"github.com/pkg/errors"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type Worker struct {
	logger   *zap.Logger
	cfg      *config.Config
	consumer Consumer
}

func NewWorker(ctx context.Context, consumer Consumer, cfg *config.Config) *Worker {
	logger := log.FromContext(ctx).With(zap.String("queue", "worker"))

	return &Worker{
		logger:   logger,
		cfg:      cfg,
		consumer: consumer,
	}
}

func (w *Worker) Start(ctx context.Context) error {
	w.logger.Info("starting worker")
	defer w.logger.Info("worker stopped")

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("worker shutdown requested")
			return ctx.Err()
		default:
			if err := w.fetchAndProcessMessage(ctx); err != nil {
				if errors.Is(err, context.Canceled) {
					return err
				}
				w.logger.Error("failed to process message", zap.Error(err))
			}
		}
	}
}

func (w *Worker) fetchAndProcessMessage(ctx context.Context) error {
	// TODO We should use Fetch and Commit here but as long processing
	// time is longer than the max poll interval, we have to use Read.
	//	msg, err := w.consumer.Fetch(ctx)
	commit := false
	msg, err := w.consumer.Read(ctx)
	if err != nil {
		return fmt.Errorf("read message: %w", err)
	}

	logger := w.logger.With(
		zap.String("message-key", string(msg.Key)),
		zap.Int64("message-offset", msg.Offset),
		zap.Int("partition", msg.Partition),
	)
	logger.Debug("message", zap.ByteString("message", msg.Value))

	_, err = w.processMessage(ctx, msg, logger)
	if err != nil {
		w.logger.Error("failed to process message", zap.Error(err))
	}

	if commit {
		if err := w.commitMessage(ctx, msg, logger); err != nil {
			return errors.Wrapf(err, "failed to commit message")
		}
	}

	return err
}

func (w *Worker) commitMessage(ctx context.Context, msg kafka.Message, logger *zap.Logger) error {
	maxRetries := 3
	for i := range maxRetries {
		err := w.consumer.Commit(ctx, msg)
		if err == nil {
			return nil
		}

		if i < maxRetries-1 {
			logger.Error("failed to commit message", zap.Error(err), zap.Int("attempt", i+1))
			time.Sleep(time.Duration(100*(i+1)) * time.Millisecond)
		} else {
			return err
		}
	}

	return nil
}

func (w *Worker) processMessage(ctx context.Context, msg kafka.Message, logger *zap.Logger) (bool, error) {
	var req TranscodeRequest
	if err := json.Unmarshal(msg.Value, &req); err != nil {
		return true, fmt.Errorf("parse failed: %w", err)
	}

	if mediaconvert.IsSupportedMediaType(req.ContentType) == false {
		logger.Debug("unsupported content type", zap.String("contentType", req.ContentType))
		return true, nil
	}

	task := mediaconvert.Task{
		ID:        req.BlobID,
		Workspace: req.WorkspaceUUID,
		Source:    req.BlobID,
	}

	transcoder := mediaconvert.NewTranscoder(ctx, w.cfg)
	transcoder.Transcode(ctx, &task)

	return true, nil
}
