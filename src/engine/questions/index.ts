import { countBetweenType } from './countBetween';
import { countWeekdaysType } from './countWeekdays';
import { dayOfWeekType } from './dayOfWeek';
import { describeTimeType } from './describeTime';
import { elapsedAddType } from './elapsedAdd';
import { elapsedBetweenType } from './elapsedBetween';
import { hour24Type } from './hour24';
import { nthWeekdayType } from './nthWeekday';
import { offsetDateType } from './offsetDate';
import { readAnalogType } from './readAnalog';
import { readCalendarType } from './readCalendar';
import { registerGenerator } from './registry';
import { setHandsType } from './setHands';
import type { QuestionType } from './types';

/**
 * The generators shipped so far, in the order they are registered.
 *
 * Importing this module registers them. Always reach the registry through this
 * barrel (`import { generateQuestion } from '../engine/questions'`) rather than
 * through `./registry`, or the registry will be empty.
 */
export const BUILT_IN_QUESTION_TYPES: readonly QuestionType[] = [
  readAnalogType,
  describeTimeType,
  readCalendarType,
  offsetDateType,
  elapsedAddType,
  elapsedBetweenType,
  setHandsType,
  dayOfWeekType,
  nthWeekdayType,
  countWeekdaysType,
  hour24Type,
  countBetweenType,
];

for (const type of BUILT_IN_QUESTION_TYPES) {
  registerGenerator(type);
}

export * from './types';
// Deliberately not `export * from './registry'`: that would also republish
// `resetGenerators`, a test-only escape hatch that empties the registry.
// Since ESM module evaluation runs once, any app code that imported it
// through this barrel and called it would permanently empty the registry the
// loop above just populated. Tests that need it import `resetGenerators`
// directly from `./registry`.
export {
  registerGenerator,
  getGenerator,
  hasGenerator,
  listGenerators,
  selectGenerator,
  generateQuestion,
} from './registry';
export * from './readAnalog';
export * from './describeTime';
export * from './readCalendar';
export * from './offsetDate';
export * from './elapsedAdd';
export * from './elapsedBetween';
export * from './setHands';
export * from './dayOfWeek';
export * from './nthWeekday';
export * from './countWeekdays';
export * from './hour24';
export * from './countBetween';
