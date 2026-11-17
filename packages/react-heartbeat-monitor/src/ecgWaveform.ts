/**
 * ECG waveform synthesis.
 *
 * One heartbeat is the sum of a few Gaussian bumps (P, Q, R, S, T), positioned
 * relative to the R peak. Tweak DEFAULT_WAVEFORM or pass your own array via
 * the `waveform` prop to get a different rhythm shape.
 */

export interface EcgWave {
  /** Peak height relative to the R wave (R = 1). Negative = downward deflection. */
  amplitude: number;
  /** Position relative to the R peak, in seconds (as measured at 60 bpm). */
  offset: number;
  /** Width (standard deviation of the Gaussian), in seconds. */
  width: number;
  /**
   * Whether offset and width shrink at higher heart rates.
   * True for P and T (like in a real ECG), false for the narrow QRS complex.
   */
  scalesWithRate?: boolean;
}

export const DEFAULT_WAVEFORM: EcgWave[] = [
  { amplitude: 0.12, offset: -0.2, width: 0.024, scalesWithRate: true }, // P
  { amplitude: -0.14, offset: -0.03, width: 0.009 }, // Q
  { amplitude: 1, offset: 0, width: 0.011 }, // R
  { amplitude: -0.3, offset: 0.03, width: 0.011 }, // S
  { amplitude: 0.3, offset: 0.24, width: 0.042, scalesWithRate: true }, // T
];

/** Sums all waves of a single beat at time `t` (seconds relative to its R peak). */
function evaluateBeat(waves: EcgWave[], t: number, rateScale: number): number {
  let value = 0;
  for (const wave of waves) {
    const scale = wave.scalesWithRate ? rateScale : 1;
    const d = (t - wave.offset * scale) / (wave.width * scale);
    // Skip the exp() when we're far out on the tail, it's effectively zero.
    if (d > -5 && d < 5) value += wave.amplitude * Math.exp(-0.5 * d * d);
  }
  return value;
}

/**
 * Samples the ECG signal.
 *
 * @param phase       Position within the current beat, 0..1.
 * @param rPeakPhase  Where the R peak sits within a beat, 0..1.
 * @param rr          Duration of the current beat (R-R interval) in seconds.
 */
export function sampleEcg(waves: EcgWave[], phase: number, rPeakPhase: number, rr: number): number {
  // Bazett-style scaling: P and T move closer to the QRS at higher rates.
  const rateScale = Math.sqrt(rr);
  const t = (phase - rPeakPhase) * rr;
  // Neighbouring beats are included so wide T/P waves can overlap beat boundaries at high rates.
  return (
    evaluateBeat(waves, t, rateScale) +
    evaluateBeat(waves, t - rr, rateScale) +
    evaluateBeat(waves, t + rr, rateScale)
  );
}
