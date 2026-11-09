# FBXLoader: slow parse of FBX files with many compressed arrays

`FBXLoader.parse` takes about 10 s on `Standard.fbx` (20.6 MB binary FBX, 46 animation clips, 32,190 compressed array properties). Passing the known output size to `unzlibSync` brings it down to about 1 s.

## Run

```sh
npm install
npm start
```

Output with Node 24.18 and three 0.186.1:

```
FBXLoader.parse (three r186): 10193 ms
FBXLoader.parse (sized unzlibSync output): 1242 ms
```

`index.js` times the stock loader, then times a copy of `FBXLoader.js` with the one-line change below.

## Cause

`BinaryParser.parseProperty` inflates compressed arrays without an output buffer:

```js
const data = unzlibSync( new Uint8Array( reader.getArrayBuffer( compressedLength ) ) );
```

Without one, fflate (0.8.2, `examples/jsm/libs/fflate.module.js`) has to guess the output size, and before each deflate block it grows its buffer to at least `written + 131072` bytes. Every array therefore costs at least 128 KiB of allocation, even when it holds a few hundred bytes. The arrays in this file decompress to 12.4 MB in total, but the loader allocates over 4 GB to get there, and most of the parse time goes to fflate buffer growth and garbage collection.

## Fix

The decompressed size is already known from the array header (`arrayLength` × element size):

```js
const elementSize = ( type === 'b' || type === 'c' ) ? 1 : ( type === 'f' || type === 'i' ) ? 4 : 8;
const data = unzlibSync( new Uint8Array( reader.getArrayBuffer( compressedLength ) ), { out: new Uint8Array( arrayLength * elementSize ) } );
```

fflate then writes straight into that buffer, and `data.buffer` is still an `ArrayBuffer` of exactly the expected size for the `BinaryReader` that follows.
