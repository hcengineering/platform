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

// Package sharedpipe provided a shared pipe that can be used when one writer can be shared between a couple of readers.
package sharedpipe

import (
	"io"
	"sync"
	"sync/atomic"
)

// Chunk represents a chunk of raw data for the readers
type Chunk struct {
	content []byte
	Next    atomic.Pointer[Chunk]
	ready   chan struct{}
	done    chan struct{}
}

// NewWriter creates a new shared pipe Writer
func NewWriter() *Writer {
	var res = &Writer{
		done: make(chan struct{}),
	}
	res.curr.Store(&Chunk{done: res.done, ready: make(chan struct{})})
	return res
}

// Transpile creates a new Reader
func (w *Writer) Transpile() *Reader {
	var res = &Reader{
		curr: w.curr.Load(),
		done: make(chan struct{}),
	}
	return res
}

// Writer represents a shared pipe writer
type Writer struct {
	curr atomic.Pointer[Chunk]
	done chan struct{}
	once sync.Once
}

// Close closes the pipe for all readers
func (w *Writer) Close() error {
	w.once.Do(func() { close(w.done) })
	return nil
}

func (w *Writer) Write(p []byte) (n int, err error) {
	var completePrevious = w.curr.Load().ready
	var curr = w.curr.Load()
	curr.Next.Store(&Chunk{content: p, ready: make(chan struct{}), done: w.done})
	w.curr.Store(curr.Next.Load())
	close(completePrevious)
	return len(p), nil
}

// Reader is reader from shared pipe, imlements io.Reader interface
type Reader struct {
	curr *Chunk
	once sync.Once
	done chan struct{}
	pos  int
}

// Close closes reader stream
func (s *Reader) Close() error {
	s.once.Do(func() {
		close(s.done)
	})
	return nil
}

func (s *Reader) Read(in []byte) (n int, err error) {
	var curr = s.curr
	for i := 0; i < len(in); {
		for s.pos >= len(curr.content) {
			select {
			case <-curr.done:
				curr = curr.Next.Load()
				if curr == nil {
					_ = s.Close()
					return i, io.EOF
				}
			case <-s.done:
				return i, io.ErrClosedPipe
			case <-curr.ready:
				curr = curr.Next.Load()
			}
			s.pos = 0
			s.curr = curr
		}
		var n = copy(in[i:], curr.content[s.pos:])
		s.pos += n
		i += n
	}
	return len(in), nil
}

var _ io.Closer = (*Writer)(nil)
var _ io.Closer = (*Reader)(nil)
var _ io.Reader = (*Reader)(nil)
var _ io.Writer = (*Writer)(nil)
