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
	"strconv"
	"strings"

	"github.com/pkg/errors"

	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/hcengineering/stream/internal/pkg/profile"
	"go.uber.org/zap"
)

// LogLevel is ffmpeg log level
type LogLevel string

const (
	// LogLevelQuiet is quiet log level
	LogLevelQuiet LogLevel = "quiet"
	// LogLevelPanic is panic log level
	LogLevelPanic LogLevel = "panic"
	// LogLevelFatal is fatal log level
	LogLevelFatal LogLevel = "fatal"
	// LogLevelError is error log level
	LogLevelError LogLevel = "error"
	// LogLevelWarning is warning log level
	LogLevelWarning LogLevel = "warning"
	// LogLevelInfo is info log level
	LogLevelInfo LogLevel = "info"
	// LogLevelVerbose is verbose log level
	LogLevelVerbose LogLevel = "verbose"
	// LogLevelDebug is debug log level
	LogLevelDebug LogLevel = "debug"
	// LogLevelTrace is trace log level
	LogLevelTrace LogLevel = "trace"
)

// Options represents configuration for the ffmpeg command
type Options struct {
	Input     string
	OutputDir string
	LogLevel  LogLevel
	Threads   int
	UploadID  string
	Profiles  []profile.VideoProfile
}

func newFfmpegCommand(ctx context.Context, in io.Reader, args []string) (*exec.Cmd, error) {
	if ctx == nil {
		return nil, errors.New("ctx should not be nil")
	}

	var cmd = exec.CommandContext(ctx, "ffmpeg", args...)
	cmd.Stdin = in

	var logger = log.FromContext(ctx).With(zap.String("func", "newFFMpegCommand"))
	logger.Debug("prepared command: ", zap.String("cmd", cmd.String()))

	return cmd, nil
}

func buildCommonCommand(opts *Options) []string {
	var result = []string{
		"-y", // Overwrite output files without asking.
		"-v", string(opts.LogLevel),
		"-err_detect", "ignore_err",
		"-fflags", "+discardcorrupt",
		"-threads", fmt.Sprint(opts.Threads),
		"-i", opts.Input,
	}

	// If input is a URL, add HTTP specific parameters
	if strings.HasPrefix(opts.Input, "http://") || strings.HasPrefix(opts.Input, "https://") {
		result = append(result,
			"-reconnect", "1",
			"-reconnect_streamed", "1",
			"-reconnect_delay_max", "5",
		)
	}

	return result
}

func buildHLSCommand(profile profile.VideoProfile, opts *Options) []string {
	return []string{
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
		// Do not limit number of HLS segments
		"-hls_list_size", "0",
		"-hls_segment_filename", filepath.Join(opts.OutputDir, opts.UploadID, fmt.Sprintf("%s_%s_%s.ts", opts.UploadID, "%03d", profile.Name)),
	}
}

func buildVideoCommand(profile profile.VideoProfile) []string {
	crf := profile.CRF
	if crf == 0 {
		crf = 23
	}
	command := []string{
		// Transcode only first video and optionally audio stream
		"-map", "0:v:0",
		"-map", "0:a?",
		// Set up codecs
		"-c:a", profile.AudioCodec,
		"-c:v", profile.VideoCodec,
		"-preset", "veryfast",
		"-crf", strconv.Itoa(crf),
		"-g", "60",
	}

	if profile.VideoCodec != "copy" && profile.Scale {
		command = append(command, "-vf", "scale=-2:"+strconv.Itoa(profile.Height))
	}

	return command
}

// BuildAudioCommand returns flags for getting the audio from the input
func BuildAudioCommand(opts *Options) []string {
	var commonPart = buildCommonCommand(opts)

	return append(commonPart,
		"-vn", "-acodec",
		"copy", filepath.Join(opts.OutputDir, opts.UploadID),
	)
}

// BuildVideoCommand returns ffmpeg command for converting video.
func BuildVideoCommand(opts *Options) []string {
	if len(opts.Profiles) == 0 {
		return []string{}
	}

	var command = buildCommonCommand(opts)
	for _, profile := range opts.Profiles {
		command = append(command, buildVideoCommand(profile)...)
		command = append(command, buildHLSCommand(profile, opts)...)
		command = append(command, filepath.Join(opts.OutputDir, opts.UploadID, fmt.Sprintf("%s_%s_master.m3u8", opts.UploadID, profile.Name)))
	}
	return command
}

// BuildThumbnailCommand creates a command that creates a thumbnail for the input video
func BuildThumbnailCommand(opts *Options) []string {
	return append([]string{},
		"-y", // Overwrite output files without asking.
		"-i", opts.Input,
		"-vframes", "1",
		"-update", "1",
		filepath.Join(opts.OutputDir, opts.UploadID, opts.UploadID+".jpg"),
	)
}
