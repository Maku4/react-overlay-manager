import { expectError, expectType } from 'tsd';
import { defineOverlay, type OverlayComponent, type OverlayId } from '../src';

// --- Setup ---
type MyProps = { name: string };
type MyResult = number;

// --- Tests ---

// 1. Test types within the component function body
const MyOverlay = defineOverlay<MyProps, MyResult>(
  ({ id, visible, hide, close, onExitComplete, name }) => {
    // 1.1. Injected props should have correct types
    expectType<OverlayId>(id);
    expectType<boolean>(visible);
    expectType<() => void>(hide);
    expectType<(result?: MyResult) => void>(close);
    expectType<() => void>(onExitComplete);

    // 1.2. Custom props should be correctly passed through
    expectType<string>(name);

    // 1.3. Calling close() with the wrong result type should fail
    expectError(close('a-string-is-not-a-number'));

    // 1.4. Calling close() with the correct result type should pass
    close(123);

    // 1.5. Calling close() with no arguments should also be valid (as result is optional)
    close();

    return null as any;
  }
);

// 2. The return type of defineOverlay should be a valid OverlayComponent
expectType<OverlayComponent<MyProps, MyResult>>(MyOverlay);

// 3. Test void result type
defineOverlay<{}, void>(({ close }) => {
  // 3.1. Calling close() with an argument should be an error for void result
  expectError(close(123));

  // 3.2. Calling close() with no arguments is correct
  close();

  return null as any;
});
