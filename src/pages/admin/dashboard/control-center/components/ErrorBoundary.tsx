import { Component, type ReactNode } from "react";

/** Keeps a render error from blanking the whole page — shows the message instead. */
export class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[ControlCenter] render error:", error); }

  render() {
    if (this.state.error) {
      return (
        <div className="cc-glass m-6 p-8 text-center">
          <p className="font-display text-base font-semibold text-foreground">No se pudo cargar el panel de control</p>
          <p className="mt-1 text-sm text-muted-foreground">{this.state.error.message}</p>
          <button onClick={() => location.reload()}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-black"
            style={{ background: "var(--cc-accent)" }}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
