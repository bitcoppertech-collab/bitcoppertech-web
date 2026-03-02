import { readdir, readFile, writeFile } from "fs/promises";
import { join, extname } from "path";
import JavaScriptObfuscator from "javascript-obfuscator";

const BUILD_DIR = join(process.cwd(), "dist", "public", "assets");

async function getJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getJsFiles(fullPath)));
    } else if (extname(entry.name) === ".js") {
      files.push(fullPath);
    }
  }
  return files;
}

async function obfuscateFile(filePath) {
  const code = await readFile(filePath, "utf-8");
  const result = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: false,
    shuffleStringArray: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ["base64"],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: "function",
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
  });
  await writeFile(filePath, result.getObfuscatedCode(), "utf-8");
  console.log(`  Obfuscated: ${filePath}`);
}

async function main() {
  console.log("Starting frontend code obfuscation...");
  try {
    const jsFiles = await getJsFiles(BUILD_DIR);
    console.log(`Found ${jsFiles.length} JS files to obfuscate`);
    for (const file of jsFiles) {
      await obfuscateFile(file);
    }
    console.log("Obfuscation complete.");
  } catch (err) {
    console.error("Obfuscation error:", err.message);
    process.exit(1);
  }
}

main();
