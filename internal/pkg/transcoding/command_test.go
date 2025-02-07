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

package transcoding_test

import (
	"runtime"
	"strings"
	"testing"

	"github.com/huly-stream/internal/pkg/transcoding"
	"github.com/stretchr/testify/require"
)

func Test_BuildVideoCommand_Basic(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip()
	}
	var simpleHlsCommand = transcoding.BuildVideoCommand(&transcoding.Options{
		OuputDir:    "test",
		UploadID:    "1",
		Threads:     4,
		Resolutions: []string{"1280:720"},
	})

	const expected = `-threads 4 -i pipe:0 -vf scale=1280:720 -c:v libx264 -preset veryfast -crf 23 -g 60 -hls_time 5 -hls_list_size 0 -hls_segment_filename test/1_%03d_720p.ts test/1_720p_master.m3u8`

	require.Contains(t, expected, strings.Join(simpleHlsCommand, " "))
}

func TestResolutionFromPixels(t *testing.T) {
	tests := []struct {
		pixels   int
		expected string
	}{
		{pixels: 320 * 240, expected: "320p"},
		{pixels: 640 * 480, expected: "480p"},
		{pixels: 1280 * 720, expected: "720p"},
		{pixels: 1920 * 1080, expected: "1k"},
		{pixels: 2560 * 1440, expected: "2k"},
		{pixels: 3840 * 2160, expected: "4k"},
		{pixels: 5120 * 2160, expected: "5k"},
		{pixels: 9000 * 4000, expected: "8k"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := transcoding.ResolutionFromPixels(tt.pixels)
			require.Equal(t, tt.expected, result, "ResolutionFromPixels(%d)", tt.pixels)
		})
	}
}
