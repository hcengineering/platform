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

// Task represents transcoding task
type Task struct {
	ID        string
	Status    string
	Source    string
	Format    string
	Workspace string
	Metadata  map[string]string
}

// TaskResult represents transcoding task result
type TaskResult struct {
	Playlist  string `json:"playlist"`
	Thumbnail string `json:"thumbnail"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
}

// Scheduler manages transcoding tasks by passed config
type Scheduler struct {
	logger *zap.Logger
	taskCh chan *Task
	cfg    *config.Config
	ctx    context.Context
}

// Schedule schedules a task to transcode
func (p *Scheduler) Schedule(t *Task) error {
	t.ID = uuid.NewString()
	t.Status = "planned"

	select {
	case p.taskCh <- t:
		return nil
	default:
		return fmt.Errorf("task queue is full")
	}
}

// NewScheduler creates a new instance of transcoding task scheduler
func NewScheduler(ctx context.Context, cfg *config.Config) *Scheduler {
	var p = &Scheduler{
		taskCh: make(chan *Task, 128),
		cfg:    cfg,
		ctx:    ctx,
		logger: log.FromContext(ctx).With(zap.String("transcoding", "scheduler")),
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

// TODO: add a factory pattern to process tasks by different media type
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
	err = os.MkdirAll(destinationFolder, os.ModePerm)
	if err != nil {
		logger.Error("can not create temporary folder", zap.Error(err))
		return
	}

	defer func() {
		if err = os.RemoveAll(destinationFolder); err != nil {
			logger.Error("failed to cleanup temporary folder", zap.Error(err))
		}
	}()

	logger.Debug("phase 3: get the remote file")

	remoteStorage, err := storage.NewStorageByURL(ctx, p.cfg.Endpoint(), p.cfg.EndpointURL.Scheme, tokenString, task.Workspace)

	if err != nil {
		logger.Error("can not create storage by url", zap.Error(err), zap.String("url", p.cfg.EndpointURL.String()))
		_ = os.RemoveAll(destinationFolder)
		return
	}

	stat, err := remoteStorage.StatFile(ctx, task.Source)
	if err != nil {
		logger.Error("can not stat a file", zap.Error(err), zap.String("filepath", task.Source))
		_ = os.RemoveAll(destinationFolder)
		return
	}

	if !IsSupportedMediaType(stat.Type) {
		logger.Info("unsupported media type", zap.String("type", stat.Type))
		_ = os.RemoveAll(destinationFolder)
		return
	}

	if err = remoteStorage.GetFile(ctx, task.Source, sourceFilePath); err != nil {
		logger.Error("can not download a file", zap.Error(err), zap.String("filepath", task.Source))
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

	audioStream := probe.FirstAudioStream()
	if audioStream == nil {
		logger.Info("no audio stream found in the file", zap.String("filepath", sourceFilePath))
	}

	videoStream := probe.FirstVideoStream()
	if videoStream == nil {
		logger.Error("no video stream found in the file", zap.String("filepath", sourceFilePath))
		_ = os.RemoveAll(destinationFolder)
		return
	}

	logger.Debug("video stream found", zap.String("codec", videoStream.CodecName), zap.Int("width", videoStream.Width), zap.Int("height", videoStream.Height))

	var res = fmt.Sprintf("%v:%v", videoStream.Width, videoStream.Height)
	var codec = videoStream.CodecName
	var level = resconv.Level(res)
	var opts = Options{
		Input:         sourceFilePath,
		OutputDir:     p.cfg.OutputDir,
		Level:         level,
		Transcode:     !IsHLSSupportedVideoCodec(codec),
		ScalingLevels: append(resconv.SubLevels(res), level),
		UploadID:      task.ID,
		Threads:       p.cfg.MaxThreadCount,
	}

	logger.Debug("phase 5: start async upload process")
	var uploader = uploader.New(ctx, remoteStorage, uploader.Options{
		Dir:         destinationFolder,
		WorkerCount: uint32(opts.Threads),
		BufferSize:  128,
		RetryCount:  10,
		RetryDelay:  time.Millisecond * 100,
		Timeout:     p.cfg.Timeout,
		Source:      task.Source,
		SourceFile:  sourceFilePath,
	})

	err = manifest.GenerateHLSPlaylist(opts.ScalingLevels, p.cfg.OutputDir, opts.UploadID)
	if err != nil {
		logger.Error("can not generate hls playlist", zap.String("out", p.cfg.OutputDir), zap.String("uploadID", opts.UploadID))
		_ = os.RemoveAll(destinationFolder)
		return
	}

	go uploader.Start()

	logger.Debug("phase 6: start async transcode processes")

	var argsSlice = [][]string{
		BuildThumbnailCommand(&opts),
		BuildRawVideoCommand(&opts),
		BuildScalingVideoCommand(&opts),
	}
	var cmds []*exec.Cmd

	for _, args := range argsSlice {
		cmd, cmdErr := newFfmpegCommand(ctx, nil, args)
		if cmdErr != nil {
			logger.Error("can not create a new command", zap.Error(cmdErr), zap.Strings("args", args))
			go uploader.Cancel()
			return
		}
		cmds = append(cmds, cmd)
		if err = cmd.Start(); err != nil {
			logger.Error("can not start a command", zap.Error(err), zap.Strings("args", args))
			go uploader.Cancel()
			return
		}
	}

	logger.Debug("phase 7: wait for the result")
	for _, cmd := range cmds {
		if err = cmd.Wait(); err != nil {
			logger.Error("can not wait for command end ", zap.Error(err))
			go uploader.Cancel()
			return
		}
	}

	logger.Debug("phase 8: schedule cleanup")
	go uploader.Stop()

	logger.Debug("phase 9: try to set metadata")

	if metaProvider, ok := remoteStorage.(storage.MetaProvider); ok {
		var result = TaskResult{
			Width:     videoStream.Width,
			Height:    videoStream.Height,
			Playlist:  task.ID + "_master.m3u8",
			Thumbnail: task.ID + ".jpg",
		}

		logger.Debug(
			"applying metadata",
			zap.String("url", result.Playlist),
			zap.String("thumbnail", result.Thumbnail),
			zap.String("source", task.Source),
		)
		err = metaProvider.PatchMeta(
			ctx,
			task.Source,
			&storage.Metadata{
				"hls": map[string]any{
					"source":    result.Playlist,
					"thumbnail": result.Thumbnail,
				},
				"width":  result.Width,
				"height": result.Height,
			},
		)
		if err != nil {
			logger.Error("can not patch the source file", zap.Error(err))
		}
	}
}

// IsHLSSupportedVideoCodec checks whether the codec is supported by HLS
func IsHLSSupportedVideoCodec(codec string) bool {
	switch codec {
	case "h264", "h265":
		return true
	default:
		return false
	}
}

// IsSupportedMediaType checks whether transcoding is supported for given media type
func IsSupportedMediaType(mediaType string) bool {
	// Explicitly disable conversion for video/mp2t and video/x-mpegurl
	switch mediaType {
	case "video/mp2t", "video/x-mpegurl":
		return false
	case "video/mp4":
		return true
	case "video/webm":
		return true
	case "video/quicktime":
		return true
	default:
		return false
	}
}
