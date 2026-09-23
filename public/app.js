const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const MOON_ICON = '<svg class="status-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#93876e" stroke-width="1.6"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
  const SUN_ICON = '<svg class="status-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d9bd7c" stroke-width="1.6"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"/></svg>';

  let me = null;
  let permissions = [];
  let canViewAllHours = false;
  let canManageClockins = false;
  let canDoReports = false;
  let canEditMotd = false;
  let entries = [];
  let personnel = [];
  let militiaLevel = null;
  let currentWeekKey = null;
  let viewingWeekKey = null;
  let hoursTimer = null;
  let clockPollTimer = null;
  let reports = [];
  let showArchived = false;
  let detailReportId = null;
  let editingReportId = null;
  let editingNoteId = null;

  const whoami = document.getElementById("whoami");
  const clockBtn = document.getElementById("clock-btn");
  const rows = document.getElementById("clock-rows");
  const emptyNote = document.getElementById("clock-empty");
  const personnelList = document.getElementById("personnel-list");
  const personnelEmpty = document.getElementById("personnel-empty");
  const hoursRows = document.getElementById("hours-rows");
  const weekLabel = document.getElementById("week-label");
  const weekPrev = document.getElementById("week-prev");
  const weekNext = document.getElementById("week-next");
  const hoursScope = document.getElementById("hours-scope");
  const maintenanceSection = document.getElementById("maintenance-section");
  const recalcBtn = document.getElementById("recalc-btn");
  const recalcNote = document.getElementById("recalc-note");
  const reportsNavBtn = document.getElementById("reports-nav-btn");
  const homeHeading = document.getElementById("home-heading");
  const motdEditBtn = document.getElementById("motd-edit-btn");
  const motdMeta = document.getElementById("motd-meta");
  const motdOverlay = document.getElementById("motd-overlay");
  const motdInput = document.getElementById("motd-input");
  const motdError = document.getElementById("motd-error");
  const motdSaveBtn = document.getElementById("motd-save");
  const reportList = document.getElementById("report-list");
  const reportListEmpty = document.getElementById("report-list-empty");
  const showArchivedToggle = document.getElementById("show-archived-toggle");
  const newReportBtn = document.getElementById("new-report-btn");
  const reportFormOverlay = document.getElementById("report-form-overlay");
  const reportFormTitle = document.getElementById("report-form-title");
  const reportForm = document.getElementById("report-form");
  const reportFormError = document.getElementById("report-form-error");
  const reportFormSubmit = document.getElementById("report-form-submit");
  const rfTitle = document.getElementById("rf-title");
  const rfType = document.getElementById("rf-type");
  const rfTypeOtherRow = document.getElementById("rf-type-other-row");
  const rfTypeOther = document.getElementById("rf-type-other");
  const rfDate = document.getElementById("rf-date");
  const rfLocation = document.getElementById("rf-location");
  const rfSector = document.getElementById("rf-sector");
  const rfVictim = document.getElementById("rf-victim");
  const rfPerpetrator = document.getElementById("rf-perpetrator");
  const rfDescription = document.getElementById("rf-description");
  const rfActions = document.getElementById("rf-actions");
  const detailOverlay = document.getElementById("detail-overlay");
  const detailTitle = document.getElementById("detail-title");
  const detailEditedNote = document.getElementById("detail-edited-note");
  const detailBody = document.getElementById("detail-body");
  const detailArchivedBadge = document.getElementById("detail-archived-badge");
  const detailArchiveBtn = document.getElementById("detail-archive-btn");
  const detailEditBtn = document.getElementById("detail-edit-btn");
  const noteList = document.getElementById("note-list");
  const noNotes = document.getElementById("no-notes");
  const noteInput = document.getElementById("note-input");
  const addNoteBtn = document.getElementById("add-note-btn");

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("view-" + btn.dataset.view).classList.add("active");
      if (btn.dataset.view === "hours") {
        loadHours(viewingWeekKey);
        scheduleHoursPoll();
      } else {
        stopHoursPoll();
      }
      if (btn.dataset.view === "reports") {
        loadReports();
      }
      if (btn.dataset.view === "patrols") {
        loadPatrolRoster();
        schedulePatrolPoll();
      } else {
        stopPatrolPoll();
      }
    });
  });

  fetch("/api/me")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      me = data.user;
      permissions = data.permissions || [];
      canViewAllHours = permissions.includes("viewAllHours");
      canManageClockins = permissions.includes("manageClockins");
      canDoReports = permissions.includes("canDoReports");
      canEditMotd = Boolean(data.canEditMotd);
      whoami.innerHTML = "Signed in as <strong>" + escapeHtml(me) + "</strong>" +
        "<span class=\"tag\">" + escapeHtml(data.rankLabel) + "</span>";
      maintenanceSection.hidden = !canManageClockins;
      reportsNavBtn.hidden = !canDoReports;
      motdEditBtn.hidden = !canEditMotd;
      renderClock();
    })
    .catch(() => { location.assign("/login.html"); });

  loadMotd();

  function loadMotd() {
    return fetch("/api/motd")
      .then((r) => (r.ok ? r.json() : { text: "", updatedBy: null, updatedAt: null }))
      .then((data) => {
        const hasCustom = Boolean(data.text && data.text.trim());
        homeHeading.textContent = hasCustom ? data.text : "Evening watch.";
        if (hasCustom && data.updatedBy) {
          motdMeta.hidden = false;
          motdMeta.textContent = "Set by " + data.updatedBy +
            (data.updatedAt ? " \u00b7 " + new Date(data.updatedAt).toLocaleString() : "");
        } else {
          motdMeta.hidden = true;
        }
      })
      .catch(() => {});
  }

  motdEditBtn.addEventListener("click", () => {
    motdError.textContent = "";
    motdInput.value = homeHeading.textContent === "Evening watch." ? "" : homeHeading.textContent;
    motdOverlay.hidden = false;
    motdInput.focus();
  });

  function closeMotdModal() {
    motdOverlay.hidden = true;
  }
  document.getElementById("motd-close").addEventListener("click", closeMotdModal);
  document.getElementById("motd-cancel").addEventListener("click", closeMotdModal);
  motdOverlay.addEventListener("click", (e) => {
    if (e.target === motdOverlay) closeMotdModal();
  });

  motdSaveBtn.addEventListener("click", async () => {
    motdError.textContent = "";
    motdSaveBtn.disabled = true;
    try {
      const response = await fetch("/api/motd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: motdInput.value.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        closeMotdModal();
        loadMotd();
      } else {
        motdError.textContent = data.error || "Couldn't save the message.";
      }
    } catch {
      motdError.textContent = "Couldn't reach the server.";
    }
    motdSaveBtn.disabled = false;
  });

  loadPersonnel();

  function loadPersonnel() {
    return fetch("/api/personnel")
      .then((r) => (r.ok ? r.json() : { people: [] }))
      .then((data) => {
        personnel = data.people || [];
        militiaLevel = typeof data.militiaLevel === "number" ? data.militiaLevel : null;
        renderPersonnel();
      })
      .catch(() => {});
  }

  document.getElementById("signout").addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    location.assign("/login.html");
  });

  recalcBtn.addEventListener("click", async () => {
    if (!confirm("Recalculate all-time totals from every stored week of history? This rebuilds the numbers everyone sees on Home.")) return;
    recalcBtn.disabled = true;
    recalcNote.textContent = "Working\u2026";
    try {
      const response = await fetch("/api/hours/recalculate-alltime", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        recalcNote.textContent = "Done \u2014 recalculated from " + data.weeksProcessed + " stored week(s).";
        loadPersonnel();
      } else {
        recalcNote.textContent = data.error || "Something went wrong.";
      }
    } catch {
      recalcNote.textContent = "Couldn't reach the server.";
    }
    recalcBtn.disabled = false;
  });

  clockBtn.addEventListener("click", async () => {
    clockBtn.disabled = true;
    try {
      const response = await fetch("/api/clock", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        entries = data.entries;
        renderClock();
        loadPersonnel();
        loadPatrolRoster();
      }
    } catch {}
    clockBtn.disabled = false;
  });

  async function forceClockOut(name) {
    if (!confirm("Clock out " + name + "? Their current session won't be added to today's hours.")) return;
    try {
      const response = await fetch("/api/clock/force-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      if (response.ok) { entries = data.entries; renderClock(); loadPatrolRoster(); }
      else alert(data.error || "Couldn't clock them out.");
    } catch {
      alert("Couldn't reach the server.");
    }
  }

  async function refreshClock() {
    try {
      const response = await fetch("/api/clockins");
      if (response.ok) {
        const data = await response.json();
        entries = data.entries;
        renderClock();
      }
    } catch {}
    scheduleClockPoll();
  }

  function scheduleClockPoll() {
    clearTimeout(clockPollTimer);
    const delay = entries.length > 0 ? 5000 : 30000;
    clockPollTimer = setTimeout(refreshClock, delay);
  }

  function renderClock() {
    const mine = entries.find((e) => e.name === me);
    clockBtn.disabled = false;
    clockBtn.textContent = mine ? "Clock out" : "Clock in";
    clockBtn.classList.toggle("on", Boolean(mine));

    renderDutyTable();
    renderPersonnel();
  }

  function renderDutyTable() {
    rows.innerHTML = "";
    if (entries.length === 0) {
      emptyNote.hidden = false;
      return;
    }
    emptyNote.hidden = true;
    for (const entry of entries) {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.innerHTML = escapeHtml(entry.name) + "<span class=\"tag\">" + escapeHtml(entry.rankLabel) + "</span>";

      const timeTd = document.createElement("td");
      timeTd.className = "elapsed";
      timeTd.dataset.since = entry.since;
      timeTd.textContent = formatElapsed(Date.now() - entry.since);

      const actionTd = document.createElement("td");
      actionTd.className = "force-out";
      if (canManageClockins) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "force-btn";
        btn.textContent = "\u00d7";
        btn.title = "Force clock out " + entry.name;
        btn.setAttribute("aria-label", "Force clock out " + entry.name);
        btn.addEventListener("click", () => forceClockOut(entry.name));
        actionTd.appendChild(btn);
      }

      tr.append(nameTd, timeTd, actionTd);
      rows.appendChild(tr);
    }
  }

  function makeDividerLi(label) {
    const li = document.createElement("li");
    li.className = "personnel-divider";
    const leadingLine = document.createElement("span");
    leadingLine.className = "divider-line leading";
    const diamondLeft = document.createElement("span");
    diamondLeft.className = "diamond";
    const labelEl = document.createElement("span");
    labelEl.className = "divider-label";
    labelEl.textContent = label;
    const diamondRight = document.createElement("span");
    diamondRight.className = "diamond";
    const trailingLine = document.createElement("span");
    trailingLine.className = "divider-line";
    li.append(leadingLine, diamondLeft, labelEl, diamondRight, trailingLine);
    return li;
  }

  function buildPersonRow(person, onDuty) {
    const active = onDuty.get(person.name);

    const li = document.createElement("li");

    const who = document.createElement("span");
    who.className = "who";
    const light = document.createElement("span");
    light.className = "status-light" + (active ? " on" : "");
    who.appendChild(light);
    who.appendChild(document.createTextNode(person.name));
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = person.rankLabel;
    who.appendChild(tag);
    li.appendChild(who);

    const right = document.createElement("span");
    right.className = "right";

    const topLine = document.createElement("span");
    topLine.className = "top-line";
    if (active) {
      topLine.innerHTML += SUN_ICON;
      const since = document.createElement("span");
      since.className = "since elapsed";
      since.dataset.since = active.since;
      since.textContent = formatElapsed(Date.now() - active.since);
      topLine.appendChild(since);
    } else {
      topLine.innerHTML += MOON_ICON;
      const off = document.createElement("span");
      off.className = "off-note";
      off.textContent = "Off duty";
      topLine.appendChild(off);
    }
    const alltime = document.createElement("span");
    alltime.className = "alltime";
    alltime.textContent = formatHours(person.allTimeHours || 0) + " all-time";
    topLine.appendChild(alltime);
    right.appendChild(topLine);

    const memberLine = document.createElement("span");
    memberLine.className = "member-since";
    memberLine.textContent = "Member since: " + formatMemberDays(person.memberDays);
    right.appendChild(memberLine);

    li.appendChild(right);
    return li;
  }

  function renderPersonnel() {
    if (!personnel.length) {
      personnelEmpty.hidden = false;
      return;
    }
    personnelEmpty.hidden = true;

    const onDuty = new Map(entries.map((e) => [e.name, e]));

    personnelList.innerHTML = "";

    // "Court" heads the main roster; "Militia" marks the boundary where
    // rank-and-file begins, positioned by militiaLevel (from the server,
    // driven by RANKS.militia.level) rather than a hardcoded number, so
    // it stays correct if ranks are ever renumbered. Game Master is
    // pulled out of the level-sorted roster entirely and rendered as its
    // own category at the very bottom, below Militia/Recruit.
    personnelList.appendChild(makeDividerLi("Court"));
    let militiaDividerPlaced = false;
    const gmPeople = [];

    for (const person of personnel) {
      if (person.isGm) {
        gmPeople.push(person);
        continue;
      }

      if (!militiaDividerPlaced && militiaLevel !== null && person.level <= militiaLevel) {
        personnelList.appendChild(makeDividerLi("Militia"));
        militiaDividerPlaced = true;
      }

      personnelList.appendChild(buildPersonRow(person, onDuty));
    }

    if (gmPeople.length) {
      personnelList.appendChild(makeDividerLi("Game Master"));
      for (const person of gmPeople) {
        personnelList.appendChild(buildPersonRow(person, onDuty));
      }
    }
  }

  function formatMemberDays(days) {
    if (days === null || days === undefined) return "\u2014";
    return days + (days === 1 ? " day" : " days");
  }

  function tickClock() {
    document.querySelectorAll(".elapsed").forEach((el) => {
      const since = Number(el.dataset.since);
      if (!since) return;
      el.textContent = formatElapsed(Date.now() - since);
    });
  }

  function formatElapsed(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return h > 0
      ? h + "h " + String(m).padStart(2, "0") + "m " + String(s).padStart(2, "0") + "s"
      : m + "m " + String(s).padStart(2, "0") + "s";
  }

  async function loadHours(weekKey) {
    try {
      const url = weekKey ? "/api/hours?week=" + encodeURIComponent(weekKey) : "/api/hours";
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      if (!currentWeekKey) currentWeekKey = data.weekKey;
      viewingWeekKey = data.weekKey;
      renderHours(data);
    } catch {}
  }

  async function clearDay(name, day) {
    if (!confirm("Clear " + name + "'s " + day + " hours for the week of " + viewingWeekKey + "? This also removes it from their all-time total.")) return;
    try {
      const response = await fetch("/api/hours/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: viewingWeekKey, name, day })
      });
      const data = await response.json();
      if (response.ok) {
        loadHours(viewingWeekKey);
        loadPersonnel();
      } else {
        alert(data.error || "Couldn't clear that day.");
      }
    } catch {
      alert("Couldn't reach the server.");
    }
  }

  function scheduleHoursPoll() {
    stopHoursPoll();
    if (!canViewAllHours) return;
    const delay = entries.length > 0 ? 5000 : 30000;
    hoursTimer = setTimeout(() => {
      loadHours(viewingWeekKey);
      scheduleHoursPoll();
    }, delay);
  }

  function stopHoursPoll() {
    clearTimeout(hoursTimer);
    hoursTimer = null;
  }

  function renderHours(data) {
    weekLabel.textContent = "Week of " + data.weekKey;
    weekNext.disabled = data.weekKey === currentWeekKey;

    const canManage = Boolean(data.canManageHours);

    hoursRows.innerHTML = "";
    for (const person of data.people) {
      const tr = document.createElement("tr");
      const nameTd = document.createElement("td");
      nameTd.innerHTML = escapeHtml(person.name) + "<span class=\"tag\">" + escapeHtml(person.rankLabel) + "</span>";
      tr.appendChild(nameTd);

      for (const day of DAYS) {
        const td = document.createElement("td");
        td.className = "hours";

        const cell = document.createElement("div");
        cell.className = "hours-cell";

        const value = document.createElement("span");
        value.textContent = formatHours(person.days[day] || 0);
        cell.appendChild(value);

        if (canManage) {
          const clearBtn = document.createElement("button");
          clearBtn.type = "button";
          clearBtn.className = "clear-day-btn";
          clearBtn.textContent = "\u00d7";
          clearBtn.title = "Clear " + person.name + "'s " + day + " hours";
          clearBtn.setAttribute("aria-label", "Clear " + person.name + "'s " + day + " hours");
          clearBtn.addEventListener("click", () => clearDay(person.name, day));
          cell.appendChild(clearBtn);
        }

        td.appendChild(cell);
        tr.appendChild(td);
      }

      const weekTd = document.createElement("td");
      weekTd.className = "week-total";
      weekTd.textContent = formatHours(person.week);
      tr.appendChild(weekTd);

      hoursRows.appendChild(tr);
    }

    hoursScope.textContent = data.canViewAll
      ? ""
      : "You can only see your own hours.";
  }

  function formatHours(h) {
    const totalMinutes = Math.round(h * 60);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return hh + "h " + String(mm).padStart(2, "0") + "m";
  }

  function shiftWeekKey(weekKey, deltaWeeks) {
    const [y, m, d] = weekKey.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + deltaWeeks * 7);
    return dt.getUTCFullYear() + "-" + String(dt.getUTCMonth() + 1).padStart(2, "0") +
      "-" + String(dt.getUTCDate()).padStart(2, "0");
  }

  weekPrev.addEventListener("click", () => loadHours(shiftWeekKey(viewingWeekKey, -1)));
  weekNext.addEventListener("click", () => {
    if (viewingWeekKey !== currentWeekKey) loadHours(shiftWeekKey(viewingWeekKey, 1));
  });

  async function loadReports() {
    try {
      const response = await fetch("/api/reports");
      const data = await response.json();
      if (response.ok) {
        reports = data.reports || [];
        renderReportList();
        if (detailReportId) {
          const still = reports.find((r) => r.id === detailReportId);
          if (still) renderDetail(still); else closeDetail();
        }
      }
    } catch {}
  }

  function renderReportList() {
    const visible = reports.filter((r) => showArchived || !r.archived);
    reportList.innerHTML = "";
    if (!visible.length) {
      reportListEmpty.hidden = false;
      return;
    }
    reportListEmpty.hidden = true;

    for (const report of visible) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "report-item" + (report.archived ? " archived" : "");
      btn.addEventListener("click", () => openDetail(report.id));

      const mainBlock = document.createElement("div");
      mainBlock.className = "report-main";

      const typeTag = document.createElement("span");
      typeTag.className = "report-type";
      typeTag.textContent = report.type === "Other" && report.typeOther ? report.typeOther : report.type;
      mainBlock.appendChild(typeTag);

      const summary = document.createElement("span");
      summary.className = "report-summary";
      summary.textContent = report.title && report.title.trim()
        ? report.title
        : report.location + (report.victim ? " \u2014 " + report.victim : "");
      mainBlock.appendChild(summary);

      if (report.title && report.title.trim()) {
        const locationLine = document.createElement("span");
        locationLine.className = "report-meta";
        locationLine.textContent = report.location + (report.victim ? " \u2014 " + report.victim : "");
        mainBlock.appendChild(locationLine);
      }

      const meta = document.createElement("span");
      meta.className = "report-meta";
      const noteCount = Array.isArray(report.notes) ? report.notes.length : 0;
      meta.textContent = "Filed by " + report.reportingGuard +
        (noteCount ? " \u00b7 " + noteCount + (noteCount === 1 ? " note" : " notes") : "");
      mainBlock.appendChild(meta);

      btn.appendChild(mainBlock);

      const dateSpan = document.createElement("span");
      dateSpan.className = "report-date";
      dateSpan.textContent = report.date;
      btn.appendChild(dateSpan);

      li.appendChild(btn);
      reportList.appendChild(li);
    }
  }

  showArchivedToggle.addEventListener("change", () => {
    showArchived = showArchivedToggle.checked;
    renderReportList();
  });

  function openNewReportModal() {
    editingReportId = null;
    reportFormTitle.textContent = "New Report";
    reportFormSubmit.textContent = "File report";
    reportForm.reset();
    rfTypeOtherRow.hidden = true;
    rfDate.value = new Date().toISOString().slice(0, 10);
    reportFormError.textContent = "";
    reportFormOverlay.hidden = false;
    rfTitle.focus();
  }

  function openEditReportModal(report) {
    editingReportId = report.id;
    reportFormTitle.textContent = "Edit Report";
    reportFormSubmit.textContent = "Save changes";
    reportFormError.textContent = "";

    rfTitle.value = report.title || "";
    rfType.value = report.type;
    rfTypeOtherRow.hidden = report.type !== "Other";
    rfTypeOther.value = report.typeOther || "";
    rfDate.value = report.date;
    rfLocation.value = report.location;
    rfSector.value = report.sector || "";
    rfVictim.value = report.victim || "";
    rfPerpetrator.value = report.perpetrator || "";
    rfDescription.value = report.description;
    rfActions.value = report.actions || "";

    reportFormOverlay.hidden = false;
  }

  function closeReportForm() {
    reportFormOverlay.hidden = true;
    editingReportId = null;
  }

  newReportBtn.addEventListener("click", openNewReportModal);
  document.getElementById("report-form-close").addEventListener("click", closeReportForm);
  document.getElementById("report-form-cancel").addEventListener("click", closeReportForm);
  reportFormOverlay.addEventListener("click", (e) => {
    if (e.target === reportFormOverlay) closeReportForm();
  });

  rfType.addEventListener("change", () => {
    rfTypeOtherRow.hidden = rfType.value !== "Other";
  });

  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    reportFormError.textContent = "";

    const payload = {
      title: rfTitle.value.trim(),
      type: rfType.value,
      typeOther: rfTypeOther.value.trim(),
      date: rfDate.value,
      location: rfLocation.value.trim(),
      sector: rfSector.value,
      victim: rfVictim.value.trim(),
      perpetrator: rfPerpetrator.value.trim(),
      description: rfDescription.value.trim(),
      actions: rfActions.value.trim(),
    };

    const isEdit = Boolean(editingReportId);
    if (isEdit) payload.id = editingReportId;

    reportFormSubmit.disabled = true;
    try {
      const response = await fetch(isEdit ? "/api/reports/edit" : "/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        reports = data.reports || reports;
        renderReportList();
        closeReportForm();
        if (isEdit) {
          const updated = reports.find((r) => r.id === payload.id);
          if (updated) openDetail(updated.id);
        }
      } else {
        reportFormError.textContent = data.error || "Couldn't save the report.";
      }
    } catch {
      reportFormError.textContent = "Couldn't reach the server.";
    }
    reportFormSubmit.disabled = false;
  });

  function openDetail(id) {
    const report = reports.find((r) => r.id === id);
    if (!report) return;
    detailReportId = id;
    editingNoteId = null;
    renderDetail(report);
    detailOverlay.hidden = false;
  }

  function renderDetail(report) {
    const typeLabel = report.type === "Other" && report.typeOther ? report.typeOther : report.type;
    detailTitle.textContent = report.title && report.title.trim()
      ? report.title
      : typeLabel + " \u2014 " + report.location;
    detailArchivedBadge.hidden = !report.archived;

    if (report.editedAt) {
      detailEditedNote.hidden = false;
      detailEditedNote.textContent = "Edited " + new Date(report.editedAt).toLocaleString();
    } else {
      detailEditedNote.hidden = true;
    }

    const fields = [
      ["Reporting guard", report.reportingGuard + " (" + report.reportingRankLabel + ")"],
      ["Date", report.date],
      ["Location of event", report.location],
      ["Sector", report.sector || "\u2014"],
      ["Victim", report.victim || "\u2014"],
      ["Perpetrator", report.perpetrator || "\u2014"],
      ["Description", report.description],
      ["Actions taken", report.actions || "\u2014"],
    ];

    detailBody.innerHTML = "";
    for (const [label, value] of fields) {
      const wrap = document.createElement("div");
      wrap.className = "detail-field";
      const labelEl = document.createElement("div");
      labelEl.className = "detail-label";
      labelEl.textContent = label;
      const valueEl = document.createElement("div");
      valueEl.className = "detail-value";
      valueEl.textContent = value;
      wrap.append(labelEl, valueEl);
      detailBody.appendChild(wrap);
    }

    detailArchiveBtn.textContent = report.archived ? "Unarchive" : "Archive";
    detailEditBtn.hidden = report.reportingGuard !== me;

    renderNotes(report);
  }

  function renderNotes(report) {
    const notes = Array.isArray(report.notes) ? report.notes : [];
    noteList.innerHTML = "";
    if (!notes.length) {
      noNotes.hidden = false;
    } else {
      noNotes.hidden = true;
      for (const note of notes) {
        const li = document.createElement("li");
        li.className = "note-item";

        if (editingNoteId === note.id) {
          li.appendChild(buildNoteEditForm(report.id, note));
          noteList.appendChild(li);
          continue;
        }

        const top = document.createElement("div");
        top.className = "note-top";

        const meta = document.createElement("div");
        meta.className = "note-meta";
        let metaText = note.author + " (" + note.authorRankLabel + ") \u00b7 " +
          new Date(note.createdAt).toLocaleString();
        meta.textContent = metaText;
        if (note.editedAt) {
          const editedSpan = document.createElement("span");
          editedSpan.className = "note-edited";
          editedSpan.textContent = " (edited)";
          meta.appendChild(editedSpan);
        }
        top.appendChild(meta);

        if (note.author === me) {
          const actions = document.createElement("span");
          actions.className = "note-actions";

          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "note-action-btn";
          editBtn.textContent = "Edit";
          editBtn.addEventListener("click", () => {
            editingNoteId = note.id;
            const current = reports.find((r) => r.id === detailReportId);
            if (current) renderNotes(current);
          });

          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className = "note-action-btn delete";
          deleteBtn.textContent = "Delete";
          deleteBtn.addEventListener("click", () => deleteNote(report.id, note.id));

          actions.append(editBtn, deleteBtn);
          top.appendChild(actions);
        }

        const text = document.createElement("div");
        text.className = "note-text";
        text.textContent = note.text;

        li.append(top, text);
        noteList.appendChild(li);
      }
    }
    noteInput.value = "";
  }

  function buildNoteEditForm(reportId, note) {
    const wrap = document.createElement("div");
    wrap.className = "note-edit-row";

    const textarea = document.createElement("textarea");
    textarea.maxLength = 2000;
    textarea.value = note.text;
    wrap.appendChild(textarea);

    const actionCol = document.createElement("div");
    actionCol.className = "note-edit-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "note-action-btn";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", async () => {
      const text = textarea.value.trim();
      if (!text) return;
      saveBtn.disabled = true;
      try {
        const response = await fetch("/api/reports/notes/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, noteId: note.id, text })
        });
        const data = await response.json();
        if (response.ok) {
          reports = data.reports || reports;
          editingNoteId = null;
          const updated = reports.find((r) => r.id === reportId);
          if (updated) renderNotes(updated);
        } else {
          alert(data.error || "Couldn't save the note.");
        }
      } catch {
        alert("Couldn't reach the server.");
      }
      saveBtn.disabled = false;
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "note-action-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      editingNoteId = null;
      const current = reports.find((r) => r.id === reportId);
      if (current) renderNotes(current);
    });

    actionCol.append(saveBtn, cancelBtn);
    wrap.appendChild(actionCol);
    return wrap;
  }

  async function deleteNote(reportId, noteId) {
    if (!confirm("Delete this note? This can't be undone.")) return;
    try {
      const response = await fetch("/api/reports/notes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, noteId })
      });
      const data = await response.json();
      if (response.ok) {
        reports = data.reports || reports;
        renderReportList();
        const updated = reports.find((r) => r.id === reportId);
        if (updated) renderNotes(updated);
      } else {
        alert(data.error || "Couldn't delete the note.");
      }
    } catch {
      alert("Couldn't reach the server.");
    }
  }

  function closeDetail() {
    detailOverlay.hidden = true;
    detailReportId = null;
    editingNoteId = null;
  }

  document.getElementById("detail-close").addEventListener("click", closeDetail);
  document.getElementById("detail-close-btn").addEventListener("click", closeDetail);
  detailOverlay.addEventListener("click", (e) => {
    if (e.target === detailOverlay) closeDetail();
  });

  detailEditBtn.addEventListener("click", () => {
    const report = reports.find((r) => r.id === detailReportId);
    if (!report) return;
    closeDetail();
    openEditReportModal(report);
  });

  detailArchiveBtn.addEventListener("click", async () => {
    if (!detailReportId) return;
    const report = reports.find((r) => r.id === detailReportId);
    if (!report) return;
    const nextArchived = !report.archived;

    detailArchiveBtn.disabled = true;
    try {
      const response = await fetch("/api/reports/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detailReportId, archived: nextArchived })
      });
      const data = await response.json();
      if (response.ok) {
        reports = data.reports || reports;
        renderReportList();
        closeDetail();
      } else {
        alert(data.error || "Couldn't update the report.");
      }
    } catch {
      alert("Couldn't reach the server.");
    }
    detailArchiveBtn.disabled = false;
  });

  addNoteBtn.addEventListener("click", async () => {
    if (!detailReportId) return;
    const text = noteInput.value.trim();
    if (!text) return;

    addNoteBtn.disabled = true;
    try {
      const response = await fetch("/api/reports/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detailReportId, text })
      });
      const data = await response.json();
      if (response.ok) {
        reports = data.reports || reports;
        renderReportList();
        const updated = reports.find((r) => r.id === detailReportId);
        if (updated) renderDetail(updated);
      } else {
        alert(data.error || "Couldn't add the note.");
      }
    } catch {
      alert("Couldn't reach the server.");
    }
    addNoteBtn.disabled = false;
  });

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // Route buttons — independent toggles, same pattern as sector buttons.
  document.querySelectorAll(".route-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nowActive = !btn.classList.contains("active");
      btn.classList.toggle("active", nowActive);
      document.querySelectorAll('.route-path[data-route="' + btn.dataset.route + '"]')
        .forEach((p) => p.classList.toggle("active", nowActive));
    });
  });

  // Patrol roster — separate from the map-overlay toggle above. Lets a
  // guard claim the patrol they're currently walking; everyone else sees
  // who's on what via a light poll while the Patrols tab is open.
  let patrolAssignments = {};
  let patrolPollTimer = null;
  // Every fetch that can write patrolAssignments claims the next number.
  // When a response comes back, it's only applied if it's still the
  // latest request issued — otherwise it's a stale response that arrived
  // out of order (e.g. a poll that started before a click but resolved
  // after it) and gets silently dropped instead of clobbering newer data.
  let patrolRequestSeq = 0;

  function loadPatrolRoster() {
    const seq = ++patrolRequestSeq;
    return fetch("/api/patrol-assignments")
      .then((r) => (r.ok ? r.json() : { assignments: {} }))
      .then((data) => {
        if (seq !== patrolRequestSeq) return; // superseded by a newer request
        patrolAssignments = data.assignments || {};
        renderPatrolRoster();
      })
      .catch(() => {});
  }

  function renderPatrolRoster() {
    const byPatrol = {};
    for (const [guard, patrol] of Object.entries(patrolAssignments)) {
      (byPatrol[patrol] ||= []).push(guard);
    }
    document.querySelectorAll(".route-join-btn").forEach((btn) => {
      const isMine = patrolAssignments[me] === btn.dataset.route;
      btn.textContent = isMine ? "Leave" : "Join";
      btn.classList.toggle("joined", isMine);
      const amClockedIn = entries.some((e) => e.name === me);
      btn.disabled = !isMine && !amClockedIn;
      btn.title = btn.disabled ? "Clock in to join a patrol" : "";
    });

    // Grouped-by-patrol list below the map, styled like the Personnel
    // list's dividers on Home. Route order/names come straight from the
    // route buttons already in the DOM, so this never drifts out of sync
    // with them.
    const list = document.getElementById("patrol-roster-list");
    if (!list) return;
    list.innerHTML = "";
    document.querySelectorAll(".route-btn").forEach((routeBtn) => {
      list.appendChild(makeDividerLi(routeBtn.textContent));
      const guards = byPatrol[routeBtn.dataset.route] || [];
      if (!guards.length) {
        const li = document.createElement("li");
        li.className = "roster-row";
        const empty = document.createElement("span");
        empty.className = "roster-empty";
        empty.textContent = "No one currently on patrol";
        li.appendChild(empty);
        list.appendChild(li);
        return;
      }
      guards.forEach((name) => {
        const li = document.createElement("li");
        li.className = "roster-row";
        li.appendChild(document.createTextNode(name));
        const info = personnel.find((p) => p.name === name);
        if (info) {
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = info.rankLabel;
          li.appendChild(tag);
        }
        list.appendChild(li);
      });
    });
  }

  document.querySelectorAll(".route-join-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const isMine = patrolAssignments[me] === btn.dataset.route;
      btn.disabled = true;
      const seq = ++patrolRequestSeq;
      try {
        const response = await fetch("/api/patrol-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patrol: isMine ? null : btn.dataset.route })
        });
        const data = await response.json();
        if (response.ok) {
          if (seq === patrolRequestSeq) {
            patrolAssignments = data.assignments || {};
          }
        } else {
          alert(data.error || "Couldn't update your patrol assignment.");
        }
      } catch {
        alert("Couldn't reach the server.");
      }
      // Always re-render from whatever's now the latest known state,
      // rather than blindly re-enabling the button — this both fixes the
      // disabled/label state properly and self-heals if this response
      // turned out to be the stale one.
      renderPatrolRoster();
      // Belt-and-suspenders: re-confirm against the server a moment
      // later, independent of the normal 8s poll, so a join/leave is
      // double-checked against server truth shortly after acting on it.
      setTimeout(loadPatrolRoster, 1500);
    });
  });

  function schedulePatrolPoll() {
    stopPatrolPoll();
    patrolPollTimer = setTimeout(() => {
      loadPatrolRoster();
      schedulePatrolPoll();
    }, 8000);
  }

  function stopPatrolPoll() {
    clearTimeout(patrolPollTimer);
    patrolPollTimer = null;
  }

  // Territory and route paths are no longer hardcoded in this file --
  // they're loaded from patrol-map-data.json and built into both SVG
  // containers here. Hover/tooltip listeners have to wait until the
  // fetch resolves and the <path> elements actually exist; the sector
  // and route button click handlers below don't have that problem,
  // since they only look up paths at click time, not at page load.
  const SVG_NS = "http://www.w3.org/2000/svg";
  const territoryTooltip = document.getElementById("territory-tooltip");

  fetch("/assets/patrol-map-data.json")
    .then((r) => r.json())
    .then((entries) => {
      const inlineSvg = document.getElementById("territory-svg-inline");
      const lightboxSvg = document.getElementById("territory-svg-lightbox");

      entries.forEach((entry) => {
        const path = document.createElementNS(SVG_NS, "path");
        if (entry.kind === "territory") {
          path.setAttribute("class", "territory-path");
          path.setAttribute("data-territory", entry.key);
          path.setAttribute("data-label", entry.label);
          path.setAttribute("style", "--territory-color:" + entry.color);
        } else {
          path.setAttribute("class", "route-path");
          path.setAttribute("id", "route-path-inline-" + entry.key);
          path.setAttribute("data-route", entry.key);
          path.setAttribute("style", "--route-color:" + entry.color);
        }
        path.setAttribute("d", entry.d);
        inlineSvg.appendChild(path);

        const clone = path.cloneNode(true);
        if (entry.kind === "route") clone.id = "route-path-lightbox-" + entry.key;
        lightboxSvg.appendChild(clone);
      });

      document.querySelectorAll(".territory-path").forEach((path) => {
        path.addEventListener("mouseenter", () => {
          territoryTooltip.textContent = path.dataset.label;
          territoryTooltip.hidden = false;
        });
        path.addEventListener("mousemove", (e) => {
          territoryTooltip.style.left = e.clientX + "px";
          territoryTooltip.style.top = e.clientY + "px";
        });
        path.addEventListener("mouseleave", () => {
          territoryTooltip.hidden = true;
        });
      });
    })
    .catch(() => {}); // map still works without borders if this fails to load

  // Sector buttons — independent toggles, any combination can be active
  // at once. Each toggles the traced SVG fill's "visible" class directly.
  document.querySelectorAll(".sector-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nowActive = !btn.classList.contains("active");
      btn.classList.toggle("active", nowActive);
      document.querySelectorAll('.territory-path[data-territory="' + btn.dataset.territory + '"]')
        .forEach((path) => path.classList.toggle("visible", nowActive));
    });
  });

  // Map lightbox — click (or Enter/Space) the inline map to pop it out
  // larger. The lightbox mirrors the inline map's state automatically,
  // since inline and lightbox paths share classes/attributes and are
  // toggled together everywhere else in this script.
  const mapLightboxOverlay = document.getElementById("map-lightbox-overlay");
  const patrolMapWrap = document.getElementById("patrol-map-wrap");
  const mapViewport = document.getElementById("map-lightbox-viewport");
  const mapStackLightbox = document.getElementById("map-stack-lightbox");

  const MAP_ZOOM_MIN = 1;
  const MAP_ZOOM_MAX = 5;
  let mapZoom = 1, mapPanX = 0, mapPanY = 0;
  let isDraggingMap = false, dragOrigin = { x: 0, y: 0 }, panOrigin = { x: 0, y: 0 };
  let pinchStartDist = 0, pinchStartZoom = 1, pinchStartPan = { x: 0, y: 0 }, pinchMid = { x: 0, y: 0 };

  // Keeps the point under (cursorX, cursorY) visually fixed while zooming.
  function zoomToward(cursorX, cursorY, factor) {
    const newZoom = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, mapZoom * factor));
    const ratio = newZoom / mapZoom;
    mapPanX = cursorX - (cursorX - mapPanX) * ratio;
    mapPanY = cursorY - (cursorY - mapPanY) * ratio;
    mapZoom = newZoom;
    clampMapPan();
    applyMapTransform();
  }

  // Stops panning past the image's edge — at zoom 1 this always forces
  // pan back to (0,0), which is what keeps the map fully visible and
  // undraggable until the user actually zooms in.
  function clampMapPan() {
    const viewportW = mapViewport.clientWidth;
    const viewportH = mapViewport.clientHeight;
    const naturalW = mapStackLightbox.offsetWidth;
    const naturalH = mapStackLightbox.offsetHeight;
    const scaledW = naturalW * mapZoom;
    const scaledH = naturalH * mapZoom;
    const minX = Math.min(0, viewportW - scaledW);
    const minY = Math.min(0, viewportH - scaledH);
    mapPanX = Math.min(0, Math.max(minX, mapPanX));
    mapPanY = Math.min(0, Math.max(minY, mapPanY));
  }

  function applyMapTransform() {
    mapStackLightbox.style.transform = "translate(" + mapPanX + "px, " + mapPanY + "px) scale(" + mapZoom + ")";
  }

  function resetMapZoom() {
    mapZoom = 1; mapPanX = 0; mapPanY = 0;
    applyMapTransform();
  }

  function openMapLightbox() {
    resetMapZoom();
    mapLightboxOverlay.hidden = false;
  }
  function closeMapLightbox() {
    mapLightboxOverlay.hidden = true;
    resetMapZoom(); // fresh, unzoomed view next time it's opened
  }

  patrolMapWrap.addEventListener("click", openMapLightbox);
  patrolMapWrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMapLightbox();
    }
  });
  document.getElementById("map-lightbox-close").addEventListener("click", closeMapLightbox);
  mapLightboxOverlay.addEventListener("click", (e) => {
    if (e.target === mapLightboxOverlay) closeMapLightbox();
  });

  // Scroll wheel to zoom, centered on the cursor.
  mapViewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = mapViewport.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    zoomToward(cursorX, cursorY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
  }, { passive: false });

  // Click-and-drag to pan once zoomed in.
  mapViewport.addEventListener("mousedown", (e) => {
    if (mapZoom <= MAP_ZOOM_MIN) return;
    isDraggingMap = true;
    mapViewport.classList.add("dragging");
    dragOrigin = { x: e.clientX, y: e.clientY };
    panOrigin = { x: mapPanX, y: mapPanY };
  });
  window.addEventListener("mousemove", (e) => {
    if (!isDraggingMap) return;
    mapPanX = panOrigin.x + (e.clientX - dragOrigin.x);
    mapPanY = panOrigin.y + (e.clientY - dragOrigin.y);
    clampMapPan();
    applyMapTransform();
  });
  window.addEventListener("mouseup", () => {
    isDraggingMap = false;
    mapViewport.classList.remove("dragging");
  });

  // Double-click to reset.
  mapViewport.addEventListener("dblclick", () => resetMapZoom());

  // Touch: one finger pans, two fingers pinch-zoom (toward the midpoint
  // between the two touches).
  function touchDist(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  }
  mapViewport.addEventListener("touchstart", (e) => {
    const rect = mapViewport.getBoundingClientRect();
    if (e.touches.length === 1 && mapZoom > MAP_ZOOM_MIN) {
      isDraggingMap = true;
      dragOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panOrigin = { x: mapPanX, y: mapPanY };
    } else if (e.touches.length === 2) {
      isDraggingMap = false;
      pinchStartDist = touchDist(e.touches[0], e.touches[1]);
      pinchStartZoom = mapZoom;
      pinchStartPan = { x: mapPanX, y: mapPanY };
      pinchMid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
      };
    }
  }, { passive: false });
  mapViewport.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDraggingMap) {
      mapPanX = panOrigin.x + (e.touches[0].clientX - dragOrigin.x);
      mapPanY = panOrigin.y + (e.touches[0].clientY - dragOrigin.y);
      clampMapPan();
      applyMapTransform();
    } else if (e.touches.length === 2 && pinchStartDist > 0) {
      const newDist = touchDist(e.touches[0], e.touches[1]);
      const factor = newDist / pinchStartDist;
      mapZoom = pinchStartZoom; // baseline before applying this gesture's factor
      mapPanX = pinchStartPan.x; mapPanY = pinchStartPan.y;
      zoomToward(pinchMid.x, pinchMid.y, factor);
    }
  }, { passive: false });
  mapViewport.addEventListener("touchend", () => {
    isDraggingMap = false;
    pinchStartDist = 0;
  });

  // +/−/reset buttons, for anyone without a wheel or touchscreen.
  document.getElementById("map-zoom-in").addEventListener("click", () => {
    zoomToward(mapViewport.clientWidth / 2, mapViewport.clientHeight / 2, 1.4);
  });
  document.getElementById("map-zoom-out").addEventListener("click", () => {
    zoomToward(mapViewport.clientWidth / 2, mapViewport.clientHeight / 2, 1 / 1.4);
  });
  document.getElementById("map-zoom-reset").addEventListener("click", resetMapZoom);

  refreshClock();
  setInterval(tickClock, 1000);