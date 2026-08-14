"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/src/infrastructure/supabase/browser-client";

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function submit() {
    setWorking(true); setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const result = mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (result.error) throw result.error;
      setMessage(mode === "sign-in" ? "Sesión iniciada. Ya puedes abrir Field Beta." : "Cuenta creada. Confirma el correo si Supabase lo solicita y después inicia sesión.");
      if (mode === "sign-in") {
        await fetch("/api/auth/provision", { method: "POST" });
        router.push("/field-beta");
      }
    } catch { setMessage("No se pudo completar la autenticación."); } finally { setWorking(false); }
  }

  return <main style={{ maxWidth: 520, margin: "0 auto", padding: "4rem 1.5rem" }}>
    <p>VIRRO · INTERNAL ACCESS</p>
    <h1>{mode === "sign-in" ? "Iniciar sesión" : "Crear cuenta"}</h1>
    <p>El acceso a Field Beta requiere una identidad Supabase Auth y una membresía activa.</p>
    <label>Correo<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Contraseña<input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    <button type="button" disabled={!email || password.length < 6 || working} onClick={() => void submit()}>{working ? "Procesando…" : mode === "sign-in" ? "Entrar" : "Registrarme"}</button>
    <button type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>{mode === "sign-in" ? "Crear cuenta" : "Ya tengo cuenta"}</button>
    {message ? <p role="status">{message}</p> : null}
  </main>;
}
