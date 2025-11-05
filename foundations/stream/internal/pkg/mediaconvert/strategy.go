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
	"fmt"

	"github.com/hcengineering/stream/internal/pkg/profile"
	"github.com/hcengineering/stream/internal/pkg/resconv"
)

// VideoMeta contains information about the video
type VideoMeta struct {
	Width       int
	Height      int
	Codec       string
	ContentType string
}

// DefaultTranscodingProfiles uses original resolution and two more resolutions
func DefaultTranscodingProfiles(meta VideoMeta) []profile.VideoProfile {
	var profiles = make([]profile.VideoProfile, 0)

	var res = fmt.Sprintf("%v:%v", meta.Width, meta.Height)
	var sublevels = resconv.SubLevels(res)

	if IsHLSSupportedVideoCodec(meta.Codec) {
		profile := profile.MakeProfileOriginal(meta.Width, meta.Height)
		profiles = append(profiles, profile)
	} else {
		profile := profile.MakeProfileOriginalT(meta.Width, meta.Height)
		profiles = append(profiles, profile)
	}

	for _, level := range sublevels {
		if profile, ok := profile.GetProfileByName(level); ok {
			profiles = append(profiles, profile)
		}
	}

	return profiles
}

// FastTranscodingProfiles uses fastest possible video profile
func FastTranscodingProfiles(meta VideoMeta) []profile.VideoProfile {
	if IsHLSSupportedVideoCodec(meta.Codec) {
		return []profile.VideoProfile{
			profile.MakeProfileOriginal(meta.Width, meta.Height),
		}
	}

	return []profile.VideoProfile{
		profile.Profile360p,
	}
}
