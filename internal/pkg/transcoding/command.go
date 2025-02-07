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
	"sort"
	"strconv"
	"strings"

	"github.com/pkg/errors"

	"github.com/huly-stream/internal/pkg/log"
	"go.uber.org/zap"
)

// Options represents configuration for the ffmpeg command
type Options struct {
	OuputDir    string
	Resolutions []string
	Threads     int
	UploadID    string
}

func measure(options *Options) int64 {
	var res int64
	for _, resolution := range options.Resolutions {
		var w, h int
		var parts = strings.Split(resolution, ":")

		if len(parts) > 1 {
			w, _ = strconv.Atoi(parts[0])
			w = max(w, 320)
			h, _ = strconv.Atoi(parts[1])
			h = max(h, 240)

			res += int64(w) * int64(h)
		}
	}

	return max(res, 320*240)
}

func newFfmpegCommand(ctx context.Context, in io.Reader, options *Options) (*exec.Cmd, error) {
	if options == nil {
		return nil, errors.New("options should not be nil")
	}
	if ctx == nil {
		return nil, errors.New("ctx should not be nil")
	}

	var logger = log.FromContext(ctx).With(zap.String("func", "NewFFMpegCommand"))
	var args []string

	if options.Resolutions == nil {
		logger.Debug("resolutions were not provided, building audio command...")
		args = BuildAudioCommand(options)
	} else {
		logger.Debug("building video command...")
		args = BuildVideoCommand(options)
	}

	logger.Debug("prepared command: ", zap.Strings("args", args))

	var result = exec.CommandContext(ctx, "ffmpeg", args...)
	result.Stderr = os.Stdout
	result.Stdout = os.Stdout
	result.Stdin = in

	return result, nil
}

func buildCommonComamnd(opts *Options) []string {
	return []string{
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

// BuildVideoCommand returns flags for ffmpeg for video transcoding
func BuildVideoCommand(opts *Options) []string {
	var result = buildCommonComamnd(opts)

	for _, res := range opts.Resolutions {
		var prefix string
		var w, h int
		var parts = strings.Split(res, ":")

		if len(parts) > 1 {
			w, _ = strconv.Atoi(parts[0])
			h, _ = strconv.Atoi(parts[1])
		}
		w = max(w, 640)
		h = max(h, 480)
		prefix = ResolutionFromPixels(w * h)

		result = append(result,
			"-vf", fmt.Sprintf("scale=%d:%d", w, h),
			"-c:v",
			"libx264",
			"-preset", "veryfast",
			"-crf", "23",
			"-g", "60",
			"-hls_time", "5",
			"-hls_list_size", "0",
			"-hls_segment_filename", filepath.Join(opts.OuputDir, fmt.Sprintf("%s_%s_%s.ts", opts.UploadID, "%03d", prefix)),
			filepath.Join(opts.OuputDir, fmt.Sprintf("%s_%s_master.m3u8", opts.UploadID, prefix)))
	}

	return result
}

var resolutions = []struct {
	pixels int
	label  string
}{
	{pixels: 640 * 480, label: "320p"},
	{pixels: 1280 * 720, label: "480p"},
	{pixels: 1920 * 1080, label: "720p"},
	{pixels: 2560 * 1440, label: "1k"},
	{pixels: 3840 * 2160, label: "2k"},
	{pixels: 5120 * 2160, label: "4k"},
	{pixels: 7680 * 4320, label: "5k"},
}

// ResolutionFromPixels converts pixel count to short string
func ResolutionFromPixels(pixels int) string {
	idx := sort.Search(len(resolutions), func(i int) bool {
		return pixels < resolutions[i].pixels
	})
	if idx == len(resolutions) {
		return "8k"
	}
	return resolutions[idx].label
}
