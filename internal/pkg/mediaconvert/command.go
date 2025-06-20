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
	"io"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"

	"github.com/hcengineering/stream/internal/pkg/log"
	"go.uber.org/zap"
)

type LogLevel string

const (
	LogLevelQuiet   LogLevel = "quiet"
	LogLevelPanic   LogLevel = "panic"
	LogLevelFatal   LogLevel = "fatal"
	LogLevelError   LogLevel = "error"
	LogLevelWarning LogLevel = "warning"
	LogLevelInfo    LogLevel = "info"
	LogLevelVerbose LogLevel = "verbose"
	LogLevelDebug   LogLevel = "debug"
	LogLevelTrace   LogLevel = "trace"
)

// Options represents configuration for the ffmpeg command
type Options struct {
	Input         string
	OutputDir     string
	ScalingLevels []string
	Level         string
	LogLevel      LogLevel
	Transcode     bool
	Threads       int
	UploadID      string
}

func newFfmpegCommand(ctx context.Context, in io.Reader, args []string) (*exec.Cmd, error) {
	if ctx == nil {
		return nil, errors.New("ctx should not be nil")
	}

	var logger = log.FromContext(ctx).With(zap.String("func", "newFFMpegCommand"))

	logger.Debug("prepared command: ", zap.Strings("args", args))

	var result = exec.CommandContext(ctx, "ffmpeg", args...)
	result.Stdin = in

	return result, nil
}

func buildCommonCommand(opts *Options) []string {
	var result = []string{
		"-y", // Overwrite output files without asking.
		"-v", string(opts.LogLevel),
		"-threads", fmt.Sprint(opts.Threads),
		"-i", opts.Input,
	}

	if strings.HasPrefix(opts.Input, "http://") || strings.HasPrefix(opts.Input, "https://") {
		result = append(result,
			"-reconnect", "1",
			"-reconnect_streamed", "1",
			"-reconnect_delay_max", "5",
		)
	}

	return result
}

// BuildAudioCommand returns flags for getting the audio from the input
func BuildAudioCommand(opts *Options) []string {
	var commonPart = buildCommonCommand(opts)

	return append(commonPart,
		"-vn", "-acodec",
		"copy", filepath.Join(opts.OutputDir, opts.UploadID),
	)
}

// BuildRawVideoCommand returns an extremely lightweight ffmpeg command for converting raw video without extra cost.
func BuildRawVideoCommand(opts *Options) []string {
	if opts.Transcode {
		return append(buildCommonCommand(opts),
			"-c:a", "aac",
			"-c:v", "libx264",
			"-preset", "veryfast",
			"-crf", "23",
			"-g", "60",
			"-f", "hls",
			"-hls_time", "5",
			"-hls_flags", "split_by_time+temp_file",
			"-hls_list_size", "0",
			"-hls_segment_filename", filepath.Join(opts.OutputDir, opts.UploadID, fmt.Sprintf("%s_%s_%s.ts", opts.UploadID, "%03d", opts.Level)),
			filepath.Join(opts.OutputDir, opts.UploadID, fmt.Sprintf("%s_%s_master.m3u8", opts.UploadID, opts.Level)))
	}

	return append(buildCommonCommand(opts),
		"-c:a", "copy", // Copy audio stream
		"-c:v", "copy", // Copy video stream
		"-f", "hls",
		"-hls_time", "5",
		"-hls_flags", "split_by_time+temp_file",
		"-hls_list_size", "0",
		"-hls_segment_filename", filepath.Join(opts.OutputDir, opts.UploadID, fmt.Sprintf("%s_%s_%s.ts", opts.UploadID, "%03d", opts.Level)),
		filepath.Join(opts.OutputDir, opts.UploadID, fmt.Sprintf("%s_%s_master.m3u8", opts.UploadID, opts.Level)))
}

// BuildThumbnailCommand creates a command that creates a thumbnail for the input video
func BuildThumbnailCommand(opts *Options) []string {
	return append([]string{},
		"-i", opts.Input,
		"-vframes", "1",
		"-update", "1",
		filepath.Join(opts.OutputDir, opts.UploadID, opts.UploadID+".jpg"),
	)
}

// BuildScalingVideoCommand returns flags for ffmpeg for video scaling
func BuildScalingVideoCommand(opts *Options) []string {
	var result = buildCommonCommand(opts)

	for _, level := range opts.ScalingLevels {
		if level == opts.Level {
			continue
		}

		result = append(result,
			"-map", "0:v",
			"-vf", "scale=-2:"+level[:len(level)-1],
			"-c:a", "aac",
			"-c:v", "libx264",
			"-preset", "veryfast",
			"-crf", "23",
			"-g", "60",
			"-f", "hls",
			"-hls_time", "5",
			// Use HLS flags
			// - split_by_time
			//     Allow segments to start on frames other than key frames.
			//     This improves behavior on some players when the time between key frames is inconsistent,
			//     but may make things worse on others, and can cause some oddities during seeking.
			//     This flag should be used with the hls_time option.
			// - temp_file
			//     Write segment data to filename.tmp and rename to filename only once the segment is complete.
			"-hls_flags", "split_by_time+temp_file",
			"-hls_list_size", "0",
			"-hls_segment_filename", filepath.Join(opts.OutputDir, opts.UploadID, fmt.Sprintf("%s_%s_%s.ts", opts.UploadID, "%03d", level)),
			filepath.Join(opts.OutputDir, opts.UploadID, fmt.Sprintf("%s_%s_master.m3u8", opts.UploadID, level)))
	}

	return result
}
