const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { compressVideo } = require('../src/controllers/catalog.controller');

// Helper to get path matching the controller
function getFFmpegPath() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\mateu', 'AppData', 'Local');
  const wingetPackagesDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
  
  if (fs.existsSync(wingetPackagesDir)) {
    try {
      const packages = fs.readdirSync(wingetPackagesDir);
      for (const pkg of packages) {
        if (pkg.includes('Gyan.FFmpeg')) {
          const pkgPath = path.join(wingetPackagesDir, pkg);
          const subdirs = fs.readdirSync(pkgPath);
          for (const subdir of subdirs) {
            if (subdir.startsWith('ffmpeg-')) {
              const ffmpegExe = path.join(pkgPath, subdir, 'bin', 'ffmpeg.exe');
              if (fs.existsSync(ffmpegExe)) {
                return `"${ffmpegExe}"`;
              }
            }
          }
        }
      }
    } catch (e) {}
  }
  return 'ffmpeg';
}

async function test() {
  const dummyInput = path.join(__dirname, 'dummy.mp4');
  const dummyOutput = path.join(__dirname, 'dummy_compressed.mp4');

  // Clean up previous runs
  if (fs.existsSync(dummyInput)) fs.unlinkSync(dummyInput);
  if (fs.existsSync(dummyOutput)) fs.unlinkSync(dummyOutput);

  console.log("Generating a 1-second dummy video using FFmpeg...");
  const ffmpeg = getFFmpegPath();
  const genCmd = `${ffmpeg} -y -f lavfi -i color=c=blue:s=320x240:d=1 "${dummyInput}"`;
  
  await new Promise((resolve, reject) => {
    exec(genCmd, (err, stdout, stderr) => {
      if (err) {
        console.error("Failed to generate dummy video:", stderr || err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  console.log("Dummy video generated successfully at:", dummyInput);
  console.log("Compressing video using compressVideo()...");
  
  try {
    const startTime = Date.now();
    await compressVideo(dummyInput, dummyOutput);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n--- TEST SUCCESSFUL ---`);
    console.log(`Compression time: ${duration}s`);
    console.log(`Original size: ${fs.statSync(dummyInput).size} bytes`);
    console.log(`Compressed size: ${fs.statSync(dummyOutput).size} bytes`);
    console.log(`Compressed file exists: ${fs.existsSync(dummyOutput)}`);
  } catch (err) {
    console.error("\n--- TEST FAILED ---");
    console.error("Compression error:", err.message);
  } finally {
    // Cleanup
    if (fs.existsSync(dummyInput)) {
      try { fs.unlinkSync(dummyInput); } catch(e){}
    }
    if (fs.existsSync(dummyOutput)) {
      try { fs.unlinkSync(dummyOutput); } catch(e){}
    }
  }
}

test().catch(console.error);
