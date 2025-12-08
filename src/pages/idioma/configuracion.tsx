import { useEffect, useMemo, useRef, useState } from "react"
import { Globe2, Check, Loader2 } from "lucide-react"
import AppLayout from "@/layouts/app-layout";

type Lang = { code: string; name: string; flag: string }
const LANGS: Lang[] = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
]

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: any
  }
}

/* ---------- UTILS ---------- */
function setCookie(name: string, value: string, days = 365, domain?: string) {
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  const base = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`
  document.cookie = domain ? `${base};domain=${domain}` : base
}

function getSelectedLang(): string {
  const stored = typeof window !== "undefined" ? localStorage.getItem("language") : null
  return stored || "es"
}

/* ---------- HOOK: CARGAR GOOGLE TRANSLATE ---------- */
function useGoogleTranslate(langs: string[]) {
  const [ready, setReady] = useState(false)
  const injected = useRef(false)

  useEffect(() => {
    if (injected.current) return
    injected.current = true

    // Ocultar todas las interfaces feas de Google
    const style = document.createElement("style")
    style.textContent = `
      .goog-te-banner-frame, 
      .goog-te-balloon-frame, 
      .goog-te-menu-frame, 
      #goog-gt-tt, 
      .skiptranslate, 
      .VIpgJd-ZVi9od-ORHb-OEVmcd, 
      .VIpgJd-ZVi9od-l4eHX-hSRGPd {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
      }
      body { top: 0 !important; }
      .goog-logo-link, .goog-te-gadget span { display: none !important; }
      #__gt_container { height: 0 !important; overflow: hidden !important; }
    `
    document.head.appendChild(style)

    // Evita recargar si ya existe
    if (document.getElementById("__gt_script")) {
      setReady(true)
      return
    }

    const script = document.createElement("script")
    script.id = "__gt_script"
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
    script.async = true

    window.googleTranslateElementInit = () => {
      // @ts-ignore
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "es",
          includedLanguages: langs.join(","),
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "__gt_container"
      )
      setReady(true)
    }

    document.body.appendChild(script)
  }, [langs])

  return ready
}

/* ---------- FUNCIÓN PARA CAMBIAR IDIOMA ---------- */
function changeLanguage(code: string) {
  const value = `/auto/${code}`
  setCookie("googtrans", value)

  // Cookie también en dominio raíz (.midominio.com)
  const host = window.location.hostname
  const parts = host.split(".")
  if (parts.length >= 2) {
    const root = `.${parts.slice(-2).join(".")}`
    setCookie("googtrans", value, 365, root)
  }

  localStorage.setItem("language", code)

  // Recargar la página para aplicar la traducción
  window.location.reload()
}

/* ---------- COMPONENTE PRINCIPAL ---------- */
export default function LanguageGooglePage() {
  const allowed = useMemo(() => LANGS.map((l) => l.code), [])
  const ready = useGoogleTranslate(allowed)
  const [selected, setSelected] = useState(getSelectedLang())
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const onPick = (code: string) => {
    setSelected(code)
    const lang = LANGS.find((l) => l.code === code)
    setToastMessage(`Cambiando idioma a ${lang?.name ?? code.toUpperCase()}`)
    setShowToast(true)
    // Pequeño delay para que se vea el toast antes de recargar
    setTimeout(() => changeLanguage(code), 500)
  }

  useEffect(() => {
    // Solo aplicar cookies en la carga inicial, SIN recargar
    const stored = getSelectedLang()
    const value = `/auto/${stored}`
    setCookie("googtrans", value)
    
    const host = window.location.hostname
    const parts = host.split(".")
    if (parts.length >= 2) {
      const root = `.${parts.slice(-2).join(".")}`
      setCookie("googtrans", value, 365, root)
    }
  }, [])

  return (
    <AppLayout>
      <div className="px-5  space-y-8">
        <header className="flex items-center gap-3">
          <Globe2 className="h-7 w-7 text-emerald-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Idioma de la interfaz</h1>
            <p className="text-slate-400">
              Traducción instantánea con Google Translate, integrada a tu panel.
            </p>
          </div>
        </header>

        {/* Selección de idioma */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Selecciona un idioma</h2>

          {!ready ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/50 p-4 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando motor de traducción…
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onPick(lang.code)}
                  className={[
                    "flex items-center justify-between rounded-xl border p-4 transition-all duration-200",
                    selected === lang.code
                      ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                      : "border-white/10 bg-slate-800/50 hover:bg-slate-800 hover:border-emerald-400/40",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 text-left">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <p className="text-base font-medium text-white">{lang.name}</p>
                      <p className="text-xs text-slate-400">{lang.code.toUpperCase()}</p>
                    </div>
                  </div>
                  {selected === lang.code && <Check className="h-5 w-5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500 text-center">
            Traducido automáticamente por Google Translate.
          </p>
        </div>

        {/* Vista previa */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Vista previa</h2>
          <div className="rounded-lg border border-white/10 bg-slate-800/60 p-4 text-slate-200 text-center">
            {selected === "es" && <p>Tu idioma actual es <strong>Español</strong>.</p>}
            {selected === "en" && <p>Your current language is <strong>English</strong>.</p>}
            {selected === "pt" && <p>Seu idioma atual é <strong>Português</strong>.</p>}
            {selected === "fr" && <p>Votre langue actuelle est <strong>Français</strong>.</p>}
            {selected === "de" && <p>Ihre aktuelle Sprache ist <strong>Deutsch</strong>.</p>}
            {selected === "it" && <p>La tua lingua corrente è <strong>Italiano</strong>.</p>}
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              const prev = localStorage.getItem("language") || "es"
              setSelected(prev)
            }}
            className="rounded-lg border border-white/10 bg-slate-800/60 px-5 py-2 text-slate-200 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const lang = LANGS.find((l) => l.code === selected)
              setToastMessage(`Cambiando idioma a ${lang?.name ?? selected.toUpperCase()}`)
              setShowToast(true)
              setTimeout(() => changeLanguage(selected), 500)
            }}
            className="rounded-lg hover:cursor-pointer bg-emerald-500 px-5 py-2 font-semibold text-slate-900 hover:bg-emerald-400"
          >
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Contenedor oculto para Google */}
      <div id="__gt_container" className="hidden" />

      {/* Toast simple */}
      {showToast && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-emerald-500 px-6 py-3 text-slate-900 font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}
    </AppLayout>
  )
}