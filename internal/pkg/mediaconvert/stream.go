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

// Package mediaconvert provides types and functions for video trnascoding
package mediaconvert

import (
	"context"
	"io"
	"sync"

	"github.com/pkg/errors"

	"github.com/hcengineering/stream/internal/pkg/manifest"
	"github.com/hcengineering/stream/internal/pkg/sharedpipe"
	"github.com/hcengineering/stream/internal/pkg/uploader"
	"github.com/tus/tusd/v2/pkg/handler"
	"go.uber.org/zap"
)

// Stream manages client's input and transcodes it based on the passsed configuration
type Stream struct {
	contentUploader uploader.Uploader
	logger          *zap.Logger
	info            handler.FileInfo
	writer          *sharedpipe.Writer
	reader          *sharedpipe.Reader

	commandGroup sync.WaitGroup
	done         chan struct{}
}

// WriteChunk calls when client sends a chunk of raw data
func (w *Stream) WriteChunk(ctx context.Context, _ int64, src io.Reader) (int64, error) {
	w.logger.Debug("Write Chunk start", zap.Int64("offset", w.info.Offset))
	var bytes, err = io.ReadAll(src)
	_, _ = w.writer.Write(bytes)
	var n = int64(len(bytes))
	w.info.Offset += n
	w.logger.Debug("Write Chunk end", zap.Int64("offset", w.info.Offset), zap.Error(err))
	return n, err
}

// DeclareLength sets length of the video input
func (w *Stream) DeclareLength(ctx context.Context, length int64) error {
	w.info.Size = length
	w.info.SizeIsDeferred = false
	w.logger.Debug("DeclareLength", zap.Int64("size", length), zap.Bool("SizeIsDeferred", w.info.SizeIsDeferred))
	return nil
}

// GetInfo returns info about transcoing status
func (w *Stream) GetInfo(ctx context.Context) (handler.FileInfo, error) {
	w.logger.Debug("GetInfo is executed")
	return w.info, nil
}

// GetReader returns Stream's bytes stream
func (w *Stream) GetReader(ctx context.Context) (io.ReadCloser, error) {
	w.logger.Debug("GetReader is executed, creating current reader...")
	return w.reader, nil
}

// Terminate calls when upload has failed
func (w *Stream) Terminate(ctx context.Context) error {
	w.logger.Debug("Terminating...")
	if w.contentUploader != nil {
		go func() {
			w.commandGroup.Wait()
			w.contentUploader.Cancel()
		}()
	}
	return w.writer.Close()
}

// ConcatUploads calls when upload resumed after fail
func (w *Stream) ConcatUploads(ctx context.Context, partialUploads []handler.Upload) error {
	w.logger.Debug("ConcatUploads was executed, it's not implemented")
	//
	// TODO: load raw source from the Buckup bucket, terminate all Streams with same ID and start process again.
	//
	return errors.New("not implemented")
}

// FinishUpload calls when upload finished without errors on the client side
func (w *Stream) FinishUpload(ctx context.Context) error {
	w.logger.Debug("finishing upload...")

	if w.contentUploader != nil {
		go func() {
			w.commandGroup.Wait()
			w.contentUploader.Stop()
		}()
	}

	return w.writer.Close()
}

// AsConcatableUpload returns tusd handler.ConcatableUpload
func (s *StreamCoordinator) AsConcatableUpload(upload handler.Upload) handler.ConcatableUpload {
	s.logger.Debug("AsConcatableUpload is executed")
	return upload.(*Stream)
}

func (w *Stream) start(ctx context.Context, options *Options) error {
	defer w.logger.Debug("start done")
	w.reader = w.writer.Transpile()
	if err := manifest.GenerateHLSPlaylist(append(options.ScalingLevels, options.Level), options.OuputDir, options.UploadID); err != nil {
		return err
	}
	w.commandGroup.Add(1)
	go func() {
		defer w.commandGroup.Done()
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
		w.commandGroup.Add(1)
		var scalingCommandReader = w.writer.Transpile()

		go func() {
			defer w.commandGroup.Done()
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

	go w.contentUploader.Start()

	return nil
}
