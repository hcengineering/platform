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

// Package mediaconvert provides types and functions for video transcoding
package mediaconvert

import (
	"context"
	"io"
	"os/exec"
	"sync"

	"github.com/pkg/errors"

	"github.com/hcengineering/stream/internal/pkg/manifest"
	"github.com/hcengineering/stream/internal/pkg/sharedpipe"
	"github.com/hcengineering/stream/internal/pkg/storage"
	"github.com/hcengineering/stream/internal/pkg/uploader"
	"github.com/tus/tusd/v2/pkg/handler"
	"go.uber.org/zap"
)

// Stream manages client's input and transcodes it based on the passed configuration
type Stream struct {
	contentUploader uploader.Uploader
	logger          *zap.Logger
	info            handler.FileInfo
	writer          *sharedpipe.Writer
	reader          *sharedpipe.Reader
	storage         storage.Storage
	multipart       *MultipartUpload

	commandGroup sync.WaitGroup
	done         chan struct{}
}

var _ handler.Upload = (*Stream)(nil)
var _ handler.ConcatableUpload = (*Stream)(nil)
var _ handler.TerminatableUpload = (*Stream)(nil)
var _ handler.LengthDeclarableUpload = (*Stream)(nil)

// WriteChunk is called when client sends a chunk of raw data
func (w *Stream) WriteChunk(ctx context.Context, _ int64, src io.Reader) (int64, error) {
	w.logger.Debug("Write Chunk start", zap.Int64("offset", w.info.Offset))
	data, err := io.ReadAll(src)
	if err != nil {
		return 0, err
	}
	// write into pipeline for transcoding
	written, err := w.writer.Write(data)
	if err != nil {
		return int64(written), err
	}

	n := int64(len(data))
	w.info.Offset += n

	if w.multipart != nil {
		if writeErr := w.multipart.Write(ctx, data); writeErr != nil {
			w.logger.Error("multipart upload part failed", zap.Error(writeErr))
			return n, writeErr
		}
	}

	w.logger.Debug("write chunk end", zap.Int64("offset", w.info.Offset), zap.Error(err))
	return n, nil
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
	w.logger.Debug("terminate upload")

	// Close the writer first to signal EOF to all readers
	if err := w.writer.Close(); err != nil {
		w.logger.Error("failed to close writer", zap.Error(err))
		return err
	}

	var wg sync.WaitGroup

	// cancel upload if in progress
	if w.contentUploader != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			w.commandGroup.Wait()
			w.contentUploader.Cancel()
		}()
	}

	// cancel multipart upload if in progress
	if w.multipart != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := w.multipart.Terminate(ctx); err != nil {
				w.logger.Error("multipart upload cancel failed", zap.Error(err))
			}
		}()
	}

	wg.Wait()

	return nil
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
	w.logger.Debug("finish upload")

	// Close the writer first to signal EOF to all readers
	if err := w.writer.Close(); err != nil {
		w.logger.Error("failed to close writer", zap.Error(err))
		return err
	}

	var wg sync.WaitGroup

	if w.contentUploader != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			w.commandGroup.Wait()
			w.contentUploader.Stop()
		}()
	}

	// finalize raw multipart stream if supported
	if w.multipart != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := w.multipart.Complete(ctx); err != nil {
				w.logger.Error("multipart upload complete failed", zap.Error(err))
				return
			}

			if metaProvider, ok := w.storage.(storage.MetaProvider); ok {
				metaErr := metaProvider.PatchMeta(
					ctx,
					w.info.ID,
					&storage.Metadata{
						"hls": map[string]any{
							"source":    w.info.ID + "_master.m3u8",
							"thumbnail": w.info.ID + ".jpg",
						},
					},
				)
				if metaErr != nil {
					w.logger.Error("can not patch the source file", zap.Error(metaErr))
				}
			}
		}()
	}

	wg.Wait()

	return nil
}

// AsConcatableUpload returns tusd handler.ConcatableUpload
func (s *StreamCoordinator) AsConcatableUpload(upload handler.Upload) handler.ConcatableUpload {
	s.logger.Debug("AsConcatableUpload is executed")
	return upload.(*Stream)
}

func (w *Stream) start(ctx context.Context, options *Options) error {
	defer w.logger.Debug("start done")
	w.reader = w.writer.Transpile()
	if err := manifest.GenerateHLSPlaylist(options.Profiles, options.OutputDir, options.UploadID); err != nil {
		return err
	}

	var argsSlice = [][]string{
		BuildThumbnailCommand(options),
		BuildVideoCommand(options),
	}

	var cmds []*exec.Cmd
	for idx, args := range argsSlice {
		reader := w.reader
		if idx > 0 {
			reader = w.writer.Transpile()
		}

		cmd, cmdErr := newFfmpegCommand(ctx, reader, args)
		if cmdErr != nil {
			w.logger.Error("can not create a new command", zap.Error(cmdErr), zap.Strings("args", args))
			return errors.Wrapf(cmdErr, "can not create a new command")
		}
		cmds = append(cmds, cmd)
	}

	w.commandGroup.Add(1)
	go func() {
		defer w.commandGroup.Done()
		executor := NewCommandExecutor(ctx)
		if execErr := executor.Execute(cmds); execErr != nil {
			w.logger.Error("can not execute command", zap.Error(execErr))
		}
	}()

	go w.contentUploader.Start()

	return nil
}
