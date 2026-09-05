"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Lang = "en" | "hi" | "es";
const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = (localStorage.getItem("luminalib_lang") as Lang) || "en";
    setLangState(saved);
    document.documentElement.lang = saved;
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("luminalib_lang", l);
    document.documentElement.lang = l;
  };
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}
export const useLang = () => useContext(LangContext);
