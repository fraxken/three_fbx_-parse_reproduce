import { readFileSync, rmSync, writeFileSync } from "node:fs";

const stockLoader = new URL(import.meta.resolve("three/addons/loaders/FBXLoader.js"));
const fixedLoader = new URL("./FBXLoader.fixed.js", stockLoader);

const unsizedInflate = "const data = unzlibSync( new Uint8Array( reader.getArrayBuffer( compressedLength ) ) );";
const sizedInflate = "const elementSize = ( type === 'b' || type === 'c' ) ? 1 : ( type === 'f' || type === 'i' ) ? 4 : 8; " +
  "const data = unzlibSync( new Uint8Array( reader.getArrayBuffer( compressedLength ) ), { out: new Uint8Array( arrayLength * elementSize ) } );";

const file = readFileSync(new URL("./Standard.fbx", import.meta.url));
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

async function measure(label, loaderUrl) {
  const { FBXLoader } = await import(loaderUrl.href);
  const warn = console.warn;
  console.warn = () => {};
  const start = performance.now();

  new FBXLoader().parse(buffer, "");
  const elapsed = performance.now() - start;
  console.warn = warn;
  console.log(`${label}: ${Math.round(elapsed)} ms`);
}

await measure("FBXLoader.parse (three r186)", stockLoader);

writeFileSync(fixedLoader, readFileSync(stockLoader, "utf8").replace(unsizedInflate, sizedInflate));
try {
  await measure("FBXLoader.parse (sized unzlibSync output)", fixedLoader);
}
finally {
  rmSync(fixedLoader);
}
