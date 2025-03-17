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

// Package uploader provides a mechanism for uploading files to a remote storage.
package uploader

import (
	"context"
	"hash/fnv"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unsafe"

	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/storage"
	"go.uber.org/zap"
	"k8s.io/utils/inotify"
)

// See at https://man7.org/linux/man-pages/man7/inotify.7.html
const inotifyCloseWrite uint32 = 0x8 // IN_CLOSE_WRITE
const inotifyMovedTo uint32 = 0x80   // IN_MOVED_TO

// Uploader represents file uploader
type Uploader interface {
	Start()
	Stop()
	Cancel()
}

type uploaderImpl struct {
	logger  *zap.Logger
	options *Options
	storage storage.Storage

	filesCh chan string

	sentFiles sync.Map // key: string, value: struct{}

	shouldDeleteOnStop func(string) bool

	workersCh []chan func()

	watcherStopCh chan struct{}
	watcherDoneCh chan struct{}

	uploadCtx    context.Context
	uploadCancel context.CancelFunc

	workerWaitGroup sync.WaitGroup
}

// New creates a new instance of uploader
func New(ctx context.Context, s storage.Storage, opts Options) Uploader {
	if s == nil {
		panic("storage should not be nil")
	}

	var res = &uploaderImpl{
		options: &opts,
		storage: s,
		logger:  log.FromContext(ctx).With(zap.String("uploader", opts.Dir)),
		shouldDeleteOnStop: func(s string) bool {
			return strings.HasSuffix(s, "m3u8")
		},
		filesCh:       make(chan string, opts.BufferSize),
		watcherStopCh: make(chan struct{}),
		watcherDoneCh: make(chan struct{}),
	}

	res.workersCh = make([]chan func(), opts.WorkerCount)

	for i := range opts.WorkerCount {
		res.workersCh[i] = make(chan func(), opts.BufferSize)
	}

	res.logger.Sugar().Debugf("uploader config is %v", opts)

	res.uploadCtx, res.uploadCancel = context.WithCancel(context.Background())

	_ = os.MkdirAll(opts.Dir, os.ModePerm)
	res.workerWaitGroup.Add(1)

	go func() {
		defer res.workerWaitGroup.Done()
		initFiles, _ := os.ReadDir(opts.Dir)
		for _, f := range initFiles {
			var filePath = filepath.Join(opts.Dir, f.Name())
			if filePath == opts.SourceFile {
				continue
			}
			res.filesCh <- filePath
		}
	}()

	return res
}

func (u *uploaderImpl) Stop() {
	u.stop(false)
}

func (u *uploaderImpl) Cancel() {
	u.stop(true)
}

func (u *uploaderImpl) stop(rollback bool) {
	close(u.watcherStopCh)
	<-u.watcherDoneCh
	u.logger.Debug("file watch stopped")

	if rollback {
		u.logger.Debug("starting rollback...")
		var i uint32
		u.sentFiles.Range(func(key, _ any) bool {
			i++
			var filename = key.(string)
			u.workersCh[i%u.options.WorkerCount] <- func() {
				u.deleteRemoteFile(filename)
			}
			return true
		})
		u.logger.Debug("rollback done")
	}
	close(u.filesCh)
	u.workerWaitGroup.Wait()
	u.logger.Debug("workers done")

	u.uploadCancel()
	_ = os.RemoveAll(u.options.Dir)
	u.sentFiles.Clear()

	u.logger.Debug("finish done", zap.Bool("cancel", rollback))
}

func (u *uploaderImpl) Start() {
	u.startWorkers()
	u.startWatch()
}

func (u *uploaderImpl) startWorkers() {
	go func() {
		var logger = u.logger.With(zap.String("func", "startWorkers"))
		logger.Debug("fanout goroutine started")
		defer logger.Debug("fanout goroutine stopped")

		h := fnv.New32a()
		for f := range u.filesCh {
			// #nosec
			bytes := unsafe.Slice(unsafe.StringData(f), len(f))
			_, _ = h.Write(bytes)
			id := h.Sum32() % u.options.WorkerCount
			u.workersCh[id] <- func() {
				u.uploadAndDelete(f)
			}
			h.Reset()
		}
		for i := range u.options.WorkerCount {
			close(u.workersCh[i])
		}
	}()

	for i := range u.options.WorkerCount {
		var logger = u.logger.With(zap.Uint32("worker", i))

		u.workerWaitGroup.Add(1)
		go func(index uint32) {
			logger.Debug("start")
			defer logger.Debug("finished")

			defer u.workerWaitGroup.Done()
			for work := range u.workersCh[index] {
				work()
			}
		}(i)
	}
}

func (u *uploaderImpl) deleteRemoteFile(f string) {
	var logger = u.logger.With(zap.String("delete remote", f))
	logger.Debug("deleting remote file")

	for range u.options.RetryCount {
		var ctx, cancel = context.WithTimeout(u.uploadCtx, u.options.Timeout)
		var err = u.storage.DeleteFile(ctx, f)
		cancel()

		if err != nil {
			logger.Error("attempt failed", zap.Error(err))
		} else {
			logger.Debug("file deleted in remote storage")
			break
		}

		time.Sleep(u.options.RetryDelay)
	}

	u.logger.Error("can not delete remote file")
}

func (u *uploaderImpl) uploadAndDelete(f string) {
	var logger = u.logger.With(zap.String("upload and delete", f))
	logger.Debug("uploading file")

	var _, ok = u.sentFiles.Load(f)

	if ok && !u.shouldDeleteOnStop(f) {
		logger.Debug("file already uploaded")
		return
	}

	for range u.options.RetryCount {
		var ctx, cancel = context.WithTimeout(u.uploadCtx, u.options.Timeout)
		var err = u.storage.PutFile(ctx, f)
		cancel()

		if err != nil {
			logger.Error("attempt failed", zap.Error(err))
		} else {
			if !u.shouldDeleteOnStop(f) {
				_ = os.Remove(f)
				logger.Debug("removed file locally")
			}
			u.sentFiles.Store(f, struct{}{})
			logger.Debug("file uploaded")
			break
		}

		time.Sleep(u.options.RetryDelay)
	}
}

func (u *uploaderImpl) startWatch() {
	var logger = u.logger.With(zap.String("func", "startWatch"))
	var watcher, err = inotify.NewWatcher()

	if err != nil {
		logger.Error("can not start file watcher", zap.Error(err))
		return
	}

	if err := watcher.AddWatch(u.options.Dir, inotifyCloseWrite); err != nil {
		logger.Error("can not start watching for close write", zap.Error(err))
		return
	}
	if err := watcher.AddWatch(u.options.Dir, inotifyMovedTo); err != nil {
		logger.Error("can not start watching for moved to", zap.Error(err))
		return
	}
	defer func() {
		_ = watcher.Close()
		close(u.watcherDoneCh)
	}()

	logger.Debug("watching for file updates")
	defer logger.Debug("done")

	for {
		select {
		case <-u.watcherStopCh:
			return
		case event, ok := <-watcher.Event:
			if !ok {
				logger.Error("file channel was closed")
				return
			}
			if !strings.Contains(event.Name, u.options.Dir) {
				continue
			}
			if event.Name == u.options.SourceFile {
				continue
			}
			if strings.HasSuffix(event.Name, "tmp") {
				continue
			}
			logger.Debug("received an event", zap.String("event", event.Name), zap.Uint32("mask", event.Mask))

			u.filesCh <- event.Name
		case err, ok := <-watcher.Error:
			if !ok {
				logger.Error("error channel was closed")
			}
			logger.Error("received an error", zap.Error(err))
		}
	}
}
