"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { configOk, supabase } from "../lib/supabase";
import Connexion from "./ui/Connexion";
import Routeur from "./ui/Routeur";

export default function Page() {
  const [session, setSession] = useState<Session | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setPret(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configOk) return <div className="conteneur"><p className="message message-ko">Configuration Supabase absente (variables NEXT_PUBLIC_SUPABASE_*).</p></div>;
  if (!pret) return <div className="conteneur"><p className="gris">Chargement…</p></div>;
  return session ? <Routeur session={session} /> : <Connexion />;
}
