/**
 * Authoring helper: takes the left half of a symmetric row (including the
 * center column(s)) and mirrors it to build the full row. Hand-authoring a
 * full-width pixel-art row and keeping it symmetric by eye is error-prone;
 * this makes symmetry structural instead. `halfWidth` is the width of one
 * mirrored half; the full row is `2 * halfWidth`.
 */
export function mirrorRow(left: string): string {
  return left + left.split('').reverse().join('');
}
