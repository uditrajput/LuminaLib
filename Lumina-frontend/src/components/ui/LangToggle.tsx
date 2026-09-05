"use client";
import { useLang } from "@/context/LangContext";
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <select value={lang} onChange={e => setLang(e.target.value as any)} aria-label="Language" className="text-xs border rounded-full px-2 py-1 bg-white dark:bg-slate-800">
      <option value="en">EN</option>
      <option value="hi">HI</option>
      <option value="es">ES</option>
    </select>
  );
}
