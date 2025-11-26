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

package sharedpipe

import (
	"bytes"
	"io"
	"math/rand"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

const sendMessageSize = 8 * 1000 * 1000
const readerCount = 10

func TestStability(t *testing.T) {
	for range 10 {
		testStability(t)
	}
}

// #nosec
func testStability(t *testing.T) {
	var writer = NewWriter()
	var readers []io.Reader

	for range 1000 {
		readers = append(readers, writer.Transpile())
	}
	var buff [4]byte
	for range rand.Intn(1000) {
		_, _ = writer.Write([]byte("ping"))
		for i := range rand.Intn(10) {
			_, _ = readers[i].Read(buff[:])
		}
	}
	_ = writer.Close()
	for _, r := range readers {
		_, err := io.ReadAll(r)
		require.NoError(t, err)
	}
}

func TestBasicWriteRead(t *testing.T) {
	writer := NewWriter()
	defer func() { _ = writer.Close() }()
	reader := writer.Transpile()

	data := []byte("Hello, World!")
	n, err := writer.Write(data)
	if err != nil {
		t.Fatalf("Unexpected error on Write: %v", err)
	}
	if n != len(data) {
		t.Fatalf("Expected to write %d bytes, wrote %d", len(data), n)
	}

	readBuf := make([]byte, len(data))
	n, err = reader.Read(readBuf)
	if err != nil && err != io.EOF {
		t.Fatalf("Unexpected error on Read: %v", err)
	}
	if !bytes.Equal(readBuf[:n], data) {
		t.Fatalf("Expected to read %q, got %q", data, readBuf[:n])
	}
}

func TestConcurrentWriteRead(t *testing.T) {
	writer := NewWriter()
	defer func() { _ = writer.Close() }()
	reader := writer.Transpile()

	var wg sync.WaitGroup
	data := []byte("Hello, Concurrent World!")
	readBuf := make([]byte, len(data))

	wg.Add(2)

	go func() {
		defer wg.Done()
		_, err := writer.Write(data)
		if err != nil {
			t.Errorf("Unexpected error on Write: %v", err)
		}
	}()

	// Reader goroutine
	go func() {
		defer wg.Done()
		n, err := reader.Read(readBuf)
		if err != nil && err != io.EOF {
			t.Errorf("Unexpected error on Read: %v", err)
		}
		if n != len(data) {
			t.Errorf("Expected to read %d bytes, read %d", len(data), n)
		}
		if !bytes.Equal(readBuf[:n], data) {
			t.Errorf("Expected to read %q, got %q", data, readBuf[:n])
		}
	}()

	wg.Wait()
}

func TestWriterClose(t *testing.T) {
	writer := NewWriter()
	reader := writer.Transpile()

	_, _ = writer.Write([]byte("Hello"))
	_ = writer.Close()

	readBuf := make([]byte, 5)
	n, err := reader.Read(readBuf)
	if err != nil && err != io.EOF {
		t.Fatalf("Unexpected error on Read: %v", err)
	}
	if n != 5 {
		t.Fatalf("Expected to read 5 bytes, read %d", n)
	}

	n, err = reader.Read(readBuf)
	if err != io.EOF {
		t.Fatalf("Expected EOF after writer close, got %v", err)
	}
	if n != 0 {
		t.Fatalf("Expected to read 0 bytes after EOF, read %d", n)
	}
}

// Test reading from an empty writer.
func TestReadFromEmptyWriter(t *testing.T) {
	writer := NewWriter()
	_ = writer.Close()
	reader := writer.Transpile()

	readBuf := make([]byte, 5)
	_, err := reader.Read(readBuf)
	require.ErrorIs(t, io.EOF, err)
}

func Test_PipeWait(t *testing.T) {
	var writer = NewWriter()
	var reader = writer.Transpile()
	var buff [4]byte
	go func() {
		time.Sleep(time.Second / 10)
		_, _ = writer.Write([]byte("test"))
	}()
	_, _ = reader.Read(buff[:])
	require.Equal(t, "test", string(buff[:]))
}

func Test_Consistent(t *testing.T) {
	var writer = NewWriter()
	var readers []io.Reader

	for range readerCount {
		readers = append(readers, writer.Transpile())
	}

	_, _ = writer.Write([]byte("Hello"))
	_, _ = writer.Write([]byte(" "))
	_, _ = writer.Write([]byte("World!"))
	_ = writer.Close()

	var res strings.Builder

	for i := range readerCount {
		for {
			var buffer = make([]byte, 2)
			_, err := readers[i].Read(buffer)
			if err == io.EOF {
				break
			}
			_, _ = res.WriteString(string(buffer))
		}
		require.Equal(t, "Hello World!", res.String())
		res.Reset()
	}
}

// Benchmark_DefaultPipe-8 (4 b)   	   		61956	     19177 ns/op	      48 B/op	       1 allocs/op
// Benchmark_DefaultPipe-8 (8 mb)   	      24	  48471316 ns/op	     257 B/op	       1 allocs/op
func Benchmark_DefaultPipe(b *testing.B) {
	var data [sendMessageSize]byte
	var buffer = make([]byte, len(data))
	var readers []io.Reader
	var writers []io.Writer

	for range readerCount {
		r, w := io.Pipe()
		readers = append(readers, r)
		writers = append(writers, w)
	}

	b.ReportAllocs()

	for b.Loop() {
		go func() {
			for i := range readerCount {
				_, _ = writers[i].Write(data[:])
			}
		}()
		for i := range readerCount {
			_, _ = readers[i].Read(buffer)
		}
	}
}

// Benchmark_SharedPipe-8 (4 b)  	  	161847	      8131 ns/op	     160 B/op	       2 allocs/op
// Benchmark_SharedPipe-8 (8 mb)  	      75	  15710658 ns/op	     161 B/op	       2 allocs/op
func Benchmark_SharedPipe(b *testing.B) {
	var data [sendMessageSize]byte
	var buffer = make([]byte, len(data))
	var writer = NewWriter()
	var readers []io.Reader

	for range readerCount {
		readers = append(readers, writer.Transpile())
	}

	b.ReportAllocs()

	for b.Loop() {
		_, _ = writer.Write(data[:])
		for i := range readerCount {
			_, _ = readers[i].Read(buffer)
		}
	}
}
