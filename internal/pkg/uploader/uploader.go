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
	"syscall"
	"time"
	"unsafe"

	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/storage"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"k8s.io/utils/inotify"
)

// See at https://man7.org/linux/man-pages/man7/inotify.7.html
const inotifyCloseWrite uint32 = 0x8 // IN_CLOSE_WRITE
const inotifyMovedFrom uint32 = 0x40 // IN_MOVED_FROM
const inotifyMovedTo uint32 = 0x80   // IN_MOVED_TO
const inotifyDelete uint32 = 0x200   // IN_DELETE

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

	err := os.MkdirAll(opts.Dir, os.ModePerm)
	if err != nil {
		res.logger.Error("can not create upload directory", zap.Error(err), zap.String("dir", opts.Dir))
	}

	return res
}

func (u *uploaderImpl) Stop() {
	u.logger.Info("stopping upload")
	u.stop(false)
}

func (u *uploaderImpl) Cancel() {
	u.logger.Info("canceling upload")
	u.stop(true)
}

func (u *uploaderImpl) scanFiles() {
	logger := u.logger.With(zap.String("dir", u.options.Dir))

	logger.Info("scan files")
	files, err := os.ReadDir(u.options.Dir)
	if err != nil {
		logger.Error("failed to read files", zap.Error(err))
		return
	}

	count := 0
	for _, f := range files {
		if f.IsDir() {
			continue
		}

		var filePath = filepath.Join(u.options.Dir, f.Name())

		// Ignore source file
		if filePath == u.options.SourceFile {
			continue
		}

		if _, uploaded := u.sentFiles.Load(filePath); uploaded {
			logger.Debug("file already uploaded", zap.String("file", filePath))
			continue
		}

		u.filesCh <- filePath
		count++
	}

	logger.Info("scan complete", zap.Int("count", count))
}

func (u *uploaderImpl) stop(rollback bool) {
	// Stop watching for new files
	close(u.watcherStopCh)
	<-u.watcherDoneCh

	// Scan remaining files in the directory
	u.scanFiles()

	// Close filesCh so no new files added
	close(u.filesCh)

	// Wait for all workers to finish processing
	u.workerWaitGroup.Wait()
	u.logger.Debug("workers done")

	// Perform rollback
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

	u.uploadCancel()

	remainingFiles, err := os.ReadDir(u.options.Dir)
	if err != nil && !os.IsNotExist(err) {
		u.logger.Error("failed to read dir", zap.Error(err))
	}
	// log remaining files
	if len(remainingFiles) > 0 {
		files := make([]string, 0, len(remainingFiles))
		for _, entry := range remainingFiles {
			files = append(files, entry.Name())
		}
		u.logger.Info("remaining files", zap.Int("count", len(files)), zap.Any("files", files))
	}

	u.sentFiles.Clear()

	u.logger.Debug("stopped", zap.Bool("rollback", rollback))
}

func (u *uploaderImpl) Start() {
	watcherReady := make(chan struct{})

	u.startWorkers()
	go u.startWatch(watcherReady)

	<-watcherReady

	u.scanFiles()
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
			return
		}

		time.Sleep(u.options.RetryDelay)
	}

	logger.Error("can not delete remote file")
}

func (u *uploaderImpl) uploadAndDelete(f string) {
	var logger = u.logger.With(zap.String("upload and delete", f))
	logger.Debug("uploading file")

	if f == u.options.Dir {
		return
	}

	if err := waitFileExists(f); err != nil {
		if os.IsNotExist(err) {
			logger.Debug("file does not exist", zap.Error(err))
		} else {
			logger.Error("failed to stat file", zap.Error(err))
		}
		return
	}

	// Check if the file has already been uploaded
	var _, ok = u.sentFiles.Load(f)
	if ok && !u.shouldDeleteOnStop(f) {
		logger.Debug("file already uploaded")
		return
	}

	for attempt := range u.options.RetryCount {
		logger = logger.With(zap.Int("attempt", attempt))
		var ctx, cancel = context.WithTimeout(u.uploadCtx, u.options.Timeout)
		var err = u.storage.PutFile(ctx, f)
		cancel()

		if err != nil {
			logger.Error("attempt failed", zap.Error(err))
		} else {
			// Mark the file as uploaded
			u.sentFiles.Store(f, struct{}{})
			logger.Debug("file uploaded")

			// Update the file's parent if SourceFile is set
			if u.options.Source != "" {
				err = u.storage.SetParent(ctx, f, u.options.Source)
				if err != nil {
					logger.Error("can not set blob parent", zap.Error(err), zap.String("filename", f), zap.String("source", u.options.Source))
				}
			}

			// Delete the file locally if it should be deleted
			if !u.shouldDeleteOnStop(f) {
				if err := os.Remove(f); err != nil && !errors.Is(err, syscall.ENOENT) {
					logger.Error("failed to remove file locally", zap.Error(err), zap.String("file", f))
				} else {
					logger.Debug("removed file locally")
				}
			}

			break
		}

		time.Sleep(u.options.RetryDelay)
	}
}

// startWatch watches for changes in the directory and uploads created files
func (u *uploaderImpl) startWatch(ready chan<- struct{}) {
	defer close(u.watcherDoneCh)

	var logger = u.logger.With(zap.String("func", "startWatch"))
	var watcher, err = inotify.NewWatcher()

	if err != nil {
		logger.Error("can not start file watcher", zap.Error(err))
		close(ready)
		return
	}
	defer func() {
		if err := watcher.Close(); err != nil {
			logger.Error("can not close watcher", zap.Error(err))
		}
	}()

	if err := watcher.AddWatch(u.options.Dir, inotifyCloseWrite|inotifyMovedTo|inotifyDelete|inotifyMovedFrom); err != nil {
		logger.Error("can not start watching", zap.Error(err))
		close(ready)
		return
	}

	close(ready)
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
			if event.Name == u.options.Dir ||
				event.Name == u.options.SourceFile ||
				strings.HasSuffix(event.Name, ".tmp") {
				continue
			}

			if event.Mask&(inotifyDelete|inotifyMovedFrom) != 0 {
				logger.Debug("file deleted or moved away", zap.String("event", event.Name), zap.Uint32("mask", event.Mask))
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

func waitFileExists(file string) error {
	var err error
	var stat os.FileInfo

	for range 10 {
		stat, err = os.Stat(file)
		if err == nil && stat.Size() > 0 {
			return nil
		}

		time.Sleep(50 * time.Millisecond)
	}

	return err
}
