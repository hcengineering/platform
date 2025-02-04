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
	"strings"
	"sync"

	"github.com/pkg/errors"

	"github.com/google/uuid"
	"github.com/huly-stream/internal/pkg/config"
	"github.com/huly-stream/internal/pkg/log"
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

	s.logger.Debug("NewUpload", zap.String("ID", info.ID))

	var result = &Worker{
		done:   make(chan struct{}),
		writer: sharedpipe.NewWriter(),
		info:   info,
		logger: log.FromContext(s.mainContext).With(zap.String("Worker", info.ID)),
	}

	var resolutions = strings.Split(info.MetaData["resolutions"], ",")

	var commandOptions = Options{
		OuputDir:    s.conf.OutputDir,
		Threads:     s.conf.MaxThreads,
		UploadID:    info.ID,
		Resolutions: resolutions,
	}

	result.cost = measure(&commandOptions)

	if !s.limiter.TryConsume(result.cost) {
		s.logger.Error("run out of resources")
		return nil, errors.New("run out of resources")
	}

	if s.conf.EndpointURL != nil {
		s.logger.Debug("found endpoint url in the config, starting uploader...")
		var contentUploader, err = uploader.New(s.mainContext, *s.conf, info.ID, info.MetaData)
		if err != nil {
			return nil, err
		}
		result.contentUploader = contentUploader
		go func() {
			var serverErr = result.contentUploader.Serve()
			result.logger.Debug("content uploader has finished", zap.Error(serverErr))
		}()
	}

	s.workers.Store(result.info.ID, result)
	s.logger.Sugar().Debugf("New Upload: info %v", result.info)
	if err := result.start(s.mainContext, &commandOptions); err != nil {
		return nil, err
	}
	return result, nil
}

// GetUpload returns current a worker based on upload id
func (s *Scheduler) GetUpload(ctx context.Context, id string) (upload handler.Upload, err error) {
	if v, ok := s.workers.Load(id); ok {
		s.logger.Debug("GetUpload: found worker by id", zap.String("id", id))
		return v.(*Worker), nil
	}
	s.logger.Debug("GetUpload: worker not found", zap.String("id", id))
	return nil, errors.New("bad id")
}

// AsTerminatableUpload returns tusd handler.TerminatableUpload
func (s *Scheduler) AsTerminatableUpload(upload handler.Upload) handler.TerminatableUpload {
	var worker = upload.(*Worker)
	s.logger.Debug("AsTerminatableUpload, trying to return capacity", zap.Int64("cost", worker.cost))
	s.limiter.ReturnCapacity(worker.cost)
	return worker
}

// AsLengthDeclarableUpload returns tusd handler.LengthDeclarableUpload
func (s *Scheduler) AsLengthDeclarableUpload(upload handler.Upload) handler.LengthDeclarableUpload {
	s.logger.Debug("AsLengthDeclarableUpload")
	return upload.(*Worker)
}
