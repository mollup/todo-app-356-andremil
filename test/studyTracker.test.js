const assert = require("assert");
const { StudyTracker, createStudyTracker } = require("../studyTracker");

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// --- Object creation tests ---

runTest("createStudyTracker returns a StudyTracker instance", () => {
  const tracker = createStudyTracker();
  assert.ok(tracker instanceof StudyTracker, "Expected tracker to be instance of StudyTracker");
});

runTest("StudyTracker instance has expected public methods", () => {
  const tracker = createStudyTracker();

  assert.strictEqual(typeof tracker.startStudying, "function", "startStudying should be a function");
  assert.strictEqual(typeof tracker.endStudying, "function", "endStudying should be a function");
  assert.strictEqual(typeof tracker.getStats, "function", "getStats should be a function");
  assert.strictEqual(typeof tracker.reset, "function", "reset should be a function");
});

runTest("StudyTracker can be constructed directly with 'new'", () => {
  const tracker = new StudyTracker();
  assert.ok(tracker instanceof StudyTracker, "Expected tracker to be instance of StudyTracker");
});

// --- startStudying() behavior tests ---

runTest("startStudying accepts valid date, time, and subject without throwing", () => {
  const tracker = createStudyTracker();

  assert.doesNotThrow(() => {
    tracker.startStudying("2026-03-12", "09:00", "Math");
  }, "startStudying should not throw with valid date, time, and subject");
});

runTest("startStudying throws if any of date, time, or subject is missing", () => {
  const tracker = createStudyTracker();

  assert.throws(
    () => tracker.startStudying(undefined, "09:00", "Math"),
    /requires date, time, and a subject value/i,
    "Expected error when date is missing"
  );

  assert.throws(
    () => tracker.startStudying("2026-03-12", undefined, "Math"),
    /requires date, time, and a subject value/i,
    "Expected error when time is missing"
  );

  assert.throws(
    () => tracker.startStudying("2026-03-12", "09:00"),
    /requires date, time, and a subject value/i,
    "Expected error when subject argument is omitted"
  );
});

runTest("startStudying prevents starting a second session without ending the first", () => {
  const tracker = createStudyTracker();
  tracker.startStudying("2026-03-12", "09:00", "Math");

  assert.throws(
    () => tracker.startStudying("2026-03-12", "10:00", "Science"),
    /already in progress/i,
    "Expected error when starting a new session while one is in progress"
  );
});

// --- endStudying() behavior tests ---

runTest("endStudying allows a new session to be started (clears current session)", () => {
  const tracker = createStudyTracker();

  tracker.startStudying("2026-03-12", "09:00", "Math");
  tracker.endStudying("2026-03-12", "10:00");

  assert.doesNotThrow(() => {
    tracker.startStudying("2026-03-12", "11:00", "Science");
  }, "Should be able to start a new session after endStudying");
});

runTest("endStudying throws if there is no active session", () => {
  const tracker = createStudyTracker();

  assert.throws(
    () => tracker.endStudying("2026-03-12", "10:00"),
    /No study session is currently in progress/i,
    "Expected error when calling endStudying without an active session"
  );
});

runTest("endStudying throws if date or time is missing", () => {
  const tracker = createStudyTracker();
  tracker.startStudying("2026-03-12", "09:00", "Math");

  assert.throws(
    () => tracker.endStudying(null, "10:00"),
    /requires both date and time/i,
    "Expected error when date is missing"
  );

  assert.throws(
    () => tracker.endStudying("2026-03-12", null),
    /requires both date and time/i,
    "Expected error when time is missing"
  );
});

// --- getStats() behavior tests ---

runTest("getStats returns zeroed stats when there are no sessions", () => {
  const tracker = createStudyTracker();

  const stats = tracker.getStats();

  assert.deepStrictEqual(stats.subjects, {}, "Expected no subjects when there are no sessions");
  assert.strictEqual(stats.overall.totalMilliseconds, 0);
  assert.strictEqual(stats.overall.totalMinutes, 0);
  assert.strictEqual(stats.overall.totalHours, 0);
  assert.strictEqual(stats.overall.totalDays, 0);
  assert.strictEqual(stats.overall.sessionCount, 0);
});

