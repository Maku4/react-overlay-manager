import { expectError } from 'tsd';
import { type OpenOptions } from '../src';

// id must be an OverlayId; plain string should be rejected
// Use the options type directly to avoid overloads influencing the check
declare function acceptsOptions(o: OpenOptions<{}>): void;
expectError(acceptsOptions({ id: 'plain-string' }));
