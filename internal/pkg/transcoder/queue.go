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
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/manifest"
	"github.com/hcengineering/stream/internal/pkg/resconv"
	"github.com/hcengineering/stream/internal/pkg/storage"
	"github.com/hcengineering/stream/internal/pkg/token"
	"github.com/hcengineering/stream/internal/pkg/uploader"
	"go.uber.org/zap"
	"gopkg.in/vansante/go-ffprobe.v2"
)

// HLS represents metadata for transcoding result
type HLS struct {
	Source string `json:"source"`
}

// Task represents transcoding task
type Task struct {
	ID        string
	Status    string
	Source    string
	Format    string
	Workspace string
	Metadata  map[string]string
}

// Scheduler manages transcoding tasks by passed config
type Scheduler struct {
	logger *zap.Logger
	taskCh chan *Task
	cfg    *config.Config
	ctx    context.Context
}

// Schedule schedules a task to transcode
func (p *Scheduler) Schedule(t *Task) {
	t.ID = uuid.NewString()
	t.Status = "planned"

	select {
	case p.taskCh <- t:
		p.logger.Sugar().Debugf("task %v is scheduled", t)
	default:
		p.logger.Error("task channel is full")
	}
}

// NewScheduler creates a new instance of transcoding task scheduler
func NewScheduler(ctx context.Context, cfg *config.Config) *Scheduler {
	var p = &Scheduler{
		taskCh: make(chan *Task, 128),
		cfg:    cfg,
		ctx:    ctx,
		logger: log.FromContext(ctx).With(zap.String("transcoding", "planner")),
	}

	go p.start()

	return p
}

func (p *Scheduler) start() {
	go func() {
		<-p.ctx.Done()
		close(p.taskCh)
	}()

	for range p.cfg.MaxParallelScalingCount {
		go func() {
			for task := range p.taskCh {
				p.processTask(p.ctx, task)
			}
		}()
	}
}

func (p *Scheduler) processTask(ctx context.Context, task *Task) {
	var logger = p.logger.With(zap.String("task-id", task.ID))

	logger.Debug("start")
	defer logger.Debug("finished")

	logger.Debug("phase 1: get a token")
	var tokenString, err = token.NewToken(p.cfg.ServerSecret, task.Workspace, "stream", "datalake")
	if err != nil {
		logger.Error("can not create token", zap.Error(err))
		return
	}

	logger.Debug("phase 2: preparing fs")
	var destinationFolder = filepath.Join(p.cfg.OutputDir, task.ID)
	var _, filename = filepath.Split(task.Source)
	var sourceFilePath = filepath.Join(destinationFolder, filename)
	_ = os.MkdirAll(destinationFolder, os.ModePerm)

	logger.Debug("phase 3: get the remote file")

	remoteStorage, err := storage.NewStorageByURL(ctx, p.cfg.Endpoint(), p.cfg.EndpointURL.Scheme, tokenString, task.Workspace)

	if err != nil {
		logger.Error("can not create storage by url", zap.Error(err))
		_ = os.RemoveAll(destinationFolder)
		return
	}

	if err = remoteStorage.GetFile(ctx, task.Source, sourceFilePath); err != nil {
		logger.Error("can not download a file", zap.Error(err))
		_ = os.RemoveAll(destinationFolder)
		// TODO: reschedule
		return
	}

	logger.Debug("phase 4: prepare to transcode")
	probe, err := ffprobe.ProbeURL(ctx, sourceFilePath)
	if err != nil {
		logger.Error("can not get probe for a file", zap.Error(err), zap.String("filepath", sourceFilePath))
		_ = os.RemoveAll(destinationFolder)
		return
	}

	var res = fmt.Sprintf("%v:%v", probe.FirstVideoStream().Width, probe.FirstVideoStream().Height)
	var level = resconv.Level(res)
	var opts = Options{
		Input:         sourceFilePath,
		OuputDir:      p.cfg.OutputDir,
		Level:         level,
		ScalingLevels: append(resconv.SubLevels(res), level),
		UploadID:      task.ID,
		Threads:       p.cfg.MaxThreadCount,
	}

	logger.Debug("phase 5: start async upload process")
	var uploader = uploader.New(ctx, remoteStorage, uploader.Options{
		Dir:         destinationFolder,
		WorkerCount: uint32(opts.Threads),
		BufferSize:  128,
		RetryCount:  5,
		RetryDelay:  time.Millisecond * 100,
		Timeout:     p.cfg.Timeout,
		SourceFile:  sourceFilePath,
	})

	go uploader.Start()

	logger.Debug("phase 6: start async transcode process")
	var rawCommand, scaleCommand *exec.Cmd

	rawCommand, err = newFfmpegCommand(ctx, nil, BuildRawVideoCommand(&opts))
	if err != nil {
		logger.Error("can not create ffmpeg command", zap.Error(err))
		go uploader.Cancel()
		return
	}

	scaleCommand, err = newFfmpegCommand(ctx, nil, BuildScalingVideoCommand(&opts))
	if err != nil {
		logger.Error("can not create ffmpeg command", zap.Error(err))
		go uploader.Cancel()
		return
	}

	_ = manifest.GenerateHLSPlaylist(opts.ScalingLevels, p.cfg.OutputDir, opts.UploadID)

	if err = rawCommand.Start(); err != nil {
		logger.Error("can not run raw ffmpeg command", zap.Error(err))
		go uploader.Cancel()
		return
	}

	if err = scaleCommand.Start(); err != nil {
		logger.Error("can not run scale ffmpeg command", zap.Error(err))
		go uploader.Cancel()
		return
	}

	logger.Debug("phase 7: wait for the result")
	if err = scaleCommand.Wait(); err != nil {
		logger.Error("can not scale ", zap.Error(err))
		go uploader.Cancel()
		return
	}
	if err = rawCommand.Wait(); err != nil {
		logger.Error("can not process raw", zap.Error(err))
		go uploader.Cancel()
		return
	}

	logger.Debug("phase 8: schedule cleanup")
	go uploader.Stop()

	logger.Debug("phase 9: try to set metadata")
	var resultURL = p.cfg.Endpoint().JoinPath("blob", task.Workspace, task.ID+"_master.m3u8")

	if metaProvider, ok := remoteStorage.(storage.MetaProvider); ok {
		var hls = &HLS{Source: resultURL.String()}
		logger.Debug("applying metadata", zap.Stringer("url", resultURL), zap.String("source", task.Source))
		err = metaProvider.PatchMeta(
			ctx,
			task.Source,
			&storage.Metadata{
				"hls": hls,
			},
		)
		if err != nil {
			logger.Error("can not patch the source file", zap.Error(err))
		}
	}
}
