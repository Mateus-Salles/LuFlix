const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { exec } = require('child_process');
const pool = require('../src/db');
const { setMediaPath } = require('../src/utils/manifest');

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

async function run() {
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  const testMovieDir = path.join(uploadsDir, 'movies', 'test-hls');
  const testMoviePlaylist = path.join(testMovieDir, 'index.m3u8');
  
  const testEpisodeDir = path.join(uploadsDir, 'episodes', 'test-hls');
  const testEpisodePlaylist = path.join(testEpisodeDir, 'index.m3u8');

  // Ensure directories exist
  fs.mkdirSync(testMovieDir, { recursive: true });
  fs.mkdirSync(testEpisodeDir, { recursive: true });

  const tempMp4 = path.join(__dirname, 'temp_test.mp4');
  if (fs.existsSync(tempMp4)) fs.unlinkSync(tempMp4);

  console.log("Generating 10-second test video...");
  const ffmpeg = getFFmpegPath();
  const genCmd = `${ffmpeg} -y -f lavfi -i color=c=blue:s=640x360:d=10 -c:v libx264 -t 10 "${tempMp4}"`;
  
  await new Promise((resolve, reject) => {
    exec(genCmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log("Converting to HLS for Movie...");
  const hlsMovieCmd = `${ffmpeg} -y -i "${tempMp4}" -c:v libx264 -preset ultrafast -c:a aac -hls_time 5 -hls_playlist_type vod -hls_segment_filename "${testMovieDir.replace(/\\/g, "/")}/segment_%03d.ts" "${testMoviePlaylist.replace(/\\/g, "/")}"`;
  await new Promise((resolve, reject) => {
    exec(hlsMovieCmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log("Converting to HLS for Episode...");
  const hlsEpisodeCmd = `${ffmpeg} -y -i "${tempMp4}" -c:v libx264 -preset ultrafast -c:a aac -hls_time 5 -hls_playlist_type vod -hls_segment_filename "${testEpisodeDir.replace(/\\/g, "/")}/segment_%03d.ts" "${testEpisodePlaylist.replace(/\\/g, "/")}"`;
  await new Promise((resolve, reject) => {
    exec(hlsEpisodeCmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Clean up temp file
  if (fs.existsSync(tempMp4)) fs.unlinkSync(tempMp4);

  console.log("Querying IDs from database...");
  try {
    const movieRes = await pool.query("SELECT id_filme FROM vw_show_movies_data WHERE titulo = 'Aurora de Neon'");
    if (movieRes.rows[0]) {
      const movieId = movieRes.rows[0].id_filme;
      setMediaPath('movies', movieId, 'uploads/movies/test-hls/index.m3u8');
      console.log(`Movie 'Aurora de Neon' (ID: ${movieId}) associated with HLS test stream.`);
    }

    const epRes = await pool.query("SELECT episode_id FROM episodes WHERE title = 'A Origem da Rota'");
    if (epRes.rows[0]) {
      const epId = epRes.rows[0].episode_id;
      setMediaPath('episodes', epId, 'uploads/episodes/test-hls/index.m3u8');
      console.log(`Episode 'A Origem da Rota' (ID: ${epId}) associated with HLS test stream.`);
    }
  } catch (err) {
    console.error("DB error during mapping:", err.message);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);
