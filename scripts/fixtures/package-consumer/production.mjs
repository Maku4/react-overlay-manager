import React from 'react';
import {
  createOverlayManager,
  OverlayManager,
} from '@react-overlay-manager/core';
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';

const manager = createOverlayManager();
export function App() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(OverlayManager, { manager }),
    React.createElement(OverlayManagerDevtools, { manager })
  );
}
