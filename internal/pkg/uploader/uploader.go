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

// Package uploader provides objects and functions to work with uploading and monitoring files
package uploader

import (
	"context"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/pkg/errors"

	"github.com/fsnotify/fsnotify"
	"github.com/huly-stream/internal/pkg/config"
	"github.com/huly-stream/internal/pkg/log"
	"go.uber.org/zap"
)

type uploader struct {
	ctx                        context.Context
	cancel                     context.CancelFunc
	baseDir                    string
	uploadID                   string
	masterFiles                sync.Map
	postponeDuration           time.Duration
	sentFiles                  sync.Map
	storage                    Storage
	contexts                   sync.Map
	retryCount                 int
	removeLocalContentOnUpload bool
	eventBufferCount           uint
	isMasterFileFunc           func(s string) bool
}

// Rollback deletes all delivered files and also deletes all local content by uploadID
func (u *uploader) Rollback() {
	log.FromContext(u.ctx).Debug("cancel")
	defer u.cancel()
	u.sentFiles.Range(func(key, value any) bool {
		log.FromContext(u.ctx).Debug("deleting remote file", zap.String("key", key.(string)))
		for range u.retryCount {
			var err = u.storage.DeleteFile(u.ctx, key.(string))
			if err == nil {
				break
			}
			log.FromContext(u.ctx).Debug("can not delete file", zap.Error(err))
		}
		return true
	})
	if !u.removeLocalContentOnUpload {
		return
	}
	u.sentFiles.Range(func(key, value any) bool {
		log.FromContext(u.ctx).Debug("deleting local file", zap.String("key", key.(string)))
		_ = os.Remove(key.(string))
		return true
	})
}

func (u *uploader) Terminate() {
	log.FromContext(u.ctx).Debug("terminate")
	defer u.cancel()
	u.masterFiles.Range(func(key, value any) bool {
		log.FromContext(u.ctx).Debug("uploading master file", zap.String("key", key.(string)))
		for range u.retryCount {
			var uploadErr = u.storage.UploadFile(u.ctx, key.(string))
			if uploadErr == nil {
				break
			}
			log.FromContext(u.ctx).Debug("can not upload file", zap.Error(uploadErr))
		}
		return true
	})
	if !u.removeLocalContentOnUpload {
		return
	}
	u.masterFiles.Range(func(key, value any) bool {
		log.FromContext(u.ctx).Debug("deleting local master file", zap.String("key", key.(string)))
		_ = os.Remove(key.(string))
		return true
	})
	u.sentFiles.Range(func(key, value any) bool {
		log.FromContext(u.ctx).Debug("deleting local file", zap.String("key", key.(string)))
		_ = os.Remove(key.(string))
		return true
	})
}

func (u *uploader) Serve() error {
	var logger = log.FromContext(u.ctx)
	logger = logger.With(zap.String("uploader", u.uploadID), zap.String("dir", u.baseDir))
	var watcher, err = fsnotify.NewBufferedWatcher(u.eventBufferCount)
	if err != nil {
		logger.Error("can not start watcher")
		return err
	}
	if err := watcher.Add(u.baseDir); err != nil {
		return err
	}
	defer func() {
		_ = watcher.Close()
	}()

	logger.Debug("uploader initialized and started to watch")

	for {
		select {
		case <-u.ctx.Done():
			logger.Debug("done")
			return u.ctx.Err()
		case event, ok := <-watcher.Events:
			if !strings.Contains(event.Name, u.uploadID) {
				continue
			}
			if !ok {
				return u.ctx.Err()
			}
			if u.isMasterFileFunc(event.Name) {
				u.masterFiles.Store(event.Name, struct{}{})
				logger.Debug("found master file", zap.String("eventName", event.Name))
				continue
			}
			u.postpone(event.Name, func() {
				logger.Debug("started to upload", zap.String("eventName", event.Name))
				for range u.retryCount {
					var uploadErr = u.storage.UploadFile(u.ctx, event.Name)
					if uploadErr == nil {
						break
					}
					logger.Error("can not upload file", zap.Error(uploadErr))
				}
				logger.Debug("added to sentFiles", zap.String("eventName", event.Name))
				u.sentFiles.Store(event.Name, struct{}{})
			})
		case err, ok := <-watcher.Errors:
			if !ok {
				return u.ctx.Err()
			}
			logger.Error("get an error", zap.Error(err))
		}
	}
}

// Uploader manages content delivering
type Uploader interface {
	Terminate()
	Rollback()
	Serve() error
}

// Storage represents file-based storage
type Storage interface {
	UploadFile(ctx context.Context, fileName string) error
	DeleteFile(ctx context.Context, fileName string) error
}

// New creates a new instance of Uplaoder
func New(ctx context.Context, conf config.Config, uploadID string, metadata map[string]string) (Uploader, error) {
	var uploaderCtx, uploaderCancel = context.WithCancel(ctx)
	var storage Storage
	var err error

	if conf.EndpointURL != nil {
		storage, err = NewStorageByURL(ctx, conf.EndpointURL, metadata)
		if err != nil {
			uploaderCancel()
			return nil, err
		}
	}

	return &uploader{
		ctx:                        uploaderCtx,
		cancel:                     uploaderCancel,
		uploadID:                   uploadID,
		removeLocalContentOnUpload: conf.RemoveContentOnUpload,
		postponeDuration:           time.Second * 2,
		storage:                    storage,
		retryCount:                 5,
		baseDir:                    conf.OutputDir,
		eventBufferCount:           100,
		isMasterFileFunc: func(s string) bool {
			return strings.HasSuffix(s, "m3u8")
		},
	}, nil
}

// NewStorageByURL creates a new storage basd on the type from the url scheme, for example "datalake://my-datalake-endpoint"
func NewStorageByURL(ctx context.Context, u *url.URL, headers map[string]string) (Storage, error) {
	switch u.Scheme {
	case "tus":
		return nil, errors.New("not imlemented yet")
	case "datalake":
		if headers["workspace"] == "" {
			return nil, errors.New("missed workspace in the client's metadata")
		}
		if headers["token"] == "" {
			return nil, errors.New("missed auth token in the client's metadata")
		}
		return NewDatalakeStorage(u.Hostname(), headers["workspace"], headers["token"]), nil
	case "s3":
		return NewS3(ctx, u.Hostname()), nil
	default:
		return nil, errors.New("unknown scheme")
	}
}
