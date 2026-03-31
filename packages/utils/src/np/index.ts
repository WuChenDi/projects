/**
 * @desc Solve floating-point arithmetic issues to avoid extra decimal digits and precision loss.
 *
 * @example 2.3 + 2.4 = 4.699999999999999, 1.0 - 0.9 = 0.09999999999999998
 */

type ValidNumberString = `${number}`
type NumberType = number | ValidNumberString

const DEFAULT_PRECISION = 15

let _boundaryCheckingState = true

/**
 * Enable or disable boundary checking (enabled by default).
 */
function enableBoundaryChecking(flag = true) {
  _boundaryCheckingState = flag
}

/**
 * Strip a number to the specified significant digits.
 *
 * @param num - The input number
 * @param precision - Number of significant digits
 *
 * @example strip(0.09999999999999998) === 0.1 // true
 */
function strip(num: NumberType, precision: number = DEFAULT_PRECISION): number {
  return +Number.parseFloat(Number(num).toPrecision(precision))
}

/**
 * Return the number of decimal digits of a number.
 *
 * @param num - The input number
 */
function digitLength(num: NumberType): number {
  // Get the exponent part length
  const eSplit = num.toString().split(/[eE]/)
  const len = ((eSplit[0] ?? '').split('.')[1] || '').length - +(eSplit[1] || 0)
  return len > 0 ? len : 0
}

/**
 * Convert a float to an integer by scaling up. Supports scientific notation.
 *
 * @param num - The input number
 */
function float2Fixed(num: NumberType): number {
  const str = num.toString()
  if (!/[eE]/.test(str)) {
    return Number(str.replace('.', ''))
  }
  const dLen = digitLength(num)
  return dLen > 0 ? strip(Number(num) * 10 ** dLen) : Number(num)
}

/**
 * Log a warning when the given number exceeds the safe integer boundary.
 *
 * @param num - The input number
 */
function checkBoundary(num: number) {
  if (_boundaryCheckingState) {
    if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
      console.warn(
        `${num} exceeds the safe integer range; the result may be inaccurate`,
      )
    }
  }
}

/**
 * Create a variadic operation function from a binary operation.
 *
 * @param operation - The binary operation function
 */
function createOperation(
  operation: (n1: NumberType, n2: NumberType) => number,
): (first: NumberType, second: NumberType, ...rest: NumberType[]) => number {
  return (first: NumberType, second: NumberType, ...rest: NumberType[]) => {
    return [second, ...rest].reduce<NumberType>(
      (prev, next) => operation(prev, next),
      first,
    ) as number
  }
}

/**
 * Precise multiplication.
 *
 * @param nums - Numbers to multiply
 */
const times = createOperation((num1: NumberType, num2: NumberType): number => {
  const num1Changed = float2Fixed(num1)
  const num2Changed = float2Fixed(num2)
  const baseNum = digitLength(num1) + digitLength(num2)
  const leftValue = num1Changed * num2Changed

  checkBoundary(leftValue)

  return leftValue / 10 ** baseNum
})

/**
 * Precise addition.
 *
 * @param nums - Numbers to add
 */
const plus = createOperation((num1: NumberType, num2: NumberType): number => {
  const baseNum = 10 ** Math.max(digitLength(num1), digitLength(num2))
  return (times(num1, baseNum) + times(num2, baseNum)) / baseNum
})

/**
 * Precise subtraction.
 *
 * @param nums - Numbers to subtract
 */
const minus = createOperation((num1: NumberType, num2: NumberType): number => {
  const baseNum = 10 ** Math.max(digitLength(num1), digitLength(num2))
  return (times(num1, baseNum) - times(num2, baseNum)) / baseNum
})

/**
 * Precise division.
 *
 * @param nums - Numbers to divide
 */
const divide = createOperation((num1: NumberType, num2: NumberType): number => {
  const num1Changed = float2Fixed(num1)
  const num2Changed = float2Fixed(num2)

  checkBoundary(num1Changed)
  checkBoundary(num2Changed)

  // Fix: e.g. 10 ** -4 === 0.00009999999999999999, use strip to correct
  return times(
    num1Changed / num2Changed,
    strip(10 ** (digitLength(num2) - digitLength(num1))),
  )
})

/**
 * Precise rounding.
 *
 * @param num - The number to round
 * @param decimal - Number of decimal places to keep
 */
function round(num: NumberType, decimal: number): number {
  const base = strip(10 ** decimal)
  let result = divide(Math.round(Math.abs(times(num, base))), base)

  if (Number(num) < 0 && result !== 0) {
    result = times(result, -1)
  }

  return result
}

/**
 * Number calculator class supporting chainable arithmetic operations.
 */
class NumberCalculator {
  constructor(private value: NumberType) {}

  /**
   * Addition. Returns this instance for chaining.
   */
  plus(num: NumberType): NumberCalculator {
    this.value = plus(this.value, num)
    return this
  }

  /**
   * Subtraction. Returns this instance for chaining.
   */
  minus(num: NumberType): NumberCalculator {
    this.value = minus(this.value, num)
    return this
  }

  /**
   * Multiplication. Returns this instance for chaining.
   */
  times(num: NumberType): NumberCalculator {
    this.value = times(this.value, num)
    return this
  }

  /**
   * Division. Returns this instance for chaining.
   */
  divide(num: NumberType): NumberCalculator {
    this.value = divide(this.value, num)
    return this
  }

  /**
   * Round to the specified decimal places. Returns this instance for chaining.
   */
  round(decimal: number): NumberCalculator {
    this.value = round(this.value, decimal)
    return this
  }

  /**
   * Return the precision-corrected current value.
   */
  valueOf(): number {
    return strip(this.value)
  }

  /**
   * Return the string representation of the precision-corrected current value.
   */
  toString(): string {
    return strip(this.value).toString()
  }
}

/**
 * Create a new calculator instance for chaining arithmetic operations.
 *
 * @param value - The initial value
 * @returns A new NumberCalculator instance
 */
function createCalculator(value: NumberType): NumberCalculator {
  return new NumberCalculator(value)
}

export {
  createCalculator,
  digitLength,
  divide,
  enableBoundaryChecking,
  float2Fixed,
  minus,
  NumberCalculator,
  plus,
  round,
  strip,
  times,
}

const NP = {
  strip,
  plus,
  minus,
  times,
  divide,
  round,
  digitLength,
  float2Fixed,
  enableBoundaryChecking,
  NumberCalculator,
  createCalculator,
}

export default NP
