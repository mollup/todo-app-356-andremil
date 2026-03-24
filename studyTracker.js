/**
 * Simple library for tracking study sessions by subject.
 *
 * Public API:
 * - createStudyTracker()
 * - StudyTracker class
 *
 * A "session" has:
 * - start (Date)
 * - end (Date)
 * - subject (string)
 *
 * All times are interpreted in the local timezone based on the provided
 * date (YYYY-MM-DD) and time (HH:MM) strings.
 */

class StudyTracker {
  constructor() {
    this._sessions = [];
    this._currentSession = null;
  }

  /**
   * Starts a new study session.
   *
   * @param {string} date - Date string in format YYYY-MM-DD.
   * @param {string} time - Time string in 24h format HH:MM.
   * @param {string} subject - Subject name for this session (may be empty string).
   */
  startStudying(date, time, subject) {
    if (!date || !time || subject === undefined || subject === null) {
      throw new Error("startStudying(date, time, subject) requires date, time, and a subject value.");
    }
    if (this._currentSession) {
      throw new Error("A study session is already in progress. End it before starting a new one.");
    }

    const start = this._parseDateTime(date, time);

    this._currentSession = {
      subject,
      start,
      end: null,
    };
  }

  /**
   * Ends the current study session.
   *
   * @param {string} date - Date string in format YYYY-MM-DD.
   * @param {string} time - Time string in 24h format HH:MM.
   */
  endStudying(date, time) {
    if (!this._currentSession) {
      throw new Error("No study session is currently in progress.");
    }
    if (!date || !time) {
      throw new Error("endStudying(date, time) requires both date and time.");
    }

    const end = this._parseDateTime(date, time);
    if (end < this._currentSession.start) {
      throw new Error("End time cannot be before start time.");
    }

    this._currentSession.end = end;
    this._sessions.push(this._currentSession);
    this._currentSession = null;
  }

  /**
   * Returns aggregated statistics per subject.
   *
   * Output format:
   * {
   *   subjects: {
   *     "Math": {
   *       totalMilliseconds: number,
   *       totalMinutes: number,
   *       totalHours: number,
   *       totalDays: number,
   *       sessionCount: number
   *     },
   *     ...
   *   },
   *   overall: {
   *     totalMilliseconds: number,
   *     totalMinutes: number,
   *     totalHours: number,
   *     totalDays: number,
   *     sessionCount: number
   *   }
   * }
   */
  getStats() {
    const subjectTotalsMs = {};
    let overallMs = 0;
    let overallCount = 0;

    for (const session of this._sessions) {
      if (!session.end) {
        // Ignore any incomplete sessions just in case.
        continue;
      }

      const durationMs = session.end - session.start;
      if (!subjectTotalsMs[session.subject]) {
        subjectTotalsMs[session.subject] = { ms: 0, count: 0 };
      }

      subjectTotalsMs[session.subject].ms += durationMs;
      subjectTotalsMs[session.subject].count += 1;

      overallMs += durationMs;
      overallCount += 1;
    }

    const subjects = {};
    for (const [subject, { ms, count }] of Object.entries(subjectTotalsMs)) {
      subjects[subject] = this._formatDuration(ms, count);
    }

    const overall = this._formatDuration(overallMs, overallCount);

    return {
      subjects,
      overall,
    };
  }

  /**
   * Clears all stored sessions and current state.
   */
  reset() {
    this._sessions = [];
    this._currentSession = null;
  }

  /**
   * Internal helper: parse date + time into a Date.
   * Expects date in YYYY-MM-DD and time in HH:MM (24h).
   * Uses local timezone.
   *
   * @param {string} date
   * @param {string} time
   * @returns {Date}
   * @private
   */
  _parseDateTime(date, time) {
    const isoLike = `${date}T${time}`;
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid date/time: "${date}" "${time}"`);
    }
    return d;
  }

  /**
   * Internal helper: convert milliseconds + count into
   * minutes/hours/days and include sessionCount.
   *
   * @param {number} ms
   * @param {number} count
   * @returns {{totalMilliseconds:number,totalMinutes:number,totalHours:number,totalDays:number,sessionCount:number}}
   * @private
   */
  _formatDuration(ms, count) {
    const minutes = ms / (1000 * 60);
    const hours = minutes / 60;
    const days = hours / 24;
    return {
      totalMilliseconds: ms,
      totalMinutes: minutes,
      totalHours: hours,
      totalDays: days,
      sessionCount: count,
    };
  }
}

/**
 * Factory function to create a new StudyTracker instance.
 */
function createStudyTracker() {
  return new StudyTracker();
}

// Basic UMD-style export so the library works in CommonJS, ES modules, and browser globals.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    StudyTracker,
    createStudyTracker,
  };
} else if (typeof window !== "undefined") {
  // eslint-disable-next-line no-undef
  window.StudyTrackerLib = {
    StudyTracker,
    createStudyTracker,
  };
}

