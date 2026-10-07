import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

export interface TranscodeOptions {
  inputPath: string;
  outputDir: string;
  jobId: string;
  onProgress: (percent: number) => void;
  onReady: () => void; // fired when first segments are written
  onError: (err: Error) => void;
  onDone: () => void;
}

// Quality ladder — skip levels higher than source resolution
const LEVELS = [
  { height: 1080, bitrate: "4000k", label: "1080p" },
  { height: 720,  bitrate: "2500k", label: "720p"  },
  { height: 480,  bitrate: "1000k", label: "480p"  },
  { height: 360,  bitrate: "600k",  label: "360p"  },
];

export function transcodeToHls(opts: TranscodeOptions): () => Promise<void> {
  const { inputPath, outputDir, onProgress, onReady, onError, onDone } = opts;

  fs.mkdirSync(outputDir, { recursive: true });
  let cancelled = false;
  const commands: Array<{ kill: (signal: string) => unknown }> = [];
  const commandCompletions: Promise<void>[] = [];
  let finishProbe: () => void = () => {};
  const probeCompletion = new Promise<void>((resolve) => { finishProbe = resolve; });

  // Probe source to skip upscale levels
  ffmpeg.ffprobe(inputPath, (probeErr, metadata) => {
    finishProbe();
    if (cancelled) return;
    if (probeErr) return onError(probeErr);

    const srcHeight = metadata.streams.find((s) => s.codec_type === "video")?.height ?? 1080;
    const levels = LEVELS.filter((l) => l.height <= srcHeight);
    // Always include at least the lowest level
    if (levels.length === 0) levels.push(LEVELS[LEVELS.length - 1]);

    const readyLevels = new Set<string>();

    let pending = levels.length;

    levels.forEach((level) => {
      if (cancelled) return;
      const levelDir = path.join(outputDir, level.label);
      fs.mkdirSync(levelDir, { recursive: true });

      const playlistPath = path.join(levelDir, "index.m3u8");

      const command = ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=-2:${level.height}`,
          `-c:v libx264`,
          `-preset fast`,
          `-b:v ${level.bitrate}`,
          `-c:a aac`,
          `-b:a 128k`,
          `-hls_time 4`,
          `-hls_list_size 0`,
          `-hls_segment_filename ${levelDir}/seg%03d.ts`,
          `-hls_flags independent_segments`,
          `-f hls`,
        ])
        .output(playlistPath)
        .on("progress", (p) => {
          if (cancelled) return;
          onProgress(Math.round(p.percent ?? 0));
        })
        .on("stderr", (line: string) => {
          if (!cancelled && !readyLevels.has(level.label) && line.includes("seg000.ts")) {
            readyLevels.add(level.label);
            if (readyLevels.size === levels.length) {
              writeMasterPlaylist(outputDir, levels);
              onReady();
            }
          }
        })
        .on("end", () => {
          if (cancelled) return;
          pending--;
          if (pending === 0) {
            writeMasterPlaylist(outputDir, levels);
            onDone();
          }
        })
        .on("error", (err) => {
          if (!cancelled) onError(err);
        });

      commandCompletions.push(new Promise<void>((resolve) => {
        command.once("end", resolve);
        command.once("error", resolve);
      }));
      commands.push(command);
      command.run();
    });
  });

  return async () => {
    if (!cancelled) {
      cancelled = true;
      commands.forEach((command) => {
        try {
          command.kill("SIGKILL");
        } catch {
          // The command may already have exited.
        }
      });
    }
    await probeCompletion;
    await Promise.all(commandCompletions);
  };
}

function writeMasterPlaylist(outputDir: string, levels: typeof LEVELS) {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3", ""];

  levels.forEach((l) => {
    const bw = parseInt(l.bitrate) * 1000;
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=x${l.height}`);
    lines.push(`${l.label}/index.m3u8`);
  });

  fs.writeFileSync(path.join(outputDir, "master.m3u8"), lines.join("\n"));
}