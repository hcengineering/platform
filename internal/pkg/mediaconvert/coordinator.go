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

package mediaconvert

import (
	"context"
	"fmt"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/pkg/errors"

	"github.com/google/uuid"
	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
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

	activeTranscoding int32

	mainContext context.Context
	logger      *zap.Logger

	streams sync.Map
	cancels sync.Map
}

var _ handler.DataStore = (*StreamCoordinator)(nil)
var _ handler.ConcaterDataStore = (*StreamCoordinator)(nil)
var _ handler.TerminaterDataStore = (*StreamCoordinator)(nil)
var _ handler.LengthDeferrerDataStore = (*StreamCoordinator)(nil)

// NewStreamCoordinator creates a new scheduler for transcode operations.
func NewStreamCoordinator(ctx context.Context, c *config.Config) *StreamCoordinator {
	return &StreamCoordinator{
		conf: c,
		uploadOptions: uploader.Options{
			RetryDelay:  time.Millisecond * 100,
			Timeout:     c.Timeout,
			WorkerCount: uint32(c.MaxThreadCount),
			RetryCount:  10,
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
		logger: log.FromContext(s.mainContext).With(zap.String("stream", info.ID)),
		done:   make(chan struct{}),
	}

	if atomic.AddInt32(&s.activeTranscoding, 1) > int32(s.conf.MaxParallelTranscodingCount) {
		atomic.AddInt32(&s.activeTranscoding, -1)
		s.logger.Debug("run out of resources for scaling")
		// TODO do not transcode
	}

	width, err := strconv.Atoi(info.MetaData["width"])
	if err != nil {
		return nil, errors.Wrapf(err, "can not parse video width: %v", info.MetaData["width"])
	}

	height, err := strconv.Atoi(info.MetaData["height"])
	if err != nil {
		return nil, errors.Wrapf(err, "can not parse video height: %v", info.MetaData["height"])
	}

	meta := VideoMeta{
		Width:       width,
		Height:      height,
		Codec:       extractCodec(info.MetaData["contentType"]),
		ContentType: extractContentType(info.MetaData["contentType"]),
	}
	profiles := FastTranscodingProfiles(meta)

	var commandOptions = Options{
		Input:     "pipe:0",
		OutputDir: s.conf.OutputDir,
		Threads:   s.conf.MaxThreadCount,
		UploadID:  info.ID,
		Profiles:  profiles,
	}

	if s.conf.EndpointURL != nil {
		s.logger.Sugar().Debugf("initializing uploader for %v", info)

		// setup content uploader for transcoded outputs
		var opts = s.uploadOptions
		opts.Dir = filepath.Join(opts.Dir, info.ID)

		// create storage backend
		var stg, err = storage.NewStorageByURL(s.mainContext, s.conf.Endpoint(), s.conf.EndpointURL.Scheme, info.MetaData["token"], info.MetaData["workspace"])
		if err != nil {
			s.logger.Error("can not create storage by url", zap.Error(err))
			return nil, errors.Wrapf(err, "can not create storage")
		}
		stream.storage = stg

		// if storage supports multipart, initialize raw upload
		if ms, ok := stg.(storage.MultipartStorage); ok {
			multipart, err := NewMultipartUpload(s.mainContext, ms, info, meta.ContentType)
			if err != nil {
				s.logger.Error("multipart upload failed", zap.Error(err))
				return nil, errors.Wrapf(err, "multipart upload failed")
			}
			stream.multipart = multipart
		}
		// uploader for processed outputs
		var contentUploader = uploader.New(s.mainContext, stg, opts)
		stream.contentUploader = contentUploader
	}

	s.streams.Store(stream.info.ID, stream)
	if err := stream.start(s.mainContext, &commandOptions); err != nil {
		return nil, err
	}

	go func() {
		stream.commandGroup.Wait()
		atomic.AddInt32(&s.activeTranscoding, -1)
		close(stream.done)
	}()

	s.manageTimeout(stream)

	s.logger.Debug("NewUpload", zap.String("done", info.ID))
	return stream, nil
}

// GetUpload returns current a worker based on upload id
func (s *StreamCoordinator) GetUpload(ctx context.Context, id string) (upload handler.Upload, err error) {
	logger := s.logger.With(zap.String("func", "GetUpload")).With(zap.String("id", id))

	if v, ok := s.streams.Load(id); ok {
		logger.Debug("found stream")
		var w = v.(*Stream)
		s.manageTimeout(w)
		return w, nil
	}

	logger.Warn("stream not found")
	return nil, fmt.Errorf("stream not found: %v", id)
}

// AsTerminatableUpload returns tusd handler.TerminatableUpload
func (s *StreamCoordinator) AsTerminatableUpload(upload handler.Upload) handler.TerminatableUpload {
	return upload.(*Stream)
}

// AsLengthDeclarableUpload returns tusd handler.LengthDeclarableUpload
func (s *StreamCoordinator) AsLengthDeclarableUpload(upload handler.Upload) handler.LengthDeclarableUpload {
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
			s.streams.Delete(w.info.ID)
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
			s.streams.Delete(w.info.ID)
		}
	}()
}

func extractCodec(mimeType string) string {
	codecRegex := regexp.MustCompile(`codecs["\s=]+([^",\s]+)`)
	matches := codecRegex.FindStringSubmatch(mimeType)
	codec := "unknown"
	if len(matches) > 1 {
		codec = matches[1]
	}

	return codec
}

func extractContentType(mimeType string) string {
	contentType := "video/mp4"
	parts := strings.Split(mimeType, ";")
	if parts[0] != "" {
		contentType = strings.TrimSpace(parts[0])
	}
	return contentType
}
