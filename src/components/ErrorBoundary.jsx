import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error en la aplicación:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-lg">
        <h2 className="mb-2 text-lg font-bold text-red-900">Algo no cargó correctamente</h2>
        <p className="mb-4 font-mono text-xs text-red-700">{String(this.state.error)}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-primary">
          Recargar página
        </button>
      </div>
    );
  }
}
