import { Devtools } from './Devtools';

export const OverlayManagerDevtools =
  process.env.NODE_ENV === 'development' ? Devtools : () => null;
