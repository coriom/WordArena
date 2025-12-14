"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function EditorGame() {
  const [durationMin, setDurationMin] = useState(5); // durée configurable
  const totalSeconds = useMemo(() => durationMin * 60, [durationMin]);

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);

  const [text, setText] = useState("");
  const [locked, setLocked] = useState(false); // lock quand le timer finit

  const tickRef = useRef<number | null>(null);

  // Reset quand la durée change (simple et clair pour MVP)
  useEffect(() => {
    setRunning(false);
    setLocked(false);
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  // Tick timer
  useEffect(() => {
    if (!running) return;

    tickRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // fin
          window.clearInterval(tickRef.current!);
          tickRef.current = null;
          setRunning(false);
          setLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [running]);

  // Autosave local
  useEffect(() => {
    const key = "wordarena_mvp_text";
    const saved = localStorage.getItem(key);
    if (saved) setText(saved);
  }, []);

  useEffect(() => {
    const key = "wordarena_mvp_text";
    localStorage.setItem(key, text);
  }, [text]);

  const start = () => {
    if (secondsLeft === 0) return;
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setLocked(false);
    setSecondsLeft(totalSeconds);
  };

  const clearText = () => {
    setText("");
    localStorage.removeItem("wordarena_mvp_text");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">WordArena — Solo</h1>
          <p className="text-sm text-gray-600">
            Écris pendant le chrono. À zéro, le texte se verrouille.
          </p>
        </div>

        <div className="text-right">
          <div className="text-4xl font-mono">{formatTime(secondsLeft)}</div>
          <div className="text-xs text-gray-500">
            {locked ? "Terminé" : running ? "En cours" : "En pause"}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-700">Durée :</label>

        <select
          className="rounded border px-2 py-1"
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          disabled={running}
        >
          {[1, 2, 3, 5, 10, 15, 20].map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          {!running ? (
            <button
              onClick={start}
              className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
              disabled={locked || secondsLeft === 0}
            >
              Start
            </button>
          ) : (
            <button
              onClick={pause}
              className="rounded bg-black px-3 py-2 text-white"
            >
              Pause
            </button>
          )}

          <button onClick={reset} className="rounded border px-3 py-2">
            Reset
          </button>

          <button onClick={clearText} className="rounded border px-3 py-2">
            Effacer
          </button>
        </div>
      </div>

      <textarea
        className="h-[55vh] w-full resize-none rounded-xl border p-4 text-base leading-relaxed"
        placeholder="Écris ici..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={locked}
      />

      <footer className="flex items-center justify-between text-sm text-gray-600">
        <div>Mots : {text.trim() ? text.trim().split(/\s+/).length : 0}</div>
        <div>Caractères : {text.length}</div>
      </footer>

      {locked && (
        <div className="rounded-xl border p-4">
          <div className="font-semibold">Temps écoulé ✅</div>
          <div className="text-sm text-gray-600">
            Prochaine étape : sauvegarder une “partie” (titre, date, texte) et
            afficher un historique.
          </div>
        </div>
      )}
    </div>
  );
}
