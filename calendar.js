/*
  File: calendar.js
  Purpose:
    - Render an accurate calendar for any month or year (month length + leap years + weekday alignment)
    - Let the user click days and attach tasks/notes to specific dates
    - Persist everything in localStorage so it stays after closing the app (this was bs btw)
    - Show an Events list for the selected date + an Upcoming list across all dates
    - Add a completed checkbox for each task line
    - I also sectioned the file 1-20 to make this easier to digest and edit later

  Update Log
   02-14-2026 - 02-15-2026:
    - began builfing the calender rendering using JavaScript Date() for correct day counts + leap years (Im so smart)
  02-17-2026:
    - Added clickable day selection and localStorage storage model for date specific events
  02-17-2026 - 02-18-2026
    - Added edit and delete, upcoming list, event dots on calendar, and completed checkboxes
*/

(function () {
  /* ------------------------------------------------------------
     1) DOM REFERENCES (this is how JavaScript interacts with page after its loaded)
     ------------------------------------------------------------
     Queries everything once up front and store references
     This keeps the rest of the code looking much cleaner and avoids repeated lookups
  */
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  const grid = document.getElementById("calendar-grid");

  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");
  const todayBtn = document.getElementById("today-btn");

  const selectedDateText = document.getElementById("selected-date-text");

  const titleInput = document.getElementById("event-title");
  const timeInput = document.getElementById("event-time");
  const notesInput = document.getElementById("event-notes");

  const addBtn = document.getElementById("add-event-btn");
  const saveBtn = document.getElementById("save-event-btn");
  const cancelBtn = document.getElementById("cancel-edit-btn");

  const eventsForDateList = document.getElementById("events-for-date");
  const upcomingList = document.getElementById("upcoming-events");

  /* ------------------------------------------------------------
     2) CONSTANTS abd LABELS
     ------------------------------------------------------------
     Month names are for UI labels. The real calendar correctness comes from Date() calculations later (quite conveneint)
  */
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  /* ------------------------------------------------------------
     3) IN MEMORY STATE (i.e what the user currently has selected)
     ------------------------------------------------------------
     selected: which date is active in the sidebar
     editing: if user is editing an existing event instead of adding a new one
  */
  let selected = null; // { year, monthIndex, day } or null
  let editing = null;  // { dateKey, id } or null

  /* ------------------------------------------------------------
     4) STORAGE MODEL (localStorage)
     ------------------------------------------------------------
     We store all events under a single storage key.
     The data is an object where each property is a date string:

       {
         "YYYY-MM-DD": [
           { id, title, time, notes, completed, createdAt }
         ]
       }

     completed: true/false drives the checkbox and styling
  */
  const STORAGE_KEY = "pda_calendar_events_v1";

  function loadAllEvents() {
    // This safely loads the entire saved object.
    // If parsing fails (in other words corrupt storage), return an empty object so the app can still run
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveAllEvents(data) {
    // Saves the full events object back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function dateKey(year, monthIndex, day) {
    // stores dates as "YYYY-MM-DD" (yes I know it's abnormal in the US but not elsewhere)
    // monthIndex is 0-11 internally, so add 1 for the string
    const mm = String(monthIndex + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  function parseDateKey(key) {
    // Converts "YYYY-MM-DD" back into usable numbers
    const [y, m, d] = key.split("-").map(Number);
    return { year: y, monthIndex: m - 1, day: d };
  }

  /* ------------------------------------------------------------
     5) DATE MATH (this is where the accuracy comes from)
     ------------------------------------------------------------
     JavaScript Date() already handles:
       - leap years (Feb 29 in the right years)
       - month lengths (28/29/30/31)
       - weekdays (Sun-Sat)
     We lean on Date() instead of doing custom leap-year math (I learned from my mistakes in my C# class)
  */
  function daysInMonth(year, monthIndex) {
    // Day 0 of next month means "the last day of the current month"
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function firstDayOfMonth(year, monthIndex) {
    // 0 = Sunday, 6 = Saturday
    return new Date(year, monthIndex, 1).getDay();
  }

  function isToday(y, m, d) {
    const t = new Date();
    return y === t.getFullYear() && m === t.getMonth() && d === t.getDate();
  }

  function formatLongDate(y, m, d) {
    return `${monthNames[m]} ${d}, ${y}`;
  }

  /* ------------------------------------------------------------
     6) DROPDOWN BUILDERS (month + year selectors)
     ------------------------------------------------------------
     generates these options dynamically instead of hardcoding in HTML
     makes it easy to adjust the year range in one place
  */
  function fillMonthDropdown() {
    monthSelect.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = monthNames[i];
      monthSelect.appendChild(opt);
    }
  }

  function fillYearDropdown(centerYear) {
    // Wide range so the user can navigate freely
    const start = centerYear - 100;
    const end = centerYear + 100;

    yearSelect.innerHTML = "";
    for (let y = start; y <= end; y++) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    }
  }

  function ensureYearRange(year) {
    // If jumping to a year outside the current dropdown options --> rebuild around it
    const first = Number(yearSelect.options[0]?.value ?? year);
    const last = Number(yearSelect.options[yearSelect.options.length - 1]?.value ?? year);

    if (year < first || year > last) {
      fillYearDropdown(year);
    }
  }

  /* ------------------------------------------------------------
     7) CALENDAR GRID RENDERING
     ------------------------------------------------------------
     Renders a stable 6x7 grid (42 cells) every. single. time (you have no idea how many times i got this wrong)
     That GAURUNTEEES alignment ( simply because some months need 5 rows while others need 6)
     Padding cells appear before day 1 and after the last day
  */
  function renderCalendar(year, monthIndex) {
    grid.innerHTML = "";

    const totalDays = daysInMonth(year, monthIndex);
    const firstDow = firstDayOfMonth(year, monthIndex);

    // Load once per render so days with events can be marked
    const allEvents = loadAllEvents();

    const CELLS = 42;
    for (let cellIndex = 0; cellIndex < CELLS; cellIndex++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      // Maps the grid position to the actual day number
      // For example --> if the month starts on Wednesday (3), then cellIndex 0-2 are padding
      const dayNumber = cellIndex - firstDow + 1;

      if (dayNumber < 1 || dayNumber > totalDays) {
        // Makes it so padding cells are not part of the current month
        cell.classList.add("muted");
        cell.innerHTML = `<span class="dayNumber"></span>`;
      } else {
        // Real day cell --> show the number
        cell.innerHTML = `<span class="dayNumber">${dayNumber}</span>`;

        // Stores the date info on the element so clicks know what was clicked
        cell.dataset.year = String(year);
        cell.dataset.month = String(monthIndex);
        cell.dataset.day = String(dayNumber);

        // Outlines today so it's obvious where we are (so fresh)
        if (isToday(year, monthIndex, dayNumber)) {
          cell.classList.add("today");
        }

        // Outlines the selected date if it matches
        if (
          selected &&
          selected.year === year &&
          selected.monthIndex === monthIndex &&
          selected.day === dayNumber
        ) {
          cell.classList.add("selected");
        }

        // Dot indicator--> if this date has at LEAST one event, show a dot
        const key = dateKey(year, monthIndex, dayNumber);
        if (allEvents[key] && allEvents[key].length > 0) {
          const dot = document.createElement("div");
          dot.className = "hasEventsDot";
          cell.appendChild(dot);
        }

        // Click handler --> selecting a day launches the sidebar content
        cell.addEventListener("click", () => {
          selectDate(year, monthIndex, dayNumber);
        });

        // Accessibility/ debug label
        cell.setAttribute("aria-label", formatLongDate(year, monthIndex, dayNumber));
      }

      grid.appendChild(cell);
    }
  }

  /* ------------------------------------------------------------
     8) SELECTING A DATE (i.e. clicking on the calendar)
     ------------------------------------------------------------
     This updates the "selected" state, resets editing mode, and refreshes the UI
  */
  function selectDate(year, monthIndex, day) {
    selected = { year, monthIndex, day };
    selectedDateText.textContent = formatLongDate(year, monthIndex, day);

    // If you click a diffeerent day while editing --> exits edit mode
    // so users don't accidentally overwrite something on the wrong day.
    exitEditMode();

    syncUI();
  }

  /* ------------------------------------------------------------
     9) EDIT MODE (reusing the same form for add vs edit)
     ------------------------------------------------------------
     Shows "Add" by default.
     When editing, hide Add and show Save/Cancel
  */
  function enterEditMode(dateKeyStr, eventId) {
    editing = { dateKey: dateKeyStr, id: eventId };
    addBtn.style.display = "none";
    saveBtn.style.display = "inline-block";
    cancelBtn.style.display = "inline-block";
  }

  function exitEditMode() {
    editing = null;
    addBtn.style.display = "inline-block";
    saveBtn.style.display = "none";
    cancelBtn.style.display = "none";

    // Clearing inputs keeps the form from “remembering” old values
    titleInput.value = "";
    timeInput.value = "";
    notesInput.value = "";
  }

  /* ------------------------------------------------------------
     10) FORM HELPERS (read and validate user input)
     ------------------------------------------------------------
     Title is required before saving (acts like the task name)
     Time and notes are optional
  */
  function getFormValues() {
    return {
      title: titleInput.value.trim(),
      time: timeInput.value.trim(),   // may be empty
      notes: notesInput.value.trim(), // may be empty
    };
  }

  function requireSelectedDate() {
    // Can't add a task without knowing what date it belongs to
    if (!selected) {
      alert("Click a day on the calendar first.");
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------
     11) CREATE EVENT (Add button)
     ------------------------------------------------------------
     Adds a new event object under the selected date key and saves to localStorage
  */
  function addEventForSelectedDate() {
    if (!requireSelectedDate()) return;

    const { title, time, notes } = getFormValues();
    if (!title) {
      alert("Please enter a title.");
      return;
    }

    const all = loadAllEvents();
    const key = dateKey(selected.year, selected.monthIndex, selected.day);

    // completed starts false by default and the checkbox toggles it later
    const newEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title,
      time,
      notes,
      completed: false,
      createdAt: Date.now(),
    };

    if (!all[key]) all[key] = [];
    all[key].push(newEvent);

    saveAllEvents(all);
    exitEditMode();
    syncUI();
  }

  /* ------------------------------------------------------------
     12) UPDATE EVENT (Save button)
     ------------------------------------------------------------
     Finds the event user is editing and replaces title/time/notes
      Does not reset completed here. Instead that stays whatever the checkbox set it to (I will admit i had to chatGPT this)
  */
  function saveEdit() {
    if (!editing) return;

    const { title, time, notes } = getFormValues();
    if (!title) {
      alert("Please enter a title.");
      return;
    }

    const all = loadAllEvents();
    const list = all[editing.dateKey] || [];
    const idx = list.findIndex((e) => e.id === editing.id);

    if (idx === -1) {
      alert("Could not find that event to edit.");
      exitEditMode();
      syncUI();
      return;
    }

    list[idx] = { ...list[idx], title, time, notes };
    all[editing.dateKey] = list;

    saveAllEvents(all);
    exitEditMode();
    syncUI();
  }

  /* ------------------------------------------------------------
     13) DELETE EVENT
     ------------------------------------------------------------
     Removes the event from the date list. If the date becoces empty,
     it delete the whole date key to keep storage nice and tidy
  */
  function deleteEvent(dateKeyStr, eventId) {
    const all = loadAllEvents();
    const list = all[dateKeyStr] || [];
    const filtered = list.filter((e) => e.id !== eventId);

    if (filtered.length === 0) {
      delete all[dateKeyStr];
    } else {
      all[dateKeyStr] = filtered;
    }

    saveAllEvents(all);

    // If the deleted event was being edited, exit edit mode so the form resets
    if (editing && editing.dateKey === dateKeyStr && editing.id === eventId) {
      exitEditMode();
    }

    syncUI();
  }

  /* ------------------------------------------------------------
     14) TOGGLE COMPLETED (the cool lil checkbox per task line)
     ------------------------------------------------------------
     This flips completed true/false and saves immediately
     Ensures the checkbox feels instant and persists across all restarts
  */
  function toggleCompleted(dateKeyStr, eventId) {
    const all = loadAllEvents();
    const list = all[dateKeyStr] || [];
    const idx = list.findIndex((e) => e.id === eventId);
    if (idx === -1) return;

    list[idx] = { ...list[idx], completed: !list[idx].completed };
    all[dateKeyStr] = list;

    saveAllEvents(all);
    syncUI();
  }

  /* ------------------------------------------------------------
     15) START EDITING (Edit button)
     ------------------------------------------------------------
     Loads the chosen event into the form inputs and switches to edit mode
  */
  function startEdit(dateKeyStr, eventId) {
    const all = loadAllEvents();
    const list = all[dateKeyStr] || [];
    const eventObj = list.find((e) => e.id === eventId);
    if (!eventObj) return;

    titleInput.value = eventObj.title || "";
    timeInput.value = eventObj.time || "";
    notesInput.value = eventObj.notes || "";

    enterEditMode(dateKeyStr, eventId);
  }

  /* ------------------------------------------------------------
     16) RENDER EVENTS FOR SELECTED DATE
     ------------------------------------------------------------
     This is the list under “For selected date”
     Also does a friendly sort:
       - Incomplete items first
       - Then by time (This wai it kinda reads like a schedule)
  */
  function renderEventsForSelectedDate() {
    eventsForDateList.innerHTML = "";
    if (!selected) return;

    const all = loadAllEvents();
    const key = dateKey(selected.year, selected.monthIndex, selected.day);
    const events = (all[key] || []).slice();

    // Sort: incomplete first, then time
    events.sort((a, b) => {
      const ac = a.completed ? 1 : 0;
      const bc = b.completed ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return (a.time || "").localeCompare(b.time || "");
    });

    for (const ev of events) {
      const li = document.createElement("li");
      li.className = "eventItem";

      // Title row holds: checkbox + title + time
      const titleRow = document.createElement("div");
      titleRow.className = "eventItemTitleRow";

      // Checkbox--> one per task line
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!ev.completed;

      // Clicking the checkbox toggles completed and saves
      // stopPropagation prevents the click from triggering other parent click handlers
      checkbox.addEventListener("click", (e) => e.stopPropagation());
      checkbox.addEventListener("change", () => toggleCompleted(key, ev.id));

      const titleEl = document.createElement("p");
      titleEl.className = "eventItemTitle";
      titleEl.textContent = ev.title;

      // Visual cue when completed: text becomes faded and gets a line through it
      if (ev.completed) {
        titleEl.style.textDecoration = "line-through";
        titleEl.style.opacity = "0.6";
      }

      const timeEl = document.createElement("span");
      timeEl.className = "eventItemTime";
      timeEl.textContent = ev.time ? ev.time : "";

      // Groups checkbox + title together so they read as one task line
      const leftGroup = document.createElement("div");
      leftGroup.style.display = "flex";
      leftGroup.style.alignItems = "center";
      leftGroup.style.gap = "10px";
      leftGroup.appendChild(checkbox);
      leftGroup.appendChild(titleEl);

      titleRow.appendChild(leftGroup);
      titleRow.appendChild(timeEl);

      // Notes are optional, and if empty I had to still render an empty string to avoid "undefined"
      const notesEl = document.createElement("p");
      notesEl.className = "eventItemNotes";
      notesEl.textContent = ev.notes ? ev.notes : "";

      if (ev.completed) {
        notesEl.style.opacity = "0.6";
      }

      // Buttons: edit/delete
      const btnRow = document.createElement("div");
      btnRow.className = "eventItemBtns";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => startEdit(key, ev.id));

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteEvent(key, ev.id));

      btnRow.appendChild(editBtn);
      btnRow.appendChild(delBtn);

      // Assembles the card
      li.appendChild(titleRow);
      li.appendChild(notesEl);
      li.appendChild(btnRow);

      eventsForDateList.appendChild(li);
    }
  }

  /* ------------------------------------------------------------
     17) RENDER UPCOMING EVENTS (global view)
     ------------------------------------------------------------
     This list helps user see whats coming up without clicking every date
     It gathers all events and converts them into real Date objects, sorts, then displays the next N
  */
  function renderUpcoming(limit = 10) {
    upcomingList.innerHTML = "";

    const all = loadAllEvents();
    const now = new Date();
    const flattened = [];

    for (const key of Object.keys(all)) {
      for (const ev of all[key]) {
        const { year, monthIndex, day } = parseDateKey(key);

        // if time is missing, treats it as 00:00 so sorting is consistent
        const [hh, mm] = (ev.time || "00:00").split(":").map(Number);
        const when = new Date(year, monthIndex, day, hh, mm);

        flattened.push({
          key,
          id: ev.id,
          title: ev.title,
          time: ev.time || "",
          notes: ev.notes || "",
          completed: !!ev.completed,
          when,
        });
      }
    }

    // Soonest first
    flattened.sort((a, b) => a.when - b.when);

    // Only future items, filters out completed by default to avoid confusion with uncmpleted tasks
    const future = flattened
      .filter((e) => e.when >= now && !e.completed)
      .slice(0, limit);

    for (const ev of future) {
      const li = document.createElement("li");
      li.className = "eventItem";

      const titleRow = document.createElement("div");
      titleRow.className = "eventItemTitleRow";

      const titleEl = document.createElement("p");
      titleEl.className = "eventItemTitle";
      titleEl.textContent = ev.title;

      const timeEl = document.createElement("span");
      timeEl.className = "eventItemTime";

      const d = ev.when;
      const stamp = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}${
        ev.time ? ` • ${ev.time}` : ""
      }`;
      timeEl.textContent = stamp;

      titleRow.appendChild(titleEl);
      titleRow.appendChild(timeEl);

      const notesEl = document.createElement("p");
      notesEl.className = "eventItemNotes";
      notesEl.textContent = ev.notes;

      li.appendChild(titleRow);
      li.appendChild(notesEl);

      // Clicking an upcoming item jumps you to its date and selects it
      li.addEventListener("click", () => {
        const { year, monthIndex, day } = parseDateKey(ev.key);
        ensureYearRange(year);
        yearSelect.value = String(year);
        monthSelect.value = String(monthIndex);

        // Renders the month first, then selects the date so the highlight appears
        renderCalendar(year, monthIndex);
        selectDate(year, monthIndex, day);
      });

      upcomingList.appendChild(li);
    }

    // Friendly empty state
    if (future.length === 0) {
      const empty = document.createElement("li");
      empty.className = "eventItem";
      empty.textContent = "No upcoming incomplete events yet.";
      upcomingList.appendChild(empty);
    }
  }

  /* ------------------------------------------------------------
     18) SYNC UI (one refresh function --> keeps everything consistent)
     ------------------------------------------------------------
     Any time something changes ( like month navigation, add+dit+delete, or checkbox toggle)
    syncUI() is called so: that
       - the calendar dots update
       - the selected date list updates
       - the upcoming list updates
       - the selected outline stays correct
  */
  function syncUI() {
    const y = Number(yearSelect.value);
    const m = Number(monthSelect.value);

    renderCalendar(y, m);
    renderEventsForSelectedDate();
    renderUpcoming(10);
  }

  /* ------------------------------------------------------------
     19) NAVIGATION CONTROLS (prev/next month and “Today”)
     -----------------------------------------------------------
     Prev/Next changes the monthIndex and rolls the year if we go past Jan/Dec
     Today jumps to the actual current date and selects it
  */
  function setToToday() {
    const t = new Date();
    const y = t.getFullYear();
    const m = t.getMonth();

    ensureYearRange(y);
    yearSelect.value = String(y);
    monthSelect.value = String(m);

    // Selecting "today" updates the sidebar and the selected outline
    selectDate(y, m, t.getDate());
    syncUI();
  }

  function changeMonth(delta) {
    let y = Number(yearSelect.value);
    let m = Number(monthSelect.value);

    m += delta;

    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }

    ensureYearRange(y);
    yearSelect.value = String(y);
    monthSelect.value = String(m);

    // Doesn't auto select a day when switching months, rather allows user to click what they want
    exitEditMode();
    syncUI();
  }

  /* ------------------------------------------------------------
     20) EVENT WIRING (making the UI actually interactive)
     ------------------------------------------------------------
     This is the “entry point”, which runs once after the page loads.
     Builds dropdowns, sets defaults, attaches button listeners
  */
  document.addEventListener("DOMContentLoaded", () => {
    // Part 1: builds the dropdown option lists
    fillMonthDropdown();
    fillYearDropdown(new Date().getFullYear());

    // Part 2: default view is today (also selects today)
    setToToday();

    // Part 3: dropdown changes rerender the calendar
    monthSelect.addEventListener("change", () => {
      exitEditMode();
      syncUI();
    });

    yearSelect.addEventListener("change", () => {
      exitEditMode();
      syncUI();
    });

    // Part 4: month navigation buttons
    prevBtn.addEventListener("click", () => changeMonth(-1));
    nextBtn.addEventListener("click", () => changeMonth(1));
    todayBtn.addEventListener("click", setToToday);

    // Part 5: event form buttons
    addBtn.addEventListener("click", addEventForSelectedDate);
    saveBtn.addEventListener("click", saveEdit);
    cancelBtn.addEventListener("click", exitEditMode);
  });
})();               //THANK YOU GOD this was rough