runTest("getStats aggregates a single completed session correctly", () => {
  const tracker = createStudyTracker();

  tracker.startStudying("2026-03-12", "09:00", "Math");
  tracker.endStudying("2026-03-12", "10:00"); // 1 hour

  const stats = tracker.getStats();

  const math = stats.subjects.Math;
  assert.ok(math, "Expected stats for Math subject");

  // 1 hour = 60 minutes; allow a tiny floating point tolerance
  assert.ok(Math.abs(math.totalHours - 1) < 1e-9, "Expected 1 totalHours for Math");
  assert.ok(Math.abs(math.totalMinutes - 60) < 1e-6, "Expected 60 totalMinutes for Math");
  assert.strictEqual(math.sessionCount, 1);

  // Overall should match the single session
  assert.ok(Math.abs(stats.overall.totalHours - 1) < 1e-9, "Expected 1 overall totalHours");
  assert.ok(Math.abs(stats.overall.totalMinutes - 60) < 1e-6, "Expected 60 overall totalMinutes");
  assert.strictEqual(stats.overall.sessionCount, 1);
});

runTest("getStats aggregates multiple sessions across multiple subjects", () => {
  const tracker = createStudyTracker();

  // Math: 1 hour + 30 minutes = 1.5 hours
  tracker.startStudying("2026-03-12", "09:00", "Math");
  tracker.endStudying("2026-03-12", "10:00"); // 1 hour

  tracker.startStudying("2026-03-13", "09:00", "Math");
  tracker.endStudying("2026-03-13", "09:30"); // 0.5 hour

  // Science: 2 hours
  tracker.startStudying("2026-03-12", "14:00", "Science");
  tracker.endStudying("2026-03-12", "16:00"); // 2 hours

  const stats = tracker.getStats();

  const math = stats.subjects.Math;
  const science = stats.subjects.Science;

  assert.ok(math, "Expected Math stats");
  assert.ok(science, "Expected Science stats");

  // Math: 1.5h = 90 minutes
  assert.ok(Math.abs(math.totalHours - 1.5) < 1e-9, "Expected 1.5 totalHours for Math");
  assert.ok(Math.abs(math.totalMinutes - 90) < 1e-6, "Expected 90 totalMinutes for Math");
  assert.strictEqual(math.sessionCount, 2);

  // Science: 2h = 120 minutes
  assert.ok(Math.abs(science.totalHours - 2) < 1e-9, "Expected 2 totalHours for Science");
  assert.ok(Math.abs(science.totalMinutes - 120) < 1e-6, "Expected 120 totalMinutes for Science");
  assert.strictEqual(science.sessionCount, 1);

  // Overall: 1.5 + 2 = 3.5 hours, 210 minutes, 3 sessions
  assert.ok(Math.abs(stats.overall.totalHours - 3.5) < 1e-9, "Expected 3.5 overall totalHours");
  assert.ok(Math.abs(stats.overall.totalMinutes - 210) < 1e-6, "Expected 210 overall totalMinutes");
  assert.strictEqual(stats.overall.sessionCount, 3);
});

// --- reset() behavior tests ---

runTest("reset clears all stats and sessions", () => {
  const tracker = createStudyTracker();

  // Create a couple of sessions
  tracker.startStudying("2026-03-12", "09:00", "Math");
  tracker.endStudying("2026-03-12", "10:00");

  tracker.startStudying("2026-03-12", "11:00", "Science");
  tracker.endStudying("2026-03-12", "12:00");

  // Sanity check: stats are non-empty before reset
  const preResetStats = tracker.getStats();
  assert.ok(Object.keys(preResetStats.subjects).length > 0, "Precondition: should have some subjects before reset");
  assert.ok(preResetStats.overall.totalMilliseconds > 0, "Precondition: overall time should be > 0 before reset");

  // Call reset
  tracker.reset();

  // After reset, getStats should return the same default empty value as when new
  const postResetStats = tracker.getStats();
  assert.deepStrictEqual(postResetStats.subjects, {}, "Expected no subjects after reset");
  assert.strictEqual(postResetStats.overall.totalMilliseconds, 0);
  assert.strictEqual(postResetStats.overall.totalMinutes, 0);
  assert.strictEqual(postResetStats.overall.totalHours, 0);
  assert.strictEqual(postResetStats.overall.totalDays, 0);
  assert.strictEqual(postResetStats.overall.sessionCount, 0);
});

runTest("reset clears any ongoing session so endStudying cannot be called", () => {
  const tracker = createStudyTracker();

  tracker.startStudying("2026-03-12", "09:00", "Math");
  tracker.reset();

  assert.throws(
    () => tracker.endStudying("2026-03-12", "10:00"),
    /No study session is currently in progress/i,
    "Expected endStudying to fail after reset since there should be no active session"
  );
});

// --- Edge case interaction tests for startStudying() and endStudying() ---

runTest("endStudying throws if end time is before start time", () => {
  const tracker = createStudyTracker();

  tracker.startStudying("2026-03-12", "10:00", "Math");

  assert.throws(
    () => tracker.endStudying("2026-03-12", "09:00"),
    /End time cannot be before start time/i,
    "Expected error when end time is before start time"
  );
});

