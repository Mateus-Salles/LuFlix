const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { convertToHLS } = require('../src/controllers/catalog.controller');

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

async function testHLS() {
  const dummyInput = path.join(__dirname, 'dummy_test.mp4');
  const hlsDir = path.join(__dirname, 'dummy_test_hls');
  const dummyOutputPlaylist = path.join(hlsDir, 'index.m3u8');

  // Clean up previous runs
  if (fs.existsSync(dummyInput)) fs.unlinkSync(dummyInput);
  if (fs.existsSync(hlsDir)) {
    fs.rmSync(hlsDir, { recursive: true, force: true });
  }

  console.log("Generating a 15-second dummy video using FFmpeg...");
  const ffmpeg = getFFmpegPath();
  // 15 seconds will ensure we get at least two 10-second segments
  const genCmd = `${ffmpeg} -y -f lavfi -i color=c=red:s=320x240:d=15 -c:v libx264 -t 15 "${dummyInput}"`;
  
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
  console.log("Converting video to HLS...");

  try {
    const startTime = Date.now();
    await convertToHLS(dummyInput, dummyOutputPlaylist);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n--- HLS CONVERSION SUCCESSFUL ---`);
    console.log(`Conversion time: ${duration}s`);
    console.log(`Playlist folder: ${hlsDir}`);
    console.log(`Playlist file exists: ${fs.existsSync(dummyOutputPlaylist)}`);
    
    const files = fs.readdirSync(hlsDir);
    console.log(`Files generated in output folder:`, files);
    
    const hasTS = files.some(file => file.endsWith('.ts'));
    const hasM3U8 = files.some(file => file.endsWith('.m3u8'));
    
    if (hasTS && hasM3U8) {
      console.log("PASSED: Playlist and segment files were generated correctly!");
    } else {
      console.log("FAILED: Missing playlist or segment files.");
    }
  } catch (err) {
    console.error("\n--- HLS CONVERSION FAILED ---");
    console.error("HLS conversion error:", err.message);
  } finally {
    // Cleanup
    if (fs.existsSync(dummyInput)) {
      try { fs.unlinkSync(dummyInput); } catch(e){}
    }
    if (fs.existsSync(hlsDir)) {
      try { fs.rmSync(hlsDir, { recursive: true, force: true }); } catch(e){}
    }
  }
}

testHLS().catch(console.error);
