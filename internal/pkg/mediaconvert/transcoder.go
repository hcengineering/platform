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

	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/manifest"
	"github.com/hcengineering/stream/internal/pkg/storage"
	"github.com/hcengineering/stream/internal/pkg/token"
	"github.com/hcengineering/stream/internal/pkg/uploader"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gopkg.in/vansante/go-ffprobe.v2"
)

var transcodingDir = "t"

// Transcoder process one transcoding task
type Transcoder struct {
	ctx       context.Context
	cfg       *config.Config
	outputDir string
	logger    *zap.Logger
}

// NewTranscoder creates a new instance of task transcoder
func NewTranscoder(ctx context.Context, cfg *config.Config) *Transcoder {
	outputDir := filepath.Join(cfg.OutputDir, transcodingDir)

	var p = &Transcoder{
		cfg:       cfg,
		ctx:       ctx,
		outputDir: outputDir,
		logger:    log.FromContext(ctx).With(zap.String("transcoding", "transcoder")),
	}

	return p
}

// Transcode handles one transcoding task
func (p *Transcoder) Transcode(ctx context.Context, task *Task) (*TaskResult, error) {
	var logger = p.logger.With(zap.String("task-id", task.ID))

	logger.Debug("start")
	defer logger.Debug("finished")

	logger.Debug("phase 1: get a token")
	var tokenString, err = token.NewToken(p.cfg.ServerSecret, task.Workspace, "stream")
	if err != nil {
		logger.Error("can not create token", zap.Error(err))
		return nil, errors.Wrapf(err, "can not create token")
	}

	logger.Debug("phase 2: preparing fs")
	var destinationFolder = filepath.Join(p.outputDir, task.ID)
	var _, filename = filepath.Split(task.Source)
	err = os.MkdirAll(destinationFolder, os.ModePerm)
	if err != nil {
		logger.Error("can not create temporary folder", zap.Error(err))
		return nil, errors.Wrapf(err, "can not create temporary folder")
	}

	defer func() {
		logger.Debug("remove temporary folder")
		if err = os.RemoveAll(destinationFolder); err != nil {
			logger.Error("failed to cleanup temporary folder", zap.Error(err))
		}
	}()

	logger.Debug("phase 3: get the remote file")

	remoteStorage, err := storage.NewStorageByURL(ctx, p.cfg.Endpoint(), p.cfg.EndpointURL.Scheme, tokenString, task.Workspace)
	if err != nil {
		logger.Error("can not create storage by url", zap.Error(err), zap.String("url", p.cfg.EndpointURL.String()))
		return nil, errors.Wrapf(err, "can not create storage by url")
	}

	stat, err := remoteStorage.StatFile(ctx, task.Source)
	if err != nil {
		logger.Error("can not stat file", zap.Error(err), zap.String("filepath", task.Source))
		return nil, errors.Wrapf(err, "can not stat file")
	}

	if !IsSupportedMediaType(stat.Type) {
		logger.Info("unsupported media type", zap.String("type", stat.Type))
		return nil, fmt.Errorf("unsupported media type: %s", stat.Type)
	}

	sourceFilePath := filepath.Join(destinationFolder, filename)
	if err = remoteStorage.GetFile(ctx, task.Source, sourceFilePath); err != nil {
		logger.Error("can not download source file", zap.Error(err), zap.String("filepath", task.Source))
		// TODO: reschedule
		return nil, errors.Wrapf(err, "can not download source file")
	}

	logger.Debug("phase 4: prepare to transcode")
	probe, err := ffprobe.ProbeURL(ctx, sourceFilePath)
	if err != nil {
		logger.Error("can not get ffprobe", zap.Error(err), zap.String("filepath", sourceFilePath))
		return nil, errors.Wrapf(err, "can not get ffprobe")
	}

	videoStream := probe.FirstVideoStream()
	if videoStream == nil {
		logger.Error("no video stream found", zap.String("filepath", sourceFilePath))
		return nil, fmt.Errorf("no video stream found")
	}

	logger.Debug("video stream found", zap.String("codec", videoStream.CodecName), zap.Int("width", videoStream.Width), zap.Int("height", videoStream.Height))

	audioStream := probe.FirstAudioStream()
	if audioStream == nil {
		logger.Info("no audio stream found", zap.String("filepath", sourceFilePath))
	}

	meta := VideoMeta{
		Width:       videoStream.Width,
		Height:      videoStream.Height,
		Codec:       videoStream.CodecName,
		ContentType: stat.Type,
	}

	var profiles = DefaultTranscodingProfiles(meta)

	var opts = Options{
		Input:     sourceFilePath,
		OutputDir: p.outputDir,
		LogLevel:  LogLevel(p.cfg.LogLevel),
		Profiles:  profiles,
		UploadID:  task.ID,
		Threads:   p.cfg.MaxThreadCount,
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

	err = manifest.GenerateHLSPlaylist(profiles, p.outputDir, opts.UploadID)
	if err != nil {
		logger.Error("can not generate hls playlist", zap.String("out", p.outputDir), zap.String("uploadID", opts.UploadID))
		return nil, errors.Wrapf(err, "can not generate hls playlist")
	}

	go uploader.Start()

	logger.Debug("phase 6: start async transcode processes")

	var argsSlice = [][]string{
		BuildThumbnailCommand(&opts),
		BuildVideoCommand(&opts),
	}

	var cmds []*exec.Cmd
	for _, args := range argsSlice {
		if len(args) == 0 {
			logger.Debug("skip empty command")
			continue
		}

		cmd, cmdErr := newFfmpegCommand(ctx, nil, args)
		if cmdErr != nil {
			logger.Error("can not create a new command", zap.Error(cmdErr), zap.Strings("args", args))
			go uploader.Cancel()
			return nil, errors.Wrapf(cmdErr, "can not create a new command")
		}

		cmds = append(cmds, cmd)
	}

	executor := NewCommandExecutor(ctx)
	if execErr := executor.Execute(cmds); execErr != nil {
		uploader.Cancel()
		return nil, errors.Wrapf(execErr, "can not execute command")
	}

	logger.Debug("phase 7: schedule cleanup")
	uploader.Stop()

	logger.Debug("phase 8: try to set metadata")

	var result = TaskResult{
		Width:     videoStream.Width,
		Height:    videoStream.Height,
		Playlist:  task.ID + "_master.m3u8",
		Thumbnail: task.ID + ".jpg",
	}

	if metaProvider, ok := remoteStorage.(storage.MetaProvider); ok {
		logger.Debug(
			"applying metadata",
			zap.String("url", result.Playlist),
			zap.String("thumbnail", result.Thumbnail),
			zap.String("source", task.Source),
		)
		metaErr := metaProvider.PatchMeta(
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
		if metaErr != nil {
			logger.Error("can not patch the source file", zap.Error(metaErr))
		}
	}

	return &result, nil
}
