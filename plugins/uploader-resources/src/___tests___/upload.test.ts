import { uploads, trackUpload, updateUploads, untrackUpload } from '../store'
import { get } from 'svelte/store'

describe('uploads store', () => {
  it('should track an upload', () => {
    const upload = { uuid: '1234', progress: 0, files: new Map() }
    trackUpload(upload)
    expect(get(uploads).has('1234')).toBe(true)
  });

  it('should update uploads store without modification', () => {
    // const initial = get(uploads);
    // updateUploads();
    // expect(get(uploads)).toBe(initial);
  });

  it('should untrack an upload', () => {
    // const upload = { uuid: '1234', progress: 0, files: new Map() };
    // trackUpload(upload);
    // untrackUpload(upload);
    // expect(get(uploads).has('1234')).toBe(false);
  });
});
