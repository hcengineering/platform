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
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/pkg/errors"

	"github.com/huly-stream/internal/pkg/log"
	"github.com/huly-stream/internal/pkg/resconv"
	"go.uber.org/zap"
)

// Options represents configuration for the ffmpeg command
type Options struct {
	OuputDir      string
	ScalingLevels []string
	Level         string
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
	result.Stderr = os.Stdout
	result.Stdout = os.Stdout
	result.Stdin = in

	return result, nil
}

func buildCommonComamnd(opts *Options) []string {
	return []string{
		"-nostdin",
		"-threads", fmt.Sprint(opts.Threads),
		"-i", "pipe:0",
	}
}

// BuildAudioCommand returns flags for getting the audio from the input
func BuildAudioCommand(opts *Options) []string {
	var commonPart = buildCommonComamnd(opts)

	return append(commonPart,
		"-vn", "-acodec",
		"copy", filepath.Join(opts.OuputDir, opts.UploadID),
	)
}

// BuildRawVideoCommand returns an extremely lightweight ffmpeg command for converting raw video without extra cost.
func BuildRawVideoCommand(opts *Options) []string {
	return append(buildCommonComamnd(opts),
		"-c:v",
		"copy",
		"-fps_mode",
		"vfr",
		"-hls_time", "5",
		"-hls_list_size", "0",
		"-hls_segment_filename", filepath.Join(opts.OuputDir, opts.UploadID, fmt.Sprintf("%s_%s_%s.ts", opts.UploadID, "%03d", opts.Level)),
		filepath.Join(opts.OuputDir, opts.UploadID, fmt.Sprintf("%s_%s_master.m3u8", opts.UploadID, opts.Level)))
}

// BuildScalingVideoCommand returns flags for ffmpeg for video scaling
func BuildScalingVideoCommand(opts *Options) []string {
	var result = buildCommonComamnd(opts)
	for _, level := range opts.ScalingLevels {
		result = append(result,
			"-vf", "scale="+resconv.Resolution(level),
			"-c:v",
			"libx264",
			"-preset", "veryfast",
			"-crf", "23",
			"-g", "60",
			"-hls_time", "5",
			"-hls_list_size", "0",
			"-hls_segment_filename", filepath.Join(opts.OuputDir, opts.UploadID, fmt.Sprintf("%s_%s_%s.ts", opts.UploadID, "%03d", level)),
			filepath.Join(opts.OuputDir, opts.UploadID, fmt.Sprintf("%s_%s_master.m3u8", opts.UploadID, level)))
	}

	return result
}
