//
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
//

package transcoder

import (
	"context"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/pkg/errors"

	"github.com/google/uuid"
	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/resconv"
	"github.com/hcengineering/stream/internal/pkg/sharedpipe"
	"github.com/hcengineering/stream/internal/pkg/storage"
	"github.com/hcengineering/stream/internal/pkg/uploader"
	"github.com/tus/tusd/v2/pkg/handler"
	"go.uber.org/zap"
)

// StreamCoordinator represents manager for streams. It creates a new stream for a client and manages it's life cycle.
type StreamCoordinator struct {
	conf          *config.Config
	uploadOptions uploader.Options

	activeScalling int32

	mainContext context.Context
	logger      *zap.Logger

	streams sync.Map
	cancels sync.Map
}

// NewStreamCoordinator creates a new scheduler for transcode operations.
func NewStreamCoordinator(ctx context.Context, c *config.Config) *StreamCoordinator {
	return &StreamCoordinator{
		conf: c,
		uploadOptions: uploader.Options{
			RetryDelay:  time.Millisecond * 100,
			Timeout:     c.Timeout,
			WorkerCount: uint32(c.MaxThreadCount),
			RetryCount:  5,
			BufferSize:  128,
			Dir:         c.OutputDir,
		},
		mainContext: ctx,
		logger:      log.FromContext(ctx).With(zap.String("Scheduler", c.OutputDir)),
	}
}

// NewUpload creates a new worker with passed parameters
func (s *StreamCoordinator) NewUpload(ctx context.Context, info handler.FileInfo) (handler.Upload, error) {
	if info.ID == "" {
		info.ID = uuid.NewString()
	}
	s.logger.Sugar().Debugf("stream: %v", info)
	s.logger.Debug("NewUpload", zap.String("ID", info.ID))

	var stream = &Stream{
		writer: sharedpipe.NewWriter(),
		info:   info,
		logger: log.FromContext(s.mainContext).With(zap.String("worker", info.ID)),
		done:   make(chan struct{}),
	}

	var scaling = resconv.SubLevels(info.MetaData["resolution"])
	var level = resconv.Level(info.MetaData["resolution"])
	var cost int64

	for _, scale := range scaling {
		cost += int64(resconv.Pixels(resconv.Resolution(scale)))
	}

	if atomic.AddInt32(&s.activeScalling, 1) > int32(s.conf.MaxParallelScalingCount) {
		atomic.AddInt32(&s.activeScalling, -1)
		s.logger.Debug("run out of resources for scaling")
		scaling = nil
	}

	var commandOptions = Options{
		Input:         "pipe:0",
		OuputDir:      s.conf.OutputDir,
		Threads:       s.conf.MaxThreadCount,
		UploadID:      info.ID,
		Level:         level,
		ScalingLevels: scaling,
	}

	if s.conf.EndpointURL != nil {
		s.logger.Sugar().Debugf("initializing uploader for %v", info)
		var opts = s.uploadOptions
		opts.Dir = filepath.Join(opts.Dir, info.ID)

		var storage, err = storage.NewStorageByURL(s.mainContext, s.conf.Endpoint(), s.conf.EndpointURL.Scheme, info.MetaData["token"], info.MetaData["workspace"])
		if err != nil {
			s.logger.Error("can not create storage by url")
			return nil, err
		}
		var contentUploader = uploader.New(s.mainContext, storage, opts)

		stream.contentUploader = contentUploader
	}

	s.streams.Store(stream.info.ID, stream)
	if err := stream.start(s.mainContext, &commandOptions); err != nil {
		return nil, err
	}

	go func() {
		stream.commandGroup.Wait()
		if scaling != nil {
			atomic.AddInt32(&s.activeScalling, -1)
		}
		s.logger.Debug("returned capacity", zap.Int64("capacity", cost))
		close(stream.done)
	}()

	s.manageTimeout(stream)

	s.logger.Debug("NewUpload", zap.String("done", info.ID))
	return stream, nil
}

// GetUpload returns current a worker based on upload id
func (s *StreamCoordinator) GetUpload(ctx context.Context, id string) (upload handler.Upload, err error) {
	if v, ok := s.streams.Load(id); ok {
		s.logger.Debug("GetUpload: found worker by id", zap.String("id", id))
		var w = v.(*Stream)
		s.manageTimeout(w)
		return w, nil
	}
	s.logger.Debug("GetUpload: worker not found", zap.String("id", id))
	return nil, errors.New("bad id")
}

// AsTerminatableUpload returns tusd handler.TerminatableUpload
func (s *StreamCoordinator) AsTerminatableUpload(upload handler.Upload) handler.TerminatableUpload {
	var worker = upload.(*Stream)
	s.logger.Debug("AsTerminatableUpload")
	return worker
}

// AsLengthDeclarableUpload returns tusd handler.LengthDeclarableUpload
func (s *StreamCoordinator) AsLengthDeclarableUpload(upload handler.Upload) handler.LengthDeclarableUpload {
	s.logger.Debug("AsLengthDeclarableUpload")
	return upload.(*Stream)
}

func (s *StreamCoordinator) manageTimeout(w *Stream) {
	var cancelCtx, cancel = context.WithCancel(context.Background())
	if v, ok := s.cancels.Load(w.info.ID); ok {
		v.(context.CancelFunc)()
	}
	s.cancels.Store(w.info.ID, cancel)
	go func() {
		select {
		case <-w.done:
			w.logger.Debug("stream has finished")
			s.cancels.Delete(w.info.ID)
			return
		case <-cancelCtx.Done():
			w.logger.Debug("stream timeout has refreshed")
			return
		case <-time.After(s.conf.Timeout):
			w.logger.Error("stream timeout")
			s.cancels.Delete(w.info.ID)
			var terminateCtx, terminateCancel = context.WithTimeout(context.Background(), s.conf.Timeout)
			defer terminateCancel()
			_ = w.Terminate(terminateCtx)
		}
	}()
}
