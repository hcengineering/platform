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

package mediaconvert_test

import (
	"strings"
	"testing"

	"github.com/hcengineering/stream/internal/pkg/mediaconvert"
	"github.com/hcengineering/stream/internal/pkg/profile"
	"github.com/stretchr/testify/require"
)

func Test_BuildVideoCommand_Empty(t *testing.T) {
	var profiles []profile.VideoProfile

	var rawCommand = mediaconvert.BuildVideoCommand(&mediaconvert.Options{
		OutputDir: "test",
		Input:     "pipe:0",
		UploadID:  "1",
		Threads:   4,
		LogLevel:  mediaconvert.LogLevelDebug,
		Profiles:  profiles,
	})

	require.Empty(t, rawCommand)
}

func Test_BuildVideoCommand_Scaling(t *testing.T) {
	var profiles = []profile.VideoProfile{
		profile.Profile720p,
		profile.Profile480p,
	}

	var scaleCommand = mediaconvert.BuildVideoCommand(&mediaconvert.Options{
		OutputDir: "test",
		Input:     "pipe:0",
		UploadID:  "1",
		Threads:   4,
		LogLevel:  mediaconvert.LogLevelDebug,
		Profiles:  profiles,
	})

	const expected = `-y -v debug -err_detect ignore_err -fflags +discardcorrupt -threads 4 -i pipe:0 -map 0:v:0 -map 0:a? -c:a aac -c:v libx264 -preset veryfast -crf 25 -g 60 -vf scale=-2:720 -f hls -hls_time 5 -hls_flags split_by_time+temp_file -hls_list_size 0 -hls_segment_filename test/1/1_%03d_720p.ts test/1/1_720p_master.m3u8 -map 0:v:0 -map 0:a? -c:a aac -c:v libx264 -preset veryfast -crf 27 -g 60 -vf scale=-2:480 -f hls -hls_time 5 -hls_flags split_by_time+temp_file -hls_list_size 0 -hls_segment_filename test/1/1_%03d_480p.ts test/1/1_480p_master.m3u8`

	require.Contains(t, expected, strings.Join(scaleCommand, " "))
}

func Test_BuildVideoCommand_Original(t *testing.T) {
	var profiles = []profile.VideoProfile{
		profile.MakeProfileOriginal(640, 480),
	}

	var rawCommand = mediaconvert.BuildVideoCommand(&mediaconvert.Options{
		OutputDir: "test",
		Input:     "pipe:0",
		UploadID:  "1",
		Threads:   4,
		LogLevel:  mediaconvert.LogLevelDebug,
		Profiles:  profiles,
	})

	const expected = `-y -v debug -err_detect ignore_err -fflags +discardcorrupt -threads 4 -i pipe:0 -map 0:v:0 -map 0:a? -c:a copy -c:v copy -preset veryfast -crf 23 -g 60 -f hls -hls_time 5 -hls_flags split_by_time+temp_file -hls_list_size 0 -hls_segment_filename test/1/1_%03d_orig.ts test/1/1_orig_master.m3u8`

	require.Contains(t, expected, strings.Join(rawCommand, " "))
}

func Test_BuildVideoCommand_OriginalT(t *testing.T) {
	var profiles = []profile.VideoProfile{
		profile.MakeProfileOriginalT(640, 480),
	}

	var rawCommand = mediaconvert.BuildVideoCommand(&mediaconvert.Options{
		OutputDir: "test",
		Input:     "pipe:0",
		UploadID:  "1",
		Threads:   4,
		LogLevel:  mediaconvert.LogLevelDebug,
		Profiles:  profiles,
	})

	const expected = `-y -v debug -err_detect ignore_err -fflags +discardcorrupt -threads 4 -i pipe:0 -map 0:v:0 -map 0:a? -c:a aac -c:v libx264 -preset veryfast -crf 23 -g 60 -f hls -hls_time 5 -hls_flags split_by_time+temp_file -hls_list_size 0 -hls_segment_filename test/1/1_%03d_orig.ts test/1/1_orig_master.m3u8`

	require.Contains(t, expected, strings.Join(rawCommand, " "))
}