runTest("getStats ignores an ongoing (not yet ended) session", () => {
  const tracker = createStudyTracker();

  // Completed session
  tracker.startStudying("2026-03-12", "09:00", "Math");
  tracker.endStudying("2026-03-12", "10:00"); // 1 hour

  // Ongoing session that is never ended
  tracker.startStudying("2026-03-12", "11:00", "Science");

  const stats = tracker.getStats();

  // Only the completed Math session should be counted
  const math = stats.subjects.Math;
  const science = stats.subjects.Science;

  assert.ok(math, "Expected Math stats to be present");
  assert.ok(!science, "Expected no Science stats for ongoing session");

  assert.ok(Math.abs(math.totalHours - 1) < 1e-9, "Expected 1 totalHours for Math");
  assert.strictEqual(math.sessionCount, 1);
  assert.ok(Math.abs(stats.overall.totalHours - 1) < 1e-9, "Expected 1 overall totalHours");
  assert.strictEqual(stats.overall.sessionCount, 1);
});

runTest("startStudying and endStudying throw on clearly invalid date/time formats", () => {
  const tracker = createStudyTracker();

  // Invalid start date/time
  assert.throws(
    () => tracker.startStudying("not-a-date", "09:00", "Math"),
    /Invalid date\/time/i,
    "Expected startStudying to fail on invalid date"
  );

  // Start a valid session so we can test invalid end date/time
  tracker.startStudying("2026-03-12", "09:00", "Math");

  assert.throws(
    () => tracker.endStudying("also-not-a-date", "10:00"),
    /Invalid date\/time/i,
    "Expected endStudying to fail on invalid date"
  );
});

// --- Additional behavior tests: subjects, multi-day sessions, and multiple resets ---

runTest("subjects are case-sensitive and treated as distinct keys", () => {
  const tracker = createStudyTracker();

  tracker.startStudying("2026-03-12", "09:00", "Math");
  tracker.endStudying("2026-03-12", "10:00"); // 1 hour

  tracker.startStudying("2026-03-12", "11:00", "math");
  tracker.endStudying("2026-03-12", "12:00"); // 1 hour

  const stats = tracker.getStats();

  const upper = stats.subjects.Math;
  const lower = stats.subjects.math;

  assert.ok(upper, "Expected stats for 'Math'");
  assert.ok(lower, "Expected stats for 'math'");
  assert.notStrictEqual(upper, lower, "Expected 'Math' and 'math' to be distinct subjects");

  assert.ok(Math.abs(upper.totalHours - 1) < 1e-9);
  assert.ok(Math.abs(lower.totalHours - 1) < 1e-9);
});

runTest("empty-string subject is allowed and tracked (if used)", () => {
  const tracker = createStudyTracker();

  tracker.startStudying("2026-03-12", "09:00", "");
  tracker.endStudying("2026-03-12", "10:00");

  const stats = tracker.getStats();

  const emptySubjectStats = stats.subjects[""];
  assert.ok(emptySubjectStats, "Expected stats entry for empty-string subject");
  assert.ok(Math.abs(emptySubjectStats.totalHours - 1) < 1e-9);
  assert.strictEqual(emptySubjectStats.sessionCount, 1);
});

runTest("multi-day session spanning midnight is counted by total duration", () => {
  const tracker = createStudyTracker();

  // From 2026-03-12 23:00 to 2026-03-13 01:00 = 2 hours
  tracker.startStudying("2026-03-12", "23:00", "Night Study");
  tracker.endStudying("2026-03-13", "01:00");

  const stats = tracker.getStats();
  const night = stats.subjects["Night Study"];

  assert.ok(night, "Expected stats for 'Night Study'");
  assert.ok(Math.abs(night.totalHours - 2) < 1e-9, "Expected 2 hours across midnight");
  assert.strictEqual(night.sessionCount, 1);

  assert.ok(Math.abs(stats.overall.totalHours - 2) < 1e-9, "Expected 2 overall hours across midnight");
  assert.strictEqual(stats.overall.sessionCount, 1);
});

runTest("multiple reset calls are safe and idempotent", () => {
  const tracker = createStudyTracker();

  // First, create some data and reset
  tracker.startStudying("2026-03-12", "09:00", "Math");
  tracker.endStudying("2026-03-12", "10:00");
  tracker.reset();

  // Call reset again with no active session or past data
  assert.doesNotThrow(() => tracker.reset(), "Calling reset multiple times should not throw");

  const stats = tracker.getStats();
  assert.deepStrictEqual(stats.subjects, {}, "Expected no subjects after multiple resets");
  assert.strictEqual(stats.overall.totalMilliseconds, 0);
  assert.strictEqual(stats.overall.sessionCount, 0);
});




