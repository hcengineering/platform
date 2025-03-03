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
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/pkg/errors"
	"github.com/tus/tusd/v2/pkg/handler"

	"github.com/fsnotify/fsnotify"
	"github.com/huly-stream/internal/pkg/config"
	"github.com/huly-stream/internal/pkg/log"
	"go.uber.org/zap"
)

type uploader struct {
	done             chan struct{}
	waitJobs         sync.WaitGroup
	ctx              context.Context
	cancel           context.CancelFunc
	baseDir          string
	uploadID         string
	postponeDuration time.Duration
	sentFiles        sync.Map
	storage          Storage
	contexts         sync.Map
	retryCount       int
	eventBufferCount uint
}

func (u *uploader) retry(action func() error) {
	var delay = time.Millisecond * 50
	for range u.retryCount {
		if err := action(); err == nil {
			return
		}
		time.Sleep(delay)
		delay *= 2
	}
}

// Rollback deletes all delivered files and also deletes all local content by uploadID
func (u *uploader) Rollback() {
	logger := log.FromContext(u.ctx).With(zap.String("uploader", "Rollback"))
	logger.Debug("starting")
	defer logger.Debug("done")

	u.postpone("", func(ctx context.Context) {
		u.sentFiles.Range(func(key, value any) bool {
			logger.Debug("deleting remote file", zap.String("key", key.(string)))
			u.retry(func() error { return u.storage.DeleteFile(ctx, key.(string)) })
			return true
		})
	})

	u.Terminate()
}

// Terminate deletes
func (u *uploader) Terminate() {
	logger := log.FromContext(u.ctx).With(zap.String("uploader", "Terminate"))
	logger.Debug("starting")

	go func() {
		defer logger.Debug("done")
		u.waitJobs.Wait()
		u.cancel()
	}()
}

func (u *uploader) uploadAndDelte(fileName string) {
	u.postpone(fileName+"-del", func(context.Context) {})
	u.postpone(fileName, func(ctx context.Context) {
		u.retry(func() error { return u.storage.UploadFile(ctx, fileName) })
		u.postpone(fileName+"-del", func(context.Context) {
			_ = os.Remove(fileName)
		})
	})

	u.sentFiles.Store(fileName, struct{}{})
}

func (u *uploader) Serve() error {
	var logger = log.FromContext(u.ctx).With(zap.String("uploader", u.uploadID), zap.String("dir", u.baseDir))
	var watcher, err = fsnotify.NewBufferedWatcher(u.eventBufferCount)
	defer close(u.done)

	if err != nil {
		logger.Error("can not start watcher")
		return err
	}

	_ = os.MkdirAll(u.baseDir, os.ModePerm)
	initFiles, _ := os.ReadDir(u.baseDir)
	for _, f := range initFiles {
		var filePath = filepath.Join(u.baseDir, f.Name())
		u.uploadAndDelte(filePath)
	}

	if err := watcher.Add(u.baseDir); err != nil {
		return err
	}

	defer func() {
		_ = watcher.Close()
	}()

	logger.Debug("uploader has initialized and started watching")
	defer logger.Debug("done")

	for {
		select {
		case <-u.ctx.Done():
			return u.ctx.Err()
		case event, ok := <-watcher.Events:
			if !ok {
				return u.ctx.Err()
			}
			if strings.HasSuffix(event.Name, "tmp") {
				continue
			}
			if !strings.Contains(event.Name, u.uploadID) {
				continue
			}
			u.uploadAndDelte(event.Name)
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
func New(ctx context.Context, baseDir string, endpointURL *url.URL, uploadInfo handler.FileInfo) (Uploader, error) {
	var uploaderCtx, uploadCancel = context.WithCancel(context.Background())
	uploaderCtx = log.WithLoggerFields(uploaderCtx)

	var storage Storage
	var err error

	storage, err = NewStorageByURL(uploaderCtx, endpointURL, uploadInfo.MetaData)
	if err != nil {
		uploadCancel()
		return nil, err
	}

	return &uploader{
		ctx:              uploaderCtx,
		cancel:           uploadCancel,
		done:             make(chan struct{}),
		uploadID:         uploadInfo.ID,
		postponeDuration: time.Second * 2,
		storage:          storage,
		retryCount:       10,
		baseDir:          filepath.Join(baseDir, uploadInfo.ID),
		eventBufferCount: 100,
	}, nil
}

// NewStorageByURL creates a new storage basd on the type from the url scheme, for example "datalake://my-datalake-endpoint"
func NewStorageByURL(ctx context.Context, u *url.URL, headers map[string]string) (Storage, error) {
	var workspace = headers["workspace"]
	if workspace == "" {
		return nil, errors.New("missed workspace in the client's metadata")
	}
	c, _ := config.FromEnv()
	switch u.Scheme {
	case "tus":
		return nil, errors.New("not imlemented yet")
	case "datalake":
		if headers["token"] == "" {
			return nil, errors.New("missed auth token in the client's metadata")
		}
		return NewDatalakeStorage(c.Endpoint().String(), workspace, headers["token"]), nil
	case "s3":
		return NewS3(ctx, c.Endpoint().String(), workspace), nil
	default:
		return nil, errors.New("unknown scheme")
	}
}
