import React, { useLayoutEffect, useRef, useState } from "react";
import { TextInput } from "react-native";
import { Input } from "tamagui";

// ComponentProps<typeof Input> resolves the concrete props of the rendered
// component — Omit<InputProps, ...> on Tamagui's union-typed props drops
// variant keys like `size`.
export type FastInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChangeText"
> & {
  /** Initial/current text. Re-applied only while the field is NOT focused —
   *  typing never re-renders the parent screen.
   *  An external change to "" always applies (search ✕ buttons). */
  value?: string;
  /** Fires on every keystroke with the latest text (same contract as before). */
  onChangeText?: (text: string) => void;
};

/**
 * Perf-safe TextInput for controlled screens.
 *
 * Every keystroke in a controlled <Input value onChangeText={setState}> re-renders
 * the whole screen (charts, lists, staggered rows) — on low-end devices that
 * drops keystrokes. This variant keeps the text in LOCAL state instead:
 *  - typing re-renders only this tiny component, never the parent,
 *  - onChangeText still fires on every keystroke (write it to a ref),
 *  - `value` changes from outside (form seeding/clearing) apply while the
 *    field is not focused, so they can't race with or revert typing.
 *
 * Submit handlers read the latest text via their onChangeText callback
 * (refs), not from parent `value` state — see AdminDashboard / login usage.
 */
export const FastInput = React.forwardRef<TextInput, FastInputProps & { ref?: any }>(
  ({ value, onChangeText, ...rest }, _outerRef) => {
    const [text, setText] = useState(value ?? "");
    // Latest text also kept in a ref for cheap comparison without re-renders.
    const textRef = useRef(value ?? "");
    const focusedRef = useRef(false);

    // Sync external value changes into the local text — but never while the
    // user is editing (a stale parent value must not revert keystrokes),
    // except an explicit clear to "" (search ✕ button) which always applies.
    useLayoutEffect(() => {
      const external = value ?? "";
      if (external === textRef.current) return;
      if (focusedRef.current && external !== "") return;
      textRef.current = external;
      setText(external);
    }, [value]);

    const handleChange = (next: string) => {
      textRef.current = next;
      setText(next);
      onChangeText?.(next);
    };

    const { onFocus, onBlur, ...inputRest } = rest;
    const handleFocus = (e: any) => {
      focusedRef.current = true;
      onFocus?.(e);
    };
    const handleBlur = (e: any) => {
      focusedRef.current = false;
      onBlur?.(e);
    };

    return (
      <Input
        {...inputRest}
        value={text}
        onChangeText={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );
  },
);
