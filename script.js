
class Exercise {
  #name;
  constructor(name) { this.name = name; }
  get name() { return this.#name; }
  set name(value) {
    const clean = String(value || "").trim();
    if (clean.length === 0) throw new Error("Please enter an exercise name.");
    this.#name = clean;
  }
  calculate() { return 0; }       
  describe() { return ""; }
  toData() { return { name: this.name }; }
}

class Strength extends Exercise {
  #sets; #reps; #weight;
  constructor(name, sets, reps, weight) {
    super(name);
    this.sets = sets; this.reps = reps; this.weight = weight;
  }
  get sets() { return this.#sets; }
  set sets(v) {
    v = Number(v);
    if (!Number.isInteger(v) || v <= 0) throw new Error("Sets must be a whole number above 0.");
    this.#sets = v;
  }
  get reps() { return this.#reps; }
  set reps(v) {
    v = Number(v);
    if (!Number.isInteger(v) || v <= 0) throw new Error("Reps must be a whole number above 0.");
    this.#reps = v;
  }
  get weight() { return this.#weight; }
  set weight(v) {
    if (v === "" || v === null) throw new Error("Please enter the weight.");
    v = Number(v);
    if (isNaN(v) || v < 0) throw new Error("Weight cannot be negative.");
    this.#weight = v;
  }
  calculate() { return this.sets * this.reps * this.weight; }
  describe() { return this.sets + " × " + this.reps + " @ " + this.weight + " kg"; }
  toData() { return { type: "strength", name: this.name, sets: this.sets, reps: this.reps, weight: this.weight }; }
}

class Cardio extends Exercise {
  #minutes; #distance;
  constructor(name, minutes, distance) {
    super(name);
    this.minutes = minutes; this.distance = distance;
  }
  get minutes() { return this.#minutes; }
  set minutes(v) {
    v = Number(v);
    if (isNaN(v) || v <= 0) throw new Error("Minutes must be above 0.");
    this.#minutes = v;
  }
  get distance() { return this.#distance; }
  set distance(v) {
    v = v === "" || v === null ? 0 : Number(v);
    if (isNaN(v) || v < 0) throw new Error("Distance cannot be negative.");
    this.#distance = v;
  }
  calculate() { return this.minutes; }
  describe() { return this.minutes + " min" + (this.distance ? ", " + this.distance + " km" : ""); }
  toData() { return { type: "cardio", name: this.name, minutes: this.minutes, distance: this.distance }; }
}

class Workout {
  constructor(date) {
    if (!date) throw new Error("Please choose a date.");
    this.date = date;
    this.exercises = [];
  }
  add(exercise) { this.exercises.push(exercise); }

  totalVolume() {
    return this.exercises.filter(e => e instanceof Strength).reduce((sum, e) => sum + e.calculate(), 0);
  }
  cardioMinutes() {
    return this.exercises.filter(e => e instanceof Cardio).reduce((sum, e) => sum + e.calculate(), 0);
  }
  toData() { return { date: this.date, exercises: this.exercises.map(e => e.toData()) }; }
  static fromData(d) {
    const w = new Workout(d.date);
    d.exercises.forEach(e => {
      w.add(e.type === "cardio" ? new Cardio(e.name, e.minutes, e.distance) : new Strength(e.name, e.sets, e.reps, e.weight));
    });
    return w;
  }
}

class Tracker {
  constructor() { this.workouts = []; this.load(); }
  save() {
    try { localStorage.setItem("triosphere-workouts", JSON.stringify(this.workouts.map(w => w.toData()))); }
    catch (e) { }
  }
  load() {
    try {
      const raw = localStorage.getItem("triosphere-workouts");
      if (raw) this.workouts = JSON.parse(raw).map(Workout.fromData);
    } catch (e) { this.workouts = []; }
  }
  addWorkout(w) { this.workouts.push(w); this.save(); }
  removeWorkout(w) { this.workouts = this.workouts.filter(x => x !== w); this.save(); }
  sorted() { return [...this.workouts].sort((a, b) => b.date.localeCompare(a.date)); }
  totalVolume() { return this.workouts.reduce((s, w) => s + w.totalVolume(), 0); }
  heaviestLift() {
    let best = null;
    this.workouts.forEach(w => w.exercises.forEach(e => {
      if (e instanceof Strength && (!best || e.weight > best.ex.weight)) best = { ex: e, date: w.date };
    }));
    return best;
  }
  bestVolumeWorkout() {
    let best = null;
    this.workouts.forEach(w => { if (w.totalVolume() > 0 && (!best || w.totalVolume() > best.totalVolume())) best = w; });
    return best;
  }
  longestCardio() {
    let best = null;
    this.workouts.forEach(w => w.exercises.forEach(e => {
      if (e instanceof Cardio && (!best || e.minutes > best.ex.minutes)) best = { ex: e, date: w.date };
    }));
    return best;
  }
}

const tracker = new Tracker();
let draft = null;   

const $ = id => document.getElementById(id);
const fmt = n => Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function prettyDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}
function show(el, text, kind) { el.className = "msg " + kind; el.textContent = text; }
function hideMsg(el) { el.className = "msg"; el.textContent = ""; }

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b === btn));
    ["log", "history", "records"].forEach(t => $("tab-" + t).classList.toggle("hide", t !== btn.dataset.tab));
    render();
  });
});

$("type").addEventListener("change", () => {
  const strength = $("type").value === "strength";
  $("strengthFields").classList.toggle("hide", !strength);
  $("cardioFields").classList.toggle("hide", strength);
  hideMsg($("exMsg"));
});

