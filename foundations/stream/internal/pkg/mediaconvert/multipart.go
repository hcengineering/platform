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
	"bytes"
	"context"
	"time"

	"github.com/pkg/errors"

	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/storage"
	"github.com/tus/tusd/v2/pkg/handler"
	"go.uber.org/zap"
)

// minimum size for multipart parts (backend requires >=5MiB for all but last part)
const minPartSize = 5 * 1024 * 1024

// MultipartUpload uploads chunks via multipart upload
type MultipartUpload struct {
	logger *zap.Logger
	buffer *bytes.Buffer
	info   handler.FileInfo

	storage     storage.MultipartStorage
	objectName  string
	uploadID    string
	parts       []storage.MultipartPart
	nextPartNum int

	terminated bool
	completed  bool

	bytesWritten  int64
	bytesUploaded int64
}

// NewMultipartUpload creates a new multipart upload
func NewMultipartUpload(
	ctx context.Context,
	multipartStorage storage.MultipartStorage,
	info handler.FileInfo,
	contentType string,
) (*MultipartUpload, error) {
	objectName := info.ID
	uploadID, err := multipartStorage.MultipartUploadStart(ctx, objectName, contentType)
	if err != nil {
		return nil, errors.Wrap(err, "failed to initialize multipart upload")
	}

	logger := log.FromContext(ctx).With(zap.String("multipart", "upload"), zap.String("uploadID", uploadID))

	return &MultipartUpload{
		logger:      logger,
		buffer:      bytes.NewBuffer(nil),
		info:        info,
		storage:     multipartStorage,
		objectName:  objectName,
		uploadID:    uploadID,
		parts:       make([]storage.MultipartPart, 0),
		nextPartNum: 1,
	}, nil
}

// Write writes chunk of data to the storage
func (w *MultipartUpload) Write(ctx context.Context, data []byte) error {
	if w.terminated || w.completed {
		return errors.New("upload already terminated or completed")
	}

	if err := ctx.Err(); err != nil {
		return err
	}

	_, err := w.buffer.Write(data)
	if err != nil {
		return errors.Wrap(err, "failed to write to buffer")
	}
	w.bytesWritten += int64(len(data))

	// flush parts of at least minPartSize
	for w.buffer.Len() >= minPartSize {
		partNum := w.nextPartNum
		partData := w.buffer.Next(minPartSize)

		if err := ctx.Err(); err != nil {
			return err
		}

		part, err := w.storage.MultipartUploadPart(ctx, w.objectName, w.uploadID, partNum, partData)
		if err != nil {
			w.logger.Error("multipart upload part failed", zap.Error(err), zap.Int("partNumber", partNum))
			return errors.Wrap(err, "failed to upload part")
		}

		w.bytesUploaded += int64(len(partData))
		w.parts = append(w.parts, *part)
		w.nextPartNum++
	}

	return nil
}

// Terminate cancels the upload
func (w *MultipartUpload) Terminate(ctx context.Context) error {
	if w.terminated || w.completed {
		return nil
	}
	w.terminated = true

	w.logger.Debug("terminating multipart upload", zap.Int("parts", len(w.parts)))

	// create new context in case the main context is canceled
	cancelCtx := ctx
	if ctx.Err() != nil {
		var cancel context.CancelFunc
		cancelCtx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
	}

	if err := w.storage.MultipartUploadCancel(cancelCtx, w.objectName, w.uploadID); err != nil {
		w.logger.Error("multipart upload cancel failed", zap.Error(err))
		return errors.Wrap(err, "failed to cancel multipart upload")
	}

	w.logger.Debug("multipart upload terminated", zap.Int("parts", len(w.parts)))

	return nil
}

// Complete uploads last bytes and completes the upload
func (w *MultipartUpload) Complete(ctx context.Context) error {
	if w.completed {
		return nil
	}

	if w.terminated {
		return errors.New("cannot complete terminated upload")
	}

	w.logger.Debug("finishing multipart upload", zap.Int("parts", len(w.parts)))

	// flush any remaining data as last part
	if w.buffer.Len() > 0 {
		partNum := w.nextPartNum
		lastData := w.buffer.Bytes()

		part, err := w.storage.MultipartUploadPart(ctx, w.objectName, w.uploadID, partNum, lastData)
		if err != nil {
			w.logger.Error("multipart upload last part failed", zap.Error(err), zap.Int("partNumber", partNum))
			return errors.Wrap(err, "failed to upload last part")
		}

		w.bytesUploaded += int64(len(lastData))
		w.parts = append(w.parts, *part)
	}

	if len(w.parts) == 0 {
		w.logger.Warn("cannot complete upload with no parts")
		return errors.New("cannot complete upload with no parts")
	}

	if err := w.storage.MultipartUploadComplete(ctx, w.objectName, w.uploadID, w.parts); err != nil {
		w.logger.Error("multipart upload complete failed", zap.Error(err))
		return errors.Wrap(err, "failed to complete multipart upload")
	}

	w.completed = true
	w.logger.Info(
		"multipart upload completed",
		zap.Int64("bytesUploaded", w.bytesUploaded),
		zap.Int64("bytesWritten", w.bytesWritten),
	)

	return nil
}
