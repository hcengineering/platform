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

package transcoding

import (
	"context"
	"sync"
	"time"

	"github.com/pkg/errors"

	"github.com/google/uuid"
	"github.com/huly-stream/internal/pkg/config"
	"github.com/huly-stream/internal/pkg/log"
	"github.com/huly-stream/internal/pkg/resconv"
	"github.com/huly-stream/internal/pkg/sharedpipe"
	"github.com/huly-stream/internal/pkg/uploader"
	"github.com/tus/tusd/v2/pkg/handler"
	"go.uber.org/zap"
)

// Scheduler represents manager for worker. It creates a new worker for clients and manages its life cycle.
type Scheduler struct {
	conf *config.Config

	limiter *Limiter

	mainContext context.Context
	logger      *zap.Logger
	workers     sync.Map
	cancels     sync.Map
}

// NewScheduler creates a new scheduler for transcode operations.
func NewScheduler(ctx context.Context, c *config.Config) *Scheduler {
	return &Scheduler{
		conf:        c,
		limiter:     NewLimiter(c.MaxCapacity),
		mainContext: ctx,
		logger:      log.FromContext(ctx).With(zap.String("Scheduler", c.OutputDir)),
	}
}

// NewUpload creates a new worker with passed parameters
func (s *Scheduler) NewUpload(ctx context.Context, info handler.FileInfo) (handler.Upload, error) {
	if info.ID == "" {
		info.ID = uuid.NewString()
	}
	s.logger.Sugar().Debugf("upload: %v", info)
	s.logger.Debug("NewUpload", zap.String("ID", info.ID))

	var worker = &Worker{
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

	if !s.limiter.TryConsume(cost) {
		s.logger.Debug("run out of resources for scaling")
		scaling = nil
	}

	var commandOptions = Options{
		OuputDir:      s.conf.OutputDir,
		Threads:       s.conf.MaxThreads,
		UploadID:      info.ID,
		Level:         level,
		ScalingLevels: scaling,
	}

	if s.conf.EndpointURL != nil {
		s.logger.Sugar().Debugf("initializing uploader for %v", info)
		var contentUploader, err = uploader.New(s.mainContext, s.conf.OutputDir, s.conf.EndpointURL, info)
		if err != nil {
			s.logger.Error("can not create uploader", zap.Error(err))
			return nil, err
		}

		worker.contentUploader = contentUploader
		go func() {
			var serverErr = worker.contentUploader.Serve()
			worker.logger.Debug("content uploader has finished", zap.Error(serverErr))
		}()
	}
	s.workers.Store(worker.info.ID, worker)
	if err := worker.start(s.mainContext, &commandOptions); err != nil {
		return nil, err
	}

	go func() {
		worker.wg.Wait()
		s.limiter.ReturnCapacity(cost)
		s.logger.Debug("returned capacity", zap.Int64("capacity", cost))
		close(worker.done)
	}()

	s.logger.Debug("NewUpload", zap.String("done", info.ID))
	return worker, nil
}

// GetUpload returns current a worker based on upload id
func (s *Scheduler) GetUpload(ctx context.Context, id string) (upload handler.Upload, err error) {
	if v, ok := s.workers.Load(id); ok {
		s.logger.Debug("GetUpload: found worker by id", zap.String("id", id))
		var w = v.(*Worker)
		var cancelCtx, cancel = context.WithCancel(context.Background())
		if v, ok := s.cancels.Load(id); ok {
			v.(context.CancelFunc)()
		}
		s.cancels.Store(id, cancel)
		go func() {
			select {
			case <-w.done:
				w.logger.Debug("upload timeout just canceled")
				s.cancels.Delete(id)
				return
			case <-cancelCtx.Done():
				w.logger.Debug("upload refreshed")
				return
			case <-time.After(s.conf.Timeout):
				w.logger.Debug("upload timeout")
				s.cancels.Delete(id)
				var terminateCtx, terminateCancel = context.WithTimeout(context.Background(), s.conf.Timeout)
				defer terminateCancel()
				_ = w.Terminate(terminateCtx)
			}
		}()
		return w, nil
	}
	s.logger.Debug("GetUpload: worker not found", zap.String("id", id))
	return nil, errors.New("bad id")
}

// AsTerminatableUpload returns tusd handler.TerminatableUpload
func (s *Scheduler) AsTerminatableUpload(upload handler.Upload) handler.TerminatableUpload {
	var worker = upload.(*Worker)
	s.logger.Debug("AsTerminatableUpload")
	return worker
}

// AsLengthDeclarableUpload returns tusd handler.LengthDeclarableUpload
func (s *Scheduler) AsLengthDeclarableUpload(upload handler.Upload) handler.LengthDeclarableUpload {
	s.logger.Debug("AsLengthDeclarableUpload")
	return upload.(*Worker)
}
