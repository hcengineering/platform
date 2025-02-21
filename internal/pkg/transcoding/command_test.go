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
	"strings"
	"testing"

	"github.com/huly-stream/internal/pkg/resconv"
	"github.com/huly-stream/internal/pkg/transcoding"
	"github.com/stretchr/testify/require"
)

func Test_BuildVideoCommand_Scaling(t *testing.T) {
	var scaleCommand = transcoding.BuildScalingVideoCommand(&transcoding.Options{
		OuputDir:      "test",
		UploadID:      "1",
		Threads:       4,
		ScalingLevels: []string{"720p", "480p"},
	})

	const expected = `-nostdin -threads 4 -i pipe:0 -vf scale=1280:720 -c:v libx264 -preset veryfast -crf 23 -g 60 -hls_time 5 -hls_list_size 0 -hls_segment_filename test/1/1_%03d_720p.ts test/1/1_720p_master.m3u8 -vf scale=640:480 -c:v libx264 -preset veryfast -crf 23 -g 60 -hls_time 5 -hls_list_size 0 -hls_segment_filename test/1/1_%03d_480p.ts test/1/1_480p_master.m3u8`

	require.Contains(t, expected, strings.Join(scaleCommand, " "))
}

func Test_BuildVideoCommand_Raw(t *testing.T) {
	var rawCommand = transcoding.BuildRawVideoCommand(&transcoding.Options{
		OuputDir: "test",
		UploadID: "1",
		Threads:  4,
		Level:    resconv.Level("651:490"),
	})

	const expected = `-nostdin -threads 4 -i pipe:0 -c:v copy -fps_mode vfr -hls_time 5 -hls_list_size 0 -hls_segment_filename test/1/1_%03d_480p.ts test/1/1_480p_master.m3u8`

	require.Contains(t, expected, strings.Join(rawCommand, " "))
}
