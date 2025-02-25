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

// Package transcoding provides objects and functions for video trnascoding
package transcoding

import (
	"context"
	"io"
	"sync"

	"github.com/pkg/errors"

	"github.com/huly-stream/internal/pkg/manifest"
	"github.com/huly-stream/internal/pkg/sharedpipe"
	"github.com/huly-stream/internal/pkg/uploader"
	"github.com/tus/tusd/v2/pkg/handler"
	"go.uber.org/zap"
)

// Worker manages client's input and transcodes it based on the passsed configuration
type Worker struct {
	contentUploader uploader.Uploader
	logger          *zap.Logger
	info            handler.FileInfo
	writer          *sharedpipe.Writer
	reader          *sharedpipe.Reader

	wg   sync.WaitGroup
	done chan struct{}
}

// WriteChunk calls when client sends a chunk of raw data
func (w *Worker) WriteChunk(ctx context.Context, _ int64, src io.Reader) (int64, error) {
	w.logger.Debug("Write Chunk start", zap.Int64("offset", w.info.Offset))
	var bytes, err = io.ReadAll(src)
	_, _ = w.writer.Write(bytes)
	var n = int64(len(bytes))
	w.info.Offset += n
	w.logger.Debug("Write Chunk end", zap.Int64("offset", w.info.Offset), zap.Error(err))
	return n, err
}

// DeclareLength sets length of the video input
func (w *Worker) DeclareLength(ctx context.Context, length int64) error {
	w.info.Size = length
	w.info.SizeIsDeferred = false
	w.logger.Debug("DeclareLength", zap.Int64("size", length), zap.Bool("SizeIsDeferred", w.info.SizeIsDeferred))
	return nil
}

// GetInfo returns info about transcoing status
func (w *Worker) GetInfo(ctx context.Context) (handler.FileInfo, error) {
	w.logger.Debug("GetInfo is executed")
	return w.info, nil
}

// GetReader returns worker's bytes stream
func (w *Worker) GetReader(ctx context.Context) (io.ReadCloser, error) {
	w.logger.Debug("GetReader is executed, creating current reader...")
	return w.reader, nil
}

// Terminate calls when upload has failed
func (w *Worker) Terminate(ctx context.Context) error {
	w.logger.Debug("Terminating...")
	if w.contentUploader != nil {
		go func() {
			w.wg.Wait()
			w.contentUploader.Rollback()
		}()
	}
	return w.writer.Close()
}

// ConcatUploads calls when upload resumed after fail
func (w *Worker) ConcatUploads(ctx context.Context, partialUploads []handler.Upload) error {
	w.logger.Debug("ConcatUploads was executed, it's not implemented")
	//
	// TODO: load raw source from the Buckup bucket, terminate all workers with same ID and start process again.
	//
	return errors.New("not implemented")
}

// FinishUpload calls when upload finished without errors on the client side
func (w *Worker) FinishUpload(ctx context.Context) error {
	w.logger.Debug("finishing upload...")
	if w.contentUploader != nil {
		go func() {
			w.wg.Wait()
			w.contentUploader.Terminate()
		}()
	}
	return w.writer.Close()
}

// AsConcatableUpload returns tusd handler.ConcatableUpload
func (s *Scheduler) AsConcatableUpload(upload handler.Upload) handler.ConcatableUpload {
	s.logger.Debug("AsConcatableUpload is executed")
	return upload.(*Worker)
}

func (w *Worker) start(ctx context.Context, options *Options) error {
	defer w.logger.Debug("start done")
	w.reader = w.writer.Transpile()
	if err := manifest.GenerateHLSPlaylist(append(options.ScalingLevels, options.Level), options.OuputDir, options.UploadID); err != nil {
		return err
	}
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		var logger = w.logger.With(zap.String("command", "raw"))
		defer logger.Debug("done")

		var args = BuildRawVideoCommand(options)
		var convertSourceCommand, err = newFfmpegCommand(ctx, w.reader, args)
		if err != nil {
			logger.Debug("can not start", zap.Error(err))
		}
		err = convertSourceCommand.Run()
		if err != nil {
			logger.Debug("finished with error", zap.Error(err))
		}
	}()

	if len(options.ScalingLevels) > 0 {
		w.wg.Add(1)
		var scalingCommandReader = w.writer.Transpile()
		go func() {
			defer w.wg.Done()
			var logger = w.logger.With(zap.String("command", "scaling"))
			defer logger.Debug("done")

			var args = BuildScalingVideoCommand(options)
			var convertSourceCommand, err = newFfmpegCommand(ctx, scalingCommandReader, args)
			if err != nil {
				logger.Debug("can not start", zap.Error(err))
			}
			err = convertSourceCommand.Run()
			if err != nil {
				logger.Debug("finished with error", zap.Error(err))
			}
		}()
	}

	return nil
}
