// Ported from stlim0727/flight3d (Atmosphere.js)
(function(ns) {
  'use strict';

  class Atmosphere {
    static R = 287.05;
    static GAMMA = 1.4;
    static G0 = 9.80665;
    static T0 = 288.15;
    static P0 = 101325.0;
    static RHO0 = 1.225;
    static LAPSE_RATE = 0.0065;
    static TROPOPAUSE_ALT = 11000.0;

    static getConditions(altitudeMeters) {
      const h = Math.max(-500, Math.min(altitudeMeters, 25000));
      let temperature, pressure;

      if (h <= Atmosphere.TROPOPAUSE_ALT) {
        temperature = Atmosphere.T0 - Atmosphere.LAPSE_RATE * h;
        pressure = Atmosphere.P0 * Math.pow(temperature / Atmosphere.T0, Atmosphere.G0 / (Atmosphere.LAPSE_RATE * Atmosphere.R));
      } else {
        const tTropo = Atmosphere.T0 - Atmosphere.LAPSE_RATE * Atmosphere.TROPOPAUSE_ALT;
        const pTropo = Atmosphere.P0 * Math.pow(tTropo / Atmosphere.T0, Atmosphere.G0 / (Atmosphere.LAPSE_RATE * Atmosphere.R));
        temperature = tTropo;
        const dh = h - Atmosphere.TROPOPAUSE_ALT;
        pressure = pTropo * Math.exp(-Atmosphere.G0 * dh / (Atmosphere.R * tTropo));
      }

      const density = pressure / (Atmosphere.R * temperature);
      const speedOfSound = Math.sqrt(Atmosphere.GAMMA * Atmosphere.R * temperature);
      const densityRatio = density / Atmosphere.RHO0;

      return { temperature, pressure, density, speedOfSound, densityRatio };
    }

    static tasToIas(tas, densityRatio) {
      return tas * Math.sqrt(Math.max(0.001, densityRatio));
    }

    static iasToTas(ias, densityRatio) {
      return ias / Math.sqrt(Math.max(0.001, densityRatio));
    }

    static msToKnots(ms) {
      return ms * 1.94384;
    }

    static knotsToMs(knots) {
      return knots / 1.94384;
    }

    static metersToFeet(m) {
      return m * 3.28084;
    }

    static feetToMeters(ft) {
      return ft / 3.28084;
    }
  }

  ns.Atmosphere = Atmosphere;
})(globalThis.Flight3dPhysics = globalThis.Flight3dPhysics || {});
