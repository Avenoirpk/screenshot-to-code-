```tsx
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HTTP_BACKEND_URL } from "../../config";
import { Settings } from "../../types";

type Scene = {
  number: number;
  title: string;
  duration_seconds: number;
  script_excerpt: string;
  image_prompt: string;
  video_prompt: string;
};

type Analysis = {
  video_minutes: number;
  video_seconds: number;
  scene_count: number;
  summary: string;
  scenes: Scene[];
};

interface Props {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  onBack: () => void;
}

const themes = [
  "Cinematic realistic",
  "Anime cinematic",
  "3D animated film",
  "Dark thriller",
  "Romantic soft film",
  "Documentary realistic",
  "Fantasy epic",
];

export default function ScriptStudio({
  settings,
  setSettings,
  onBack,
}: Props) {
  const [script, setScript] = useState("");
  const [outputType, setOutputType] = useState<"images" | "video">("video");

  const [duration, setDuration] = useState(
    settings.defaultClipDuration || 5
  );

  const [theme, setTheme] = useState(
    settings.promptTheme || themes[0]
  );

  const [aspect, setAspect] = useState(
    settings.videoAspectRatio || "16:9"
  );

  const [scanning, setScanning] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [generating, setGenerating] = useState<number | null>(null);
  const [videos, setVideos] = useState<Record<number, string>>({});
  const [showSettings, setShowSettings] = useState(false);

  const wordCount = useMemo(
    () =>
      script.trim()
        ? script.trim().split(/\s+/).length
        : 0,
    [script]
  );

  // ============================================================
  // SAVE LOCAL SETTINGS
  // ============================================================

  const saveLocalSettings = () => {
    setSettings((s) => ({
      ...s,
      promptTheme: theme,
      videoAspectRatio: aspect,
      defaultClipDuration: duration,
    }));
  };

  // ============================================================
  // ANALYZE SCRIPT
  // ============================================================

  async function analyze() {
    if (!script.trim()) {
      toast.error("Pehle apni script paste karein.");
      return;
    }

    saveLocalSettings();
    setScanning(true);
    setAnalysis(null);

    try {
      const res = await fetch(
        `${HTTP_BACKEND_URL}/api/script-studio/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            script,
            output_type: outputType,
            duration_seconds: duration,
            prompt_theme: theme,
            aspect_ratio: aspect,

            // Gemini key is only used for script analysis.
            gemini_api_key:
              settings.geminiApiKey || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || "Script scan failed"
        );
      }

      await new Promise((r) =>
        setTimeout(r, 650)
      );

      setAnalysis(data);

      toast.success(
        `${data.scene_count} scenes ready`
      );
    } catch (e: any) {
      toast.error(
        e.message || "Script analysis failed"
      );
    } finally {
      setScanning(false);
    }
  }

  // ============================================================
  // GENERATE ONE VIDEO
  // ============================================================
  //
  // IMPORTANT:
  // No video_model is sent from frontend.
  //
  // Backend will automatically use:
  //
  // VIDEO_MODEL=owner/model
  //
  // from the FastAPI environment.
  // ============================================================

  async function generateScene(scene: Scene) {
    if (outputType !== "video") return;

    setGenerating(scene.number);

    try {
      const res = await fetch(
        `${HTTP_BACKEND_URL}/api/script-studio/generate-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: scene.video_prompt,
            duration_seconds:
              scene.duration_seconds,
            aspect_ratio: aspect,

            // Replicate API key.
            replicate_api_key:
              settings.replicateApiKey || null,

            // IMPORTANT:
            // video_model has intentionally been removed.
            //
            // The backend now selects the video model
            // from its own VIDEO_MODEL environment variable.
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail ||
            "Video generation failed"
        );
      }

      const getUrl = data.urls?.get;

      if (!getUrl) {
        toast.success(
          `Scene ${scene.number} prediction started.`
        );
        return;
      }

      let status = data.status;
      let result = data.output;

      // ========================================================
      // POLL REPLICATE
      // ========================================================

      for (
        let i = 0;
        i < 90 &&
        ![
          "succeeded",
          "failed",
          "canceled",
        ].includes(status);
        i++
      ) {
        await new Promise((r) =>
          setTimeout(r, 2000)
        );

        const poll = await fetch(getUrl, {
          headers: {
            Authorization: `Bearer ${settings.replicateApiKey}`,
          },
        });

        const p = await poll.json();

        status = p.status;
        result = p.output;
      }

      if (status !== "succeeded") {
        throw new Error(
          `Scene ${scene.number}: ${status}`
        );
      }

      const url = Array.isArray(result)
        ? result[0]
        : result;

      if (typeof url === "string") {
        setVideos((v) => ({
          ...v,
          [scene.number]: url,
        }));
      }

      toast.success(
        `Scene ${scene.number} video ready`
      );
    } catch (e: any) {
      toast.error(
        e.message || "Video generation failed"
      );
    } finally {
      setGenerating(null);
    }
  }

  // ============================================================
  // GENERATE ALL VIDEOS
  // ============================================================

  async function generateAll() {
    if (!analysis) return;

    for (const scene of analysis.scenes) {
      await generateScene(scene);
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="mb-2 text-xs text-slate-500 hover:text-violet-600"
            >
              ← Back
            </button>

            <h1 className="text-2xl font-bold tracking-tight">
              Script Studio
            </h1>

            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Script scan → scene breakdown → prompts → video generation
            </p>
          </div>

          <button
            onClick={() =>
              setShowSettings((v) => !v)
            }
            className="rounded-xl border bg-white px-4 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            ⚙ Settings
          </button>
        </div>

        {/* SETTINGS */}
        {showSettings && (
          <div className="mb-5 grid gap-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-2">

            {/* PROMPT THEME */}
            <label className="text-sm">
              Prompt theme

              <select
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value)
                }
                className="mt-2 w-full rounded-lg border p-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {themes.map((t) => (
                  <option key={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {/* OUTPUT */}
            <label className="text-sm">
              Output

              <select
                value={outputType}
                onChange={(e) =>
                  setOutputType(
                    e.target.value as
                      | "images"
                      | "video"
                  )
                }
                className="mt-2 w-full rounded-lg border p-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="video">
                  Images + Video prompts
                </option>

                <option value="images">
                  Images only
                </option>
              </select>
            </label>

            {/* CLIP DURATION */}
            <label className="text-sm">
              Clip duration

              <select
                value={duration}
                onChange={(e) =>
                  setDuration(
                    Number(e.target.value)
                  )
                }
                className="mt-2 w-full rounded-lg border p-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {[3, 4, 5, 6, 8, 10, 15, 20].map(
                  (n) => (
                    <option
                      key={n}
                      value={n}
                    >
                      {n} seconds
                    </option>
                  )
                )}
              </select>
            </label>

            {/* ASPECT RATIO */}
            <label className="text-sm">
              Aspect ratio

              <select
                value={aspect}
                onChange={(e) =>
                  setAspect(e.target.value)
                }
                className="mt-2 w-full rounded-lg border p-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option>16:9</option>
                <option>9:16</option>
                <option>1:1</option>
              </select>
            </label>

            {/* GEMINI API KEY */}
            <label className="text-sm">
              Gemini API key

              <input
                type="password"
                value={
                  settings.geminiApiKey || ""
                }
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    geminiApiKey:
                      e.target.value,
                  }))
                }
                placeholder="AIza..."
                className="mt-2 w-full rounded-lg border p-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            {/* REPLICATE API KEY */}
            <label className="text-sm">
              Replicate API key

              <input
                type="password"
                value={
                  settings.replicateApiKey || ""
                }
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    replicateApiKey:
                      e.target.value,
                  }))
                }
                placeholder="r8_..."
                className="mt-2 w-full rounded-lg border p-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            {/*
              VIDEO MODEL INPUT REMOVED.

              User no longer enters:

              Video model (owner/model)

              Backend controls the model through
              VIDEO_MODEL environment variable.
            */}
          </div>
        )}

        {/* MAIN GRID */}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">

          {/* SCRIPT */}
          <section className="rounded-2xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">

            <div className="border-b px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  1. Paste your script
                </h2>

                <span className="text-xs text-slate-400">
                  {wordCount} words
                </span>
              </div>
            </div>

            <div className="relative p-5">

              <textarea
                value={script}
                onChange={(e) =>
                  setScript(e.target.value)
                }
                placeholder={
                  "Example:\nA boy walks through an empty city at night...\n\nPaste your complete script here. The scanner will break it into scenes."
                }
                className="min-h-[430px] w-full resize-y rounded-xl border bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950"
              />

              {scanning && (
                <div className="pointer-events-none absolute inset-5 overflow-hidden rounded-xl">
                  <div className="absolute inset-x-0 top-0 h-24 animate-[scan_1.7s_ease-in-out_infinite] border-b border-violet-400 bg-gradient-to-b from-transparent via-violet-400/10 to-violet-500/30 shadow-[0_0_18px_rgba(139,92,246,.65)]" />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">

                <button
                  disabled={scanning}
                  onClick={analyze}
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 disabled:opacity-50"
                >
                  {scanning
                    ? "Scanning script…"
                    : "🔎 Scan Script & Build Scenes"}
                </button>

                {analysis &&
                  outputType === "video" && (
                    <button
                      disabled={
                        generating !== null
                      }
                      onClick={generateAll}
                      className="rounded-xl border border-violet-300 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 disabled:opacity-50 dark:bg-violet-950/30 dark:text-violet-300"
                    >
                      {generating !== null
                        ? `Generating Scene ${generating}…`
                        : "▶ Start Generate All Videos"}
                    </button>
                  )}
              </div>
            </div>
          </section>

          {/* SCAN RESULT */}
          <section className="rounded-2xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">

            <div className="border-b px-5 py-4 dark:border-zinc-800">
              <h2 className="font-semibold">
                2. Scan result
              </h2>
            </div>

            {!analysis &&
              !scanning && (
                <div className="p-10 text-center text-sm text-slate-400">
                  Your script length, scene count
                  and prompts will appear here.
                </div>
              )}

            {scanning && (
              <div className="p-10 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-500" />

                <p className="font-medium">
                  Reading script structure…
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Characters • locations • actions • pacing
                </p>
              </div>
            )}

            {analysis && (
              <div className="p-5">

                <div className="grid grid-cols-3 gap-2">

                  <Stat
                    label="Video length"
                    value={`${analysis.video_minutes} min`}
                  />

                  <Stat
                    label="Seconds"
                    value={`${analysis.video_seconds}s`}
                  />

                  <Stat
                    label="Scenes"
                    value={`${analysis.scene_count}`}
                  />

                </div>

                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-950">
                  {analysis.summary}
                </p>

              </div>
            )}
          </section>
        </div>

        {/* SCENES */}
        {analysis && (
          <section className="mt-5 rounded-2xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">

            <div className="border-b px-5 py-4 dark:border-zinc-800">

              <h2 className="font-semibold">
                3. Scene-by-scene prompts
              </h2>

              <p className="text-xs text-slate-400">
                Prompt headings are separate; every prompt is ready to copy as a code block.
              </p>

            </div>

            <div className="space-y-5 p-5">

              {analysis.scenes.map(
                (scene) => (
                  <article
                    key={scene.number}
                    className="overflow-hidden rounded-2xl border dark:border-zinc-800"
                  >

                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 dark:bg-zinc-950">

                      <div>
                        <span className="font-semibold">
                          Scene {scene.number}:{" "}
                          {scene.title}
                        </span>

                        <span className="ml-3 text-xs text-slate-500">
                          {scene.duration_seconds}s
                        </span>
                      </div>

                      {outputType ===
                        "video" && (
                        <button
                          onClick={() =>
                            generateScene(scene)
                          }
                          disabled={
                            generating !== null
                          }
                          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {generating ===
                          scene.number
                            ? "Generating…"
                            : "Generate video"}
                        </button>
                      )}

                    </div>

                    <div className="space-y-4 p-4">

                      {/* SCRIPT */}
                      <p className="text-sm text-slate-600 dark:text-zinc-300">
                        <b>Script:</b>{" "}
                        {scene.script_excerpt}
                      </p>

                      {/* IMAGE PROMPT */}
                      <div>

                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Prompt {scene.number} — Image
                        </div>

                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                          <code>
                            {scene.image_prompt}
                          </code>
                        </pre>

                      </div>

                      {/* VIDEO PROMPT */}
                      <div>

                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Prompt {scene.number} — Video
                        </div>

                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                          <code>
                            {scene.video_prompt}
                          </code>
                        </pre>

                      </div>

                      {/* GENERATED VIDEO */}
                      {videos[scene.number] && (
                        <video
                          controls
                          className="w-full rounded-xl"
                          src={videos[scene.number]}
                        />
                      )}

                    </div>
                  </article>
                )
              )}

            </div>
          </section>
        )}
      </div>

      <style>
        {`
          @keyframes scan {
            0% {
              transform: translateY(-110%);
            }

            50% {
              transform: translateY(350%);
            }

            100% {
              transform: translateY(650%);
            }
          }
        `}
      </style>
    </div>
  );
}


// ============================================================
// STAT COMPONENT
// ============================================================

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border p-3 dark:border-zinc-800">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-semibold">
        {value}
      </div>
    </div>
  );
}
```