$("addEx").addEventListener("click", () => {
  try {
    const name = $("name").value;
    const ex = $("type").value === "strength"
      ? new Strength(name, $("sets").value, $("reps").value, $("weight").value)
      : new Cardio(name, $("minutes").value, $("distance").value);
    if (!draft) draft = [];
    draft.push(ex);
    ["name", "sets", "reps", "weight", "minutes", "distance"].forEach(i => $(i).value = "");
    show($("exMsg"), "Added " + ex.name + ".", "ok");
    $("name").focus();
    renderDraft();
  } catch (err) {
    show($("exMsg"), err.message, "err");
  }
});

$("saveWk").addEventListener("click", () => {
  try {
    if (!draft || draft.length === 0) throw new Error("Add at least one exercise first.");
    const w = new Workout($("date").value);
    draft.forEach(e => w.add(e));
    tracker.addWorkout(w);
    draft = null;
    hideMsg($("exMsg"));
    show($("wkMsg"), "Workout saved. Total volume: " + fmt(w.totalVolume()) + " kg.", "ok");
    render();
  } catch (err) {
    show($("wkMsg"), err.message, "err");
  }
});

function renderDraft() {
  const box = $("draft");
  if (!draft || draft.length === 0) {
    box.innerHTML = '<div class="empty">No exercises yet. Add one on the left.</div>';
    return;
  }
  const total = draft.filter(e => e instanceof Strength).reduce((s, e) => s + e.calculate(), 0);
  box.innerHTML = draft.map((e, i) =>
    '<div class="item"><div><b>' + esc(e.name) + '</b><span class="tag">' + (e instanceof Strength ? "Strength" : "Cardio") + '</span><small>' + esc(e.describe()) + '</small></div>' +
    '<button class="btn del" data-i="' + i + '">Remove</button></div>'
  ).join("") + '<div class="item"><span>Total volume</span><b>' + fmt(total) + ' kg</b></div>';
  box.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
    draft.splice(Number(b.dataset.i), 1);
    renderDraft();
  }));
}

function renderStats() {
  const best = tracker.heaviestLift();
  $("stats").innerHTML =
    '<div class="stat"><b>' + tracker.workouts.length + '</b><span>Workouts logged</span></div>' +
    '<div class="stat"><b>' + fmt(tracker.totalVolume()) + ' kg</b><span>Total volume lifted</span></div>' +
    '<div class="stat"><b>' + (best ? fmt(best.ex.weight) + ' kg' : "–") + '</b><span>Heaviest lift</span></div>';
}

function renderHistory() {
  const q = $("search").value.trim().toLowerCase();
  const list = tracker.sorted().filter(w =>
    !q || w.date.includes(q) || prettyDate(w.date).toLowerCase().includes(q) || w.exercises.some(e => e.name.toLowerCase().includes(q)));
  if (list.length === 0) {
    $("historyList").innerHTML = '<div class="card empty">' + (tracker.workouts.length ? "No workouts match your search." : "No workouts yet. Log your first one!") + '</div>';
    return;
  }
  $("historyList").innerHTML = list.map(w => {
    const rows = w.exercises.map(e =>
      '<tr><td>' + esc(e.name) + '</td><td>' + (e instanceof Strength ? "Strength" : "Cardio") + '</td><td>' + esc(e.describe()) + '</td><td>' +
      (e instanceof Strength ? fmt(e.calculate()) + ' kg' : fmt(e.calculate()) + ' min') + '</td></tr>').join("");
    return '<div class="card wk"><div class="wkhead"><div><b>' + prettyDate(w.date) + '</b><small style="color:var(--muted)"> · ' + w.exercises.length + ' exercise(s)</small></div>' +
      '<div><span class="big">' + fmt(w.totalVolume()) + ' kg</span> <button class="btn del" data-id="' + tracker.workouts.indexOf(w) + '">Delete</button></div></div>' +
      '<div class="scroll"><table><tr><th>Exercise</th><th>Type</th><th>Details</th><th>Result</th></tr>' + rows + '</table></div></div>';
  }).join("");
  $("historyList").querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
    if (confirm("Delete this workout?")) {
      tracker.removeWorkout(tracker.workouts[Number(b.dataset.id)]);
      render();
    }
  }));
}

function renderRecords() {
  const lift = tracker.heaviestLift(), vol = tracker.bestVolumeWorkout(), run = tracker.longestCardio();
  const none = '<div class="empty">No data yet.</div>';
  $("tab-records").innerHTML =
    '<div class="card"><h2>Heaviest lift</h2>' + (lift ? '<div class="big">' + fmt(lift.ex.weight) + ' kg</div><b>' + esc(lift.ex.name) + '</b><small style="display:block;color:var(--muted)">' + prettyDate(lift.date) + '</small>' : none) + '</div>' +
    '<div class="card"><h2>Highest-volume workout</h2>' + (vol ? '<div class="big">' + fmt(vol.totalVolume()) + ' kg</div><b>' + prettyDate(vol.date) + '</b><small style="display:block;color:var(--muted)">' + vol.exercises.length + ' exercise(s)</small>' : none) + '</div>' +
    '<div class="card"><h2>Longest cardio session</h2>' + (run ? '<div class="big">' + fmt(run.ex.minutes) + ' min</div><b>' + esc(run.ex.name) + '</b><small style="display:block;color:var(--muted)">' + prettyDate(run.date) + '</small>' : none) + '</div>';
}

function render() { renderStats(); renderDraft(); renderHistory(); renderRecords(); }
$("search").addEventListener("input", renderHistory);
$("date").value = today();
render();