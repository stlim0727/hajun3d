// Ported from stlim0727/flight3d (stallSpeedEstimate.js)
(function(ns) {
  'use strict';

  const { Atmosphere, longitudinalForces } = ns;

  function stallSpeedEstimate(aero, gear = 0) {
    const flap = aero.currentFlapAngle;
    const alpha = aero.alphaStallClean + 2 * Math.PI / 180 * flap / 40;
    const cl = aero.CL0_clean + 0.95 * flap / 40 - 0.38 * aero.spoilers + aero.CLa * alpha;
    const cd = aero.CD0 + 0.0012 * flap + 0.000045 * flap * flap
      + aero.gearDrag * gear + aero.spoilerDrag * aero.spoilers
      + cl * cl / (Math.PI * aero.aspectRatio * aero.oswaldEfficiency);
    const result = {}, trial = {};
    let elevator = (aero.Cm0 + aero.Cma * alpha) / aero.Cm_de;
    for (let i = 0; i < 12; i++) {
      longitudinalForces(aero, 1, alpha, cl, cd, elevator, 0, result);
      if (Math.abs(result.pitch) < 1e-8) break;
      longitudinalForces(aero, 1, alpha, cl, cd, elevator + 1e-5, 0, trial);
      const derivative = (trial.pitch - result.pitch) / 1e-5;
      if (Math.abs(derivative) < 1e-9) return null;
      elevator -= result.pitch / derivative;
    }
    longitudinalForces(aero, 1, alpha, cl, cd, elevator, 0, result);
    if (Math.abs(result.pitch) > 1e-5 || !(result.lift > 0)) return null;
    return Atmosphere.msToKnots(Math.sqrt(2 * aero.mass * Atmosphere.G0 / (1.225 * result.lift)));
  }

  ns.stallSpeedEstimate = stallSpeedEstimate;
})(globalThis.Flight3dPhysics = globalThis.Flight3dPhysics || {});
