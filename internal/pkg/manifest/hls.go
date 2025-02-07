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

// Package manifest provides data types for manifest based media files.
package manifest

import (
	"bufio"
	"fmt"
	"strconv"
	"strings"
)

// HLSManifest represents an HLS manifest file
// with metadata about the playlist and its segments.
type HLSManifest struct {
	Version        int
	TargetDuration int
	SequenceNumber int
	Segments       []Segment
	EndList        bool
}

// Segment represents a media segment in the HLS manifest.
type Segment struct {
	URI      string
	Duration float64
	Title    string
}

// ToM3U8 serializes the HLSManifest to an M3U8 file format.
func (m *HLSManifest) ToM3U8() string {
	var builder strings.Builder

	builder.WriteString("#EXTM3U\n")
	builder.WriteString(fmt.Sprintf("#EXT-X-VERSION:%d\n", m.Version))
	builder.WriteString(fmt.Sprintf("#EXT-X-TARGETDURATION:%d\n", m.TargetDuration))
	builder.WriteString(fmt.Sprintf("#EXT-X-MEDIA-SEQUENCE:%d\n", m.SequenceNumber))

	for _, segment := range m.Segments {
		if segment.Title != "" {
			builder.WriteString(fmt.Sprintf("#EXTINF:%.2f,%s\n", segment.Duration, segment.Title))
		} else {
			builder.WriteString(fmt.Sprintf("#EXTINF:%.2f,\n", segment.Duration))
		}
		builder.WriteString(fmt.Sprintf("%s\n", segment.URI))
	}

	if m.EndList {
		builder.WriteString("#EXT-X-ENDLIST\n")
	}

	return builder.String()
}

// FromM3U8 converts raw input to the hls master file
// nolint
func FromM3U8(data string) (*HLSManifest, error) {
	scanner := bufio.NewScanner(strings.NewReader(data))
	manifest := &HLSManifest{}
	var currentSegment *Segment

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "#EXTM3U") {
			continue
		}
		if strings.HasPrefix(line, "#EXT-X-VERSION:") {
			version, err := strconv.Atoi(strings.TrimPrefix(line, "#EXT-X-VERSION:"))
			if err != nil {
				return nil, err
			}
			manifest.Version = version
		} else if strings.HasPrefix(line, "#EXT-X-TARGETDURATION:") {
			targetDuration, err := strconv.Atoi(strings.TrimPrefix(line, "#EXT-X-TARGETDURATION:"))
			if err != nil {
				return nil, err
			}
			manifest.TargetDuration = targetDuration
		} else if strings.HasPrefix(line, "#EXT-X-MEDIA-SEQUENCE:") {
			sequenceNumber, err := strconv.Atoi(strings.TrimPrefix(line, "#EXT-X-MEDIA-SEQUENCE:"))
			if err != nil {
				return nil, err
			}
			manifest.SequenceNumber = sequenceNumber
		} else if strings.HasPrefix(line, "#EXTINF:") {
			parts := strings.SplitN(strings.TrimPrefix(line, "#EXTINF:"), ",", 2)
			duration, err := strconv.ParseFloat(parts[0], 64)
			if err != nil {
				return nil, err
			}
			title := ""
			if len(parts) > 1 {
				title = parts[1]
			}
			currentSegment = &Segment{Duration: duration, Title: title}
		} else if strings.HasPrefix(line, "#EXT-X-ENDLIST") {
			manifest.EndList = true
		} else if currentSegment != nil {
			currentSegment.URI = line
			manifest.Segments = append(manifest.Segments, *currentSegment)
			currentSegment = nil
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return manifest, nil
}
