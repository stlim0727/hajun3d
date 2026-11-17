// Ported from stlim0727/flight3d (PilotPhysiology.js)
(function(ns) {
  'use strict';

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  class PilotPhysiology {
    constructor() {
      this.reset();
    }

    reset() {
      this.gZ = 1.0;
      this.consciousness = 1.0;
      this.negativeGExposure = 0.0;
      this.isGLOC = false;
      this.glocTimer = 0.0;
      this.stuporTimer = 0.0;
      this.effectiveElevator = 0.0;
      this.effectiveAileron = 0.0;
      this.effectiveRudder = 0.0;
      this.responsiveness = 1.0;
      this.glocIncidents = 0;
      this.gFatigueAccumulator = 0.0;
      this.elapsedTime = 0.0;
    }

    update(dt, gZ, rawInputs = {}, simTime = null) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      this.elapsedTime += dt;
      this.gZ = Number.isFinite(gZ) ? gZ : 1.0;
      const continuousTime = Number.isFinite(simTime) ? simTime : this.elapsedTime;

      const rawElevator = Number.isFinite(rawInputs.elevator) ? rawInputs.elevator : 0.0;
      const rawAileron = Number.isFinite(rawInputs.aileron) ? rawInputs.aileron : 0.0;
      const rawRudder = Number.isFinite(rawInputs.rudder) ? rawInputs.rudder : 0.0;

      if (this.gZ < -1.8) {
        this.negativeGExposure = clamp(this.negativeGExposure + (-1.8 - this.gZ) * dt / 5.1, 0, 1);
      } else {
        this.negativeGExposure = Math.max(0, this.negativeGExposure - dt / 2);
      }

      if (this.gZ > 5.5) {
        const drainRate = (this.gZ - 5.5) / (3.5 * 6);
        this.consciousness = Math.max(0.0, this.consciousness - drainRate * dt);
      } else if (!this.isGLOC) {
        this.consciousness = Math.min(1.0, this.consciousness + dt / 1.5);
      }

      if (this.consciousness < 0.8) this.gFatigueAccumulator += dt;

      if (this.consciousness <= 0.0 && !this.isGLOC) {
        this.isGLOC = true;
        this.glocTimer = 2.5;
        this.glocIncidents++;
      }

      if (this.isGLOC) {
        this.consciousness = 0.0;
        this.glocTimer -= dt;
        if (this.glocTimer <= 0.0 && this.gZ >= -1.8 && this.gZ <= 5.5) {
          this.isGLOC = false;
          this.stuporTimer = 1.5;
        }
      }

      let stuporFactor = 1.0;
      if (this.stuporTimer > 0.0) {
        this.stuporTimer = Math.max(0.0, this.stuporTimer - dt);
        stuporFactor = 0.5 + 0.5 * (1.0 - this.stuporTimer / 1.5);
      }

      if (this.consciousness >= 0.999 && Math.abs(this.gZ) <= 5.5 && !this.isGLOC && this.stuporTimer <= 0) {
        this.effectiveElevator = rawElevator;
        this.effectiveAileron = rawAileron;
        this.effectiveRudder = rawRudder;
        this.responsiveness = 1.0;
        return;
      }

      if (this.isGLOC) {
        const springRate = 1.0 / 1.5;
        this.effectiveElevator += Math.sign(-this.effectiveElevator) * Math.min(Math.abs(this.effectiveElevator), springRate * dt);
        this.effectiveAileron += Math.sign(-this.effectiveAileron) * Math.min(Math.abs(this.effectiveAileron), springRate * dt);
        this.effectiveRudder += Math.sign(-this.effectiveRudder) * Math.min(Math.abs(this.effectiveRudder), springRate * dt);
        this.responsiveness = 0.0;
      } else {
        const targetElevator = rawElevator * stuporFactor;
        const targetAileron = rawAileron * stuporFactor;
        const targetRudder = rawRudder * stuporFactor;

        const tauBase = 0.05;
        const tauEffective = tauBase + (1.0 - this.consciousness) * 0.6;
        const tauPitch = 1.5 * tauEffective;
        const tauRoll = tauEffective;
        const tauYaw = tauEffective;

        const alphaPitch = Math.min(1.0, dt / Math.max(0.001, tauPitch));
        const alphaRoll = Math.min(1.0, dt / Math.max(0.001, tauRoll));
        const alphaYaw = Math.min(1.0, dt / Math.max(0.001, tauYaw));

        this.effectiveElevator += (targetElevator - this.effectiveElevator) * alphaPitch;
        this.effectiveAileron += (targetAileron - this.effectiveAileron) * alphaRoll;
        this.effectiveRudder += (targetRudder - this.effectiveRudder) * alphaYaw;

        const maxAuthority = clamp(this.consciousness + 0.3, 0.2, 1.0) * stuporFactor;
        this.effectiveElevator = clamp(this.effectiveElevator, -maxAuthority, maxAuthority);
        this.effectiveAileron = clamp(this.effectiveAileron, -maxAuthority, maxAuthority);
        this.effectiveRudder = clamp(this.effectiveRudder, -maxAuthority, maxAuthority);

        if (Math.abs(this.gZ) > 5.5 && this.consciousness > 0.0) {
          const jitter = Math.sin(continuousTime * 35.0) * (Math.abs(this.gZ) - 5.5) * 0.02;
          this.effectiveElevator = clamp(this.effectiveElevator + jitter, -maxAuthority, maxAuthority);
          this.effectiveAileron = clamp(this.effectiveAileron + jitter, -maxAuthority, maxAuthority);
        }

        this.responsiveness = clamp(maxAuthority * (tauBase / tauEffective), 0.0, 1.0);
      }
    }

    get blackout() {
      if (this.isGLOC) return 1.0;
      if (this.consciousness >= 0.25) return 0.0;
      return clamp((0.25 - this.consciousness) / 0.25, 0.0, 1.0);
    }

    get grayout() {
      if (this.consciousness >= 0.8) return 0.0;
      return clamp((0.8 - this.consciousness) / 0.5, 0.0, 1.0);
    }

    get tunnelVision() {
      if (this.consciousness >= 1.0) return 0.0;
      return clamp((1.0 - this.consciousness) * 1.4, 0.0, 1.0);
    }

    get redout() {
      return this.negativeGExposure;
    }

    get blur() {
      return this.redout * 0.8;
    }

    getSnapshot() {
      return {
        gZ: this.gZ,
        consciousness: this.consciousness,
        responsiveness: this.responsiveness,
        isGLOC: this.isGLOC,
        blackout: this.blackout,
        redout: this.redout,
        tunnelVision: this.tunnelVision,
        grayout: this.grayout,
        blur: this.blur,
        glocIncidents: this.glocIncidents,
        gFatigueSeconds: this.gFatigueAccumulator,
      };
    }
  }

  ns.PilotPhysiology = PilotPhysiology;
})(globalThis.Flight3dPhysics = globalThis.Flight3dPhysics || {});
