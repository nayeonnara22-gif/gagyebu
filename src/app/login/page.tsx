"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg(error.message.includes("Invalid") ? "이메일 또는 비밀번호가 맞지 않아요." : error.message);
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMsg(error.message);
      } else if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      } else {
        setMsg("가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.");
        setMode("signin");
      }
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="mb-8">
        <div className="text-3xl font-extrabold">가계부</div>
        <div className="mt-2 text-sub">{mode === "signin" ? "로그인해 주세요" : "처음 한 번만 가입하면 돼요"}</div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-[20px] bg-card p-6">
        <label className="flex flex-col gap-1.5 text-sm text-sub">
          이메일
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-line px-4 text-base text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-sub">
          비밀번호
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border border-line px-4 text-base text-ink outline-none focus:border-accent"
          />
        </label>
        {msg && <p className="text-sm text-over">{msg}</p>}
        <button
          disabled={busy}
          className="mt-2 h-12 rounded-xl bg-accent font-bold text-white disabled:opacity-60"
        >
          {busy ? "잠시만요…" : mode === "signin" ? "로그인" : "가입하기"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
          className="h-11 text-sm text-accent"
        >
          {mode === "signin" ? "처음이세요? 가입하기" : "이미 계정이 있어요"}
        </button>
      </form>
    </main>
  );
}
