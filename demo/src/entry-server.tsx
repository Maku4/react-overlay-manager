import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';

// Each call renders a new <App />, which creates its own overlay manager.
export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
