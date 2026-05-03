(function () {
  var MIN_YEAR = 2026;
  var MAX_YEAR = 2036;
  var MIN_DATE = "2026-01-01";
  var MAX_DATE = "2036-12-31";
  var EVENT_KEY = "shampoo-calendar-events";
  var INTERVAL_KEY = "shampoo-calendar-interval";
  var MINUS_FLEX_INTERVAL_KEY = "shampoo-calendar-minus-flex-interval";
  var PLUS_FLEX_INTERVAL_KEY = "shampoo-calendar-flex-interval";
  var IMPORTANCE_LABELS = {
    "very-important": "非常重要",
    normal: "一般",
    low: "不太重要"
  };
  var IMPORTANCE_RANKS = {
    "very-important": 1,
    normal: 2,
    low: 3
  };

  var state = {
    year: 2026,
    month: 1,
    selectedDate: "2026-01-01",
    baseIntervalDays: 2,
    minusFlexIntervalDays: 0,
    plusFlexIntervalDays: 1,
    contextMenuEventId: null,
    events: [],
    monthDays: [],
    shampooDays: []
  };

  var els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    restoreState();
    setInitialMonth();
    buildSelectOptions();
    bindEvents();
    syncControls();
    refreshCalendar();
  }

  function cacheElements() {
    els.prevMonth = document.getElementById("prevMonth");
    els.nextMonth = document.getElementById("nextMonth");
    els.monthTitle = document.getElementById("monthTitle");
    els.yearSelect = document.getElementById("yearSelect");
    els.monthSelect = document.getElementById("monthSelect");
    els.calendarGrid = document.getElementById("calendarGrid");
    els.baseIntervalInput = document.getElementById("baseIntervalInput");
    els.minusFlexIntervalInput = document.getElementById("minusFlexIntervalInput");
    els.plusFlexIntervalInput = document.getElementById("plusFlexIntervalInput");
    els.intervalReadout = document.getElementById("intervalReadout");
    els.eventForm = document.getElementById("eventForm");
    els.eventDate = document.getElementById("eventDate");
    els.eventTitle = document.getElementById("eventTitle");
    els.eventImportance = document.getElementById("eventImportance");
    els.selectedDateTitle = document.getElementById("selectedDateTitle");
    els.dayDetails = document.getElementById("dayDetails");
    els.eventContextMenu = document.getElementById("eventContextMenu");
    els.deleteEventFromMenu = document.getElementById("deleteEventFromMenu");
    els.importanceMenuItems = document.querySelectorAll(".importance-menu-item");
  }

  function restoreState() {
    try {
      var savedEvents = JSON.parse(localStorage.getItem(EVENT_KEY) || "[]");
      state.events = savedEvents.filter(function (event) {
        return event && isSupportedDate(event.date) && event.title;
      }).map(function (event) {
        event.importance = normalizeImportance(event.importance);
        return event;
      });
    } catch (ignored) {
      state.events = [];
    }

    var savedInterval = Number(localStorage.getItem(INTERVAL_KEY));
    if (savedInterval >= 1 && savedInterval <= 7) {
      state.baseIntervalDays = savedInterval;
    }

    var savedMinusFlexInterval = Number(localStorage.getItem(MINUS_FLEX_INTERVAL_KEY));
    if (savedMinusFlexInterval >= 0 && savedMinusFlexInterval <= 3) {
      state.minusFlexIntervalDays = savedMinusFlexInterval;
    }

    var savedPlusFlexInterval = Number(localStorage.getItem(PLUS_FLEX_INTERVAL_KEY));
    if (savedPlusFlexInterval >= 0 && savedPlusFlexInterval <= 3) {
      state.plusFlexIntervalDays = savedPlusFlexInterval;
    }
  }

  function setInitialMonth() {
    var now = new Date();
    if (now.getFullYear() >= MIN_YEAR && now.getFullYear() <= MAX_YEAR) {
      state.year = now.getFullYear();
      state.month = now.getMonth() + 1;
      state.selectedDate = formatDateKey(state.year, state.month, now.getDate());
      return;
    }
    state.year = MIN_YEAR;
    state.month = 1;
    state.selectedDate = MIN_DATE;
  }

  function buildSelectOptions() {
    for (var year = MIN_YEAR; year <= MAX_YEAR; year++) {
      var yearOption = document.createElement("option");
      yearOption.value = String(year);
      yearOption.textContent = year + " 年";
      els.yearSelect.appendChild(yearOption);
    }

    for (var month = 1; month <= 12; month++) {
      var monthOption = document.createElement("option");
      monthOption.value = String(month);
      monthOption.textContent = month + " 月";
      els.monthSelect.appendChild(monthOption);
    }
  }

  function bindEvents() {
    els.prevMonth.addEventListener("click", function () {
      moveMonth(-1);
    });
    els.nextMonth.addEventListener("click", function () {
      moveMonth(1);
    });
    els.yearSelect.addEventListener("change", function () {
      state.year = Number(els.yearSelect.value);
      ensureSelectedDateInMonth();
      refreshCalendar();
    });
    els.monthSelect.addEventListener("change", function () {
      state.month = Number(els.monthSelect.value);
      ensureSelectedDateInMonth();
      refreshCalendar();
    });
    els.baseIntervalInput.addEventListener("input", function () {
      state.baseIntervalDays = Number(els.baseIntervalInput.value);
      localStorage.setItem(INTERVAL_KEY, String(state.baseIntervalDays));
      syncControls();
      refreshCalendar();
    });
    els.minusFlexIntervalInput.addEventListener("input", function () {
      state.minusFlexIntervalDays = Number(els.minusFlexIntervalInput.value);
      localStorage.setItem(MINUS_FLEX_INTERVAL_KEY, String(state.minusFlexIntervalDays));
      syncControls();
      refreshCalendar();
    });
    els.plusFlexIntervalInput.addEventListener("input", function () {
      state.plusFlexIntervalDays = Number(els.plusFlexIntervalInput.value);
      localStorage.setItem(PLUS_FLEX_INTERVAL_KEY, String(state.plusFlexIntervalDays));
      syncControls();
      refreshCalendar();
    });
    els.eventForm.addEventListener("submit", function (event) {
      event.preventDefault();
      addImportantEvent();
    });
    els.deleteEventFromMenu.addEventListener("click", function () {
      if (state.contextMenuEventId) {
        deleteEvent(state.contextMenuEventId);
      }
      hideEventContextMenu();
    });
    Array.prototype.forEach.call(els.importanceMenuItems, function (item) {
      item.addEventListener("click", function () {
        updateEventImportance(state.contextMenuEventId, item.getAttribute("data-importance"));
        hideEventContextMenu();
      });
    });
    els.eventContextMenu.addEventListener("click", function (event) {
      event.stopPropagation();
    });
    els.eventContextMenu.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      event.stopPropagation();
    });
    document.addEventListener("click", hideEventContextMenu);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        hideEventContextMenu();
      }
    });
    window.addEventListener("scroll", hideEventContextMenu, true);
  }

  function moveMonth(offset) {
    var nextMonth = state.month + offset;
    var nextYear = state.year;
    if (nextMonth < 1) {
      nextYear--;
      nextMonth = 12;
    }
    if (nextMonth > 12) {
      nextYear++;
      nextMonth = 1;
    }
    if (nextYear < MIN_YEAR || nextYear > MAX_YEAR) {
      return;
    }
    state.year = nextYear;
    state.month = nextMonth;
    ensureSelectedDateInMonth();
    refreshCalendar();
  }

  function ensureSelectedDateInMonth() {
    var prefix = monthPrefix(state.year, state.month);
    if (!state.selectedDate || state.selectedDate.indexOf(prefix) !== 0) {
      state.selectedDate = prefix + "-01";
    }
  }

  function syncControls() {
    els.yearSelect.value = String(state.year);
    els.monthSelect.value = String(state.month);
    els.baseIntervalInput.value = String(state.baseIntervalDays);
    els.minusFlexIntervalInput.value = String(state.minusFlexIntervalDays);
    els.plusFlexIntervalInput.value = String(state.plusFlexIntervalDays);
    els.intervalReadout.textContent = intervalReadout();
    els.monthTitle.textContent = state.year + " 年 " + state.month + " 月";
    els.prevMonth.disabled = state.year === MIN_YEAR && state.month === 1;
    els.nextMonth.disabled = state.year === MAX_YEAR && state.month === 12;
    if (!els.eventDate.value) {
      els.eventDate.value = state.selectedDate;
    }
  }

  function refreshCalendar() {
    syncControls();
    els.calendarGrid.setAttribute("aria-busy", "true");
    state.monthDays = getMonthDays(state.year, state.month);
    state.shampooDays = planShampooDays(state.events);
    renderCalendar();
    renderDayDetails();
    els.calendarGrid.removeAttribute("aria-busy");
  }

  function getMonthDays(year, month) {
    var days = [];
    if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12) {
      return days;
    }
    var date = new Date(Date.UTC(year, month - 1, 1));
    while (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1) {
      var dateKey = formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
      var isoDayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
      days.push({
        date: dateKey,
        day: date.getUTCDate(),
        dayOfWeek: isoDayOfWeek,
        weekend: isoDayOfWeek === 6 || isoDayOfWeek === 7
      });
      date.setUTCDate(date.getUTCDate() + 1);
    }
    return days;
  }

  function planShampooDays(events) {
    var baseIntervalDays = normalizeBaseInterval(state.baseIntervalDays);
    var minusFlexIntervalDays = normalizeFlexInterval(state.minusFlexIntervalDays);
    var plusFlexIntervalDays = normalizeFlexInterval(state.plusFlexIntervalDays);
    var minIntervalDays = Math.max(1, baseIntervalDays - minusFlexIntervalDays);
    var maxIntervalDays = baseIntervalDays + plusFlexIntervalDays;
    var eventsByPreparationDay = buildPreparationMap(events);
    var anchorDays = selectPriorityAnchors(eventsByPreparationDay, minIntervalDays);
    var shampooDaySet = {};
    var shampooDays = [];

    if (!anchorDays.length) {
      addRoutineDays(shampooDaySet, dateToDayNumber(MIN_DATE), dateToDayNumber(MAX_DATE), baseIntervalDays);
    } else {
      addAnchoredPlan(shampooDaySet, anchorDays, baseIntervalDays, minIntervalDays, maxIntervalDays);
    }

    Object.keys(shampooDaySet).forEach(function (dayText) {
      shampooDays.push(Number(dayText));
    });
    shampooDays.sort(function (left, right) {
      return left - right;
    });

    return shampooDays.map(function (dayNumber) {
      var relatedEvents = eventsByPreparationDay[dayNumber] || [];
      return {
        date: dayNumberToDate(dayNumber),
        type: relatedEvents.length ? "event-prep" : "routine",
        label: relatedEvents.length ? "重要事项前一天" : "间隔维护",
        relatedEvents: relatedEvents.map(function (event) {
          return {
            date: event.date,
            title: event.title,
            importance: normalizeImportance(event.importance),
            importanceLabel: importanceLabel(event.importance)
          };
        })
      };
    });
  }

  function buildPreparationMap(events) {
    var map = {};
    events.forEach(function (event) {
      if (!event || !isSupportedDate(event.date)) {
        return;
      }
      var preparationDay = dateToDayNumber(event.date) - 1;
      if (!isSupportedDayNumber(preparationDay)) {
        return;
      }
      if (!map[preparationDay]) {
        map[preparationDay] = [];
      }
      map[preparationDay].push({
        date: event.date,
        title: event.title,
        importance: normalizeImportance(event.importance)
      });
    });
    Object.keys(map).forEach(function (dayNumber) {
      map[dayNumber].sort(compareByDate);
    });
    return map;
  }

  function selectPriorityAnchors(eventsByPreparationDay, minIntervalDays) {
    var selectedAnchors = [];
    addAnchorsByImportance(selectedAnchors, eventsByPreparationDay, "very-important", minIntervalDays);
    addAnchorsByImportance(selectedAnchors, eventsByPreparationDay, "normal", minIntervalDays);
    addAnchorsByImportance(selectedAnchors, eventsByPreparationDay, "low", minIntervalDays);
    return selectedAnchors.sort(function (left, right) {
      return left - right;
    });
  }

  function addAnchorsByImportance(selectedAnchors, eventsByPreparationDay, targetImportance, minIntervalDays) {
    Object.keys(eventsByPreparationDay).map(Number).sort(function (left, right) {
      return left - right;
    }).forEach(function (dayNumber) {
      if (!hasImportance(eventsByPreparationDay[dayNumber], targetImportance)) {
        return;
      }
      if (keepsDistanceFromSelected(dayNumber, selectedAnchors, minIntervalDays)) {
        selectedAnchors.push(dayNumber);
        selectedAnchors.sort(function (left, right) {
          return left - right;
        });
      }
    });
  }

  function hasImportance(events, targetImportance) {
    return events.some(function (event) {
      return normalizeImportance(event.importance) === targetImportance;
    });
  }

  function keepsDistanceFromSelected(dayNumber, selectedAnchors, minIntervalDays) {
    for (var i = 0; i < selectedAnchors.length; i++) {
      if (Math.abs(selectedAnchors[i] - dayNumber) < minIntervalDays) {
        return false;
      }
    }
    return true;
  }

  function addRoutineDays(shampooDaySet, startDay, endDay, intervalDays) {
    for (var day = startDay; day <= endDay; day += intervalDays) {
      shampooDaySet[day] = true;
    }
  }

  function addAnchoredPlan(shampooDaySet, anchorDays, baseIntervalDays, minIntervalDays, maxIntervalDays) {
    var startDay = dateToDayNumber(MIN_DATE);
    var endDay = dateToDayNumber(MAX_DATE);
    var firstAnchor = anchorDays[0];

    for (var day = firstAnchor; day >= startDay; day -= baseIntervalDays) {
      shampooDaySet[day] = true;
    }

    for (var i = 0; i < anchorDays.length; i++) {
      shampooDaySet[anchorDays[i]] = true;
      if (i > 0) {
        addIntervalDaysBetween(shampooDaySet, anchorDays[i - 1], anchorDays[i], baseIntervalDays, minIntervalDays, maxIntervalDays);
      }
    }

    var lastAnchor = anchorDays[anchorDays.length - 1];
    for (var nextDay = lastAnchor + baseIntervalDays; nextDay <= endDay; nextDay += baseIntervalDays) {
      shampooDaySet[nextDay] = true;
    }
  }

  function addIntervalDaysBetween(shampooDaySet, previousDay, nextDay, baseIntervalDays, minIntervalDays, maxIntervalDays) {
    var gap = nextDay - previousDay;
    if (gap <= maxIntervalDays) {
      return;
    }

    var segments = chooseSegmentCount(gap, baseIntervalDays, minIntervalDays, maxIntervalDays);
    if (segments <= 1) {
      addBaseSteppedDaysBetween(shampooDaySet, previousDay, nextDay, baseIntervalDays);
      return;
    }

    var intervalLengths = buildIntervalLengths(gap, segments, baseIntervalDays, minIntervalDays, maxIntervalDays);
    var currentDay = previousDay;
    for (var i = 0; i < intervalLengths.length - 1; i++) {
      currentDay += intervalLengths[i];
      if (currentDay > previousDay && currentDay < nextDay) {
        shampooDaySet[currentDay] = true;
      }
    }
  }

  function addBaseSteppedDaysBetween(shampooDaySet, previousDay, nextDay, baseIntervalDays) {
    for (var day = previousDay + baseIntervalDays; day < nextDay; day += baseIntervalDays) {
      shampooDaySet[day] = true;
    }
  }

  function chooseSegmentCount(gap, baseIntervalDays, minIntervalDays, maxIntervalDays) {
    var minSegments = Math.ceil(gap / maxIntervalDays);
    var maxSegments = Math.floor(gap / minIntervalDays);
    var bestSegments = -1;
    var bestAdjustedSegments = Number.MAX_SAFE_INTEGER;
    var bestDeviation = Number.MAX_SAFE_INTEGER;
    var bestDirection = -1;

    for (var segments = minSegments; segments <= maxSegments; segments++) {
      var diff = gap - segments * baseIntervalDays;
      var capacity = diff >= 0 ? maxIntervalDays - baseIntervalDays : baseIntervalDays - minIntervalDays;
      if (diff !== 0 && capacity === 0) {
        continue;
      }
      var deviation = Math.abs(diff);
      var adjustedSegments = capacity === 0 ? 0 : Math.ceil(deviation / capacity);
      var direction = diff >= 0 ? 1 : 0;
      if (adjustedSegments < bestAdjustedSegments
          || (adjustedSegments === bestAdjustedSegments && deviation < bestDeviation)
          || (adjustedSegments === bestAdjustedSegments && deviation === bestDeviation && direction > bestDirection)) {
        bestSegments = segments;
        bestAdjustedSegments = adjustedSegments;
        bestDeviation = deviation;
        bestDirection = direction;
      }
    }

    return bestSegments;
  }

  function buildIntervalLengths(gap, segments, baseIntervalDays, minIntervalDays, maxIntervalDays) {
    var intervalLengths = [];
    for (var i = 0; i < segments; i++) {
      intervalLengths.push(baseIntervalDays);
    }

    var extraDays = gap - segments * baseIntervalDays;
    var direction = extraDays >= 0 ? 1 : -1;
    var remaining = Math.abs(extraDays);
    var index = 0;
    while (remaining > 0 && index < intervalLengths.length * 7) {
      var intervalIndex = index % intervalLengths.length;
      if (direction > 0 && intervalLengths[intervalIndex] < maxIntervalDays) {
        intervalLengths[intervalIndex]++;
        remaining--;
      } else if (direction < 0 && intervalLengths[intervalIndex] > minIntervalDays) {
        intervalLengths[intervalIndex]--;
        remaining--;
      }
      index++;
    }
    return intervalLengths;
  }

  function renderCalendar() {
    var eventMap = groupEventsByDate();
    var shampooMap = groupShampooByDate();
    var fragment = document.createDocumentFragment();
    var cellCount = 0;

    clear(els.calendarGrid);
    if (!state.monthDays.length) {
      renderError("当前月份不在支持范围内。");
      return;
    }

    var leadingBlankCount = state.monthDays[0].dayOfWeek - 1;
    for (var i = 0; i < leadingBlankCount; i++) {
      fragment.appendChild(blankCell());
      cellCount++;
    }

    state.monthDays.forEach(function (day) {
      var events = eventMap[day.date] || [];
      var marker = shampooMap[day.date];
      fragment.appendChild(dayCell(day, events, marker));
      cellCount++;
    });

    while (cellCount < 42) {
      fragment.appendChild(blankCell());
      cellCount++;
    }

    els.calendarGrid.appendChild(fragment);
  }

  function blankCell() {
    var cell = document.createElement("div");
    cell.className = "day-blank";
    return cell;
  }

  function dayCell(day, events, marker) {
    var cell = document.createElement("div");
    cell.className = "day-card";
    cell.dataset.date = day.date;
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("aria-label", day.date + "，" + buildDayAria(events, marker));

    if (day.weekend) {
      cell.className += " day-weekend";
    }
    if (day.date === todayKey()) {
      cell.className += " is-today";
    }
    if (day.date === state.selectedDate) {
      cell.className += " is-selected";
    }
    if (events.length) {
      cell.className += " has-event";
    }
    if (marker) {
      cell.className += " has-shampoo";
    }

    var dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(day.day);
    cell.appendChild(dayNumber);

    var badges = document.createElement("div");
    badges.className = "badge-stack";
    if (events.length) {
      badges.appendChild(badge(buildEventBadgeText(events), "badge-event " + importanceClass(highestImportance(events))));
    }
    if (marker) {
      badges.appendChild(badge("洗头", marker.type === "event-prep" ? "badge-prep" : "badge-shampoo"));
    }
    cell.appendChild(badges);

    if (events.length) {
      cell.appendChild(eventChipList(events, day.date));
    }

    var note = document.createElement("div");
    note.className = "mini-note";
    note.textContent = buildMiniNote(events, marker);
    cell.appendChild(note);

    cell.addEventListener("click", function () {
      selectDate(day.date);
    });
    cell.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectDate(day.date);
      }
    });
    cell.addEventListener("dragover", function (event) {
      if (event.dataTransfer.types && Array.prototype.indexOf.call(event.dataTransfer.types, "text/plain") === -1) {
        return;
      }
      event.preventDefault();
      cell.classList.add("is-drop-target");
    });
    cell.addEventListener("dragleave", function () {
      cell.classList.remove("is-drop-target");
    });
    cell.addEventListener("drop", function (event) {
      event.preventDefault();
      cell.classList.remove("is-drop-target");
      updateEventDate(event.dataTransfer.getData("text/plain"), day.date);
    });
    return cell;
  }

  function selectDate(date) {
    state.selectedDate = date;
    els.eventDate.value = date;
    hideEventContextMenu();
    renderCalendar();
    renderDayDetails();
  }

  function eventChipList(events, date) {
    var list = document.createElement("div");
    list.className = "event-chip-list";
    events.slice().sort(compareByDate).forEach(function (event) {
      list.appendChild(eventChip(event, date));
    });
    return list;
  }

  function eventChip(event, date) {
    var chip = document.createElement("div");
    chip.className = "event-chip " + importanceClass(event.importance);
    chip.setAttribute("draggable", "true");
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("title", "拖动修改日期，右键删除");
    chip.dataset.eventId = event.id;
    chip.textContent = event.title;

    chip.addEventListener("click", function (domEvent) {
      domEvent.stopPropagation();
      selectDate(date);
    });
    chip.addEventListener("keydown", function (domEvent) {
      if (domEvent.key === "Enter" || domEvent.key === " ") {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        selectDate(date);
      }
    });
    chip.addEventListener("dragstart", function (domEvent) {
      hideEventContextMenu();
      domEvent.stopPropagation();
      domEvent.dataTransfer.effectAllowed = "move";
      domEvent.dataTransfer.setData("text/plain", event.id);
      chip.classList.add("is-dragging");
    });
    chip.addEventListener("dragend", function () {
      chip.classList.remove("is-dragging");
    });
    chip.addEventListener("contextmenu", function (domEvent) {
      domEvent.preventDefault();
      domEvent.stopPropagation();
      showEventContextMenu(event.id, domEvent.clientX, domEvent.clientY);
    });
    return chip;
  }

  function badge(text, className) {
    var span = document.createElement("span");
    span.className = "badge " + className;
    span.textContent = text;
    return span;
  }

  function buildDayAria(events, marker) {
    var parts = [];
    if (events.length) {
      parts.push(events.length + " 个重要事项");
      parts.push("最高等级：" + importanceLabel(highestImportance(events)));
    }
    if (marker) {
      parts.push(marker.type === "event-prep" ? "重要事项前一天洗头" : "按间隔洗头");
    }
    return parts.length ? parts.join("，") : "无安排";
  }

  function buildMiniNote(events, marker) {
    if (marker && marker.type === "event-prep" && marker.relatedEvents.length) {
      return "为 " + marker.relatedEvents.map(function (event) {
        return event.title + "（" + importanceLabel(event.importance) + "）";
      }).join("、") + " 做准备";
    }
    if (marker) {
      return "按当前间隔维护";
    }
    return "";
  }

  function renderDayDetails() {
    var events = eventsForDate(state.selectedDate);
    var marker = shampooForDate(state.selectedDate);
    clear(els.dayDetails);
    els.dayDetails.className = events.length || marker ? "detail-list" : "empty-state";
    els.selectedDateTitle.textContent = formatDisplayDate(state.selectedDate);

    if (!events.length && !marker) {
      els.dayDetails.textContent = "当天没有事项，也不是计划洗头日。";
      return;
    }

    if (marker) {
      var shampooRow = document.createElement("div");
      shampooRow.className = "detail-row";
      var title = document.createElement("strong");
      title.textContent = marker.type === "event-prep" ? "洗头提醒：重要事项前一天" : "洗头提醒：按间隔维护";
      var description = document.createElement("span");
      description.textContent = marker.relatedEvents.length
        ? "关联事项：" + marker.relatedEvents.map(function (event) { return event.title + "（" + formatDisplayDate(event.date) + "，" + importanceLabel(event.importance) + "）"; }).join("、")
        : "根据当前 " + intervalReadout() + " 生成。";
      shampooRow.appendChild(title);
      shampooRow.appendChild(description);
      els.dayDetails.appendChild(shampooRow);
    }

    events.forEach(function (event) {
      var eventRow = document.createElement("div");
      eventRow.className = "detail-row";
      var title = document.createElement("strong");
      title.textContent = event.title;
      var description = document.createElement("span");
      description.textContent = "重要等级：" + importanceLabel(event.importance);
      eventRow.appendChild(title);
      eventRow.appendChild(description);
      els.dayDetails.appendChild(eventRow);
    });
  }

  function addImportantEvent() {
    var date = els.eventDate.value;
    var title = els.eventTitle.value.trim();
    var importance = normalizeImportance(els.eventImportance.value);
    if (!isSupportedDate(date) || !title) {
      return;
    }

    state.events.push({
      id: "evt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
      date: date,
      title: title,
      importance: importance
    });
    state.events.sort(compareByDate);
    saveEvents();
    state.selectedDate = date;
    state.year = Number(date.slice(0, 4));
    state.month = Number(date.slice(5, 7));
    els.eventTitle.value = "";
    refreshCalendar();
  }

  function deleteEvent(id) {
    state.events = state.events.filter(function (event) {
      return event.id !== id;
    });
    state.contextMenuEventId = null;
    saveEvents();
    refreshCalendar();
  }

  function updateEventDate(id, date) {
    var changed = false;
    state.events.forEach(function (event) {
      if (event.id === id && isSupportedDate(date) && event.date !== date) {
        event.date = date;
        changed = true;
      }
    });
    if (!changed) {
      return;
    }
    state.events.sort(compareByDate);
    state.selectedDate = date;
    els.eventDate.value = date;
    saveEvents();
    refreshCalendar();
  }

  function updateEventImportance(id, importance) {
    var normalizedImportance = normalizeImportance(importance);
    var changed = false;
    state.events.forEach(function (event) {
      if (event.id === id && event.importance !== normalizedImportance) {
        event.importance = normalizedImportance;
        changed = true;
      }
    });
    if (!changed) {
      return;
    }
    state.events.sort(compareByDate);
    saveEvents();
    refreshCalendar();
  }

  function showEventContextMenu(id, x, y) {
    state.contextMenuEventId = id;
    syncContextMenuSelection(id);
    els.eventContextMenu.hidden = false;
    var menuWidth = els.eventContextMenu.offsetWidth || 132;
    var menuHeight = els.eventContextMenu.offsetHeight || 46;
    var left = Math.min(x, window.innerWidth - menuWidth - 8);
    var top = Math.min(y, window.innerHeight - menuHeight - 8);
    els.eventContextMenu.style.left = Math.max(8, left) + "px";
    els.eventContextMenu.style.top = Math.max(8, top) + "px";
  }

  function syncContextMenuSelection(id) {
    var selectedImportance = "normal";
    state.events.forEach(function (event) {
      if (event.id === id) {
        selectedImportance = normalizeImportance(event.importance);
      }
    });
    Array.prototype.forEach.call(els.importanceMenuItems, function (item) {
      item.classList.toggle("is-current", item.getAttribute("data-importance") === selectedImportance);
    });
  }

  function hideEventContextMenu() {
    if (!els.eventContextMenu) {
      return;
    }
    els.eventContextMenu.hidden = true;
    state.contextMenuEventId = null;
  }

  function saveEvents() {
    localStorage.setItem(EVENT_KEY, JSON.stringify(state.events));
  }

  function groupEventsByDate() {
    var map = {};
    state.events.forEach(function (event) {
      if (!map[event.date]) {
        map[event.date] = [];
      }
      map[event.date].push(event);
    });
    return map;
  }

  function groupShampooByDate() {
    var map = {};
    state.shampooDays.forEach(function (marker) {
      map[marker.date] = marker;
    });
    return map;
  }

  function eventsForDate(date) {
    return state.events.filter(function (event) {
      return event.date === date;
    }).sort(compareByDate);
  }

  function shampooForDate(date) {
    for (var i = 0; i < state.shampooDays.length; i++) {
      if (state.shampooDays[i].date === date) {
        return state.shampooDays[i];
      }
    }
    return null;
  }

  function compareByDate(left, right) {
    if (left.date === right.date) {
      var importanceCompare = importanceRank(left.importance) - importanceRank(right.importance);
      if (importanceCompare !== 0) {
        return importanceCompare;
      }
      return left.title.localeCompare(right.title, "zh-CN");
    }
    return left.date < right.date ? -1 : 1;
  }

  function buildEventBadgeText(events) {
    var topImportance = highestImportance(events);
    return events.length + " 项 · " + importanceLabel(topImportance);
  }

  function highestImportance(events) {
    var best = "low";
    events.forEach(function (event) {
      if (importanceRank(event.importance) < importanceRank(best)) {
        best = normalizeImportance(event.importance);
      }
    });
    return best;
  }

  function normalizeImportance(importance) {
    return IMPORTANCE_LABELS[importance] ? importance : "normal";
  }

  function importanceLabel(importance) {
    return IMPORTANCE_LABELS[normalizeImportance(importance)];
  }

  function importanceRank(importance) {
    return IMPORTANCE_RANKS[normalizeImportance(importance)];
  }

  function importanceClass(importance) {
    return "importance-" + normalizeImportance(importance);
  }

  function intervalReadout() {
    var minIntervalDays = Math.max(1, state.baseIntervalDays - state.minusFlexIntervalDays);
    var maxIntervalDays = state.baseIntervalDays + state.plusFlexIntervalDays;
    if (state.minusFlexIntervalDays === 0 && state.plusFlexIntervalDays === 0) {
      return "每 " + state.baseIntervalDays + " 天";
    }
    return "每 " + minIntervalDays + "-" + maxIntervalDays + " 天（" + state.baseIntervalDays + " -" + state.minusFlexIntervalDays + "/+" + state.plusFlexIntervalDays + "）";
  }

  function normalizeBaseInterval(value) {
    var interval = Number(value);
    if (!isFinite(interval) || interval < 1) {
      return 1;
    }
    if (interval > 14) {
      return 14;
    }
    return Math.floor(interval);
  }

  function normalizeFlexInterval(value) {
    var interval = Number(value);
    if (!isFinite(interval) || interval < 0) {
      return 0;
    }
    if (interval > 7) {
      return 7;
    }
    return Math.floor(interval);
  }

  function renderError(message) {
    clear(els.calendarGrid);
    var error = document.createElement("div");
    error.className = "empty-state";
    error.textContent = message;
    els.calendarGrid.appendChild(error);
  }

  function clear(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function isSupportedDate(date) {
    return typeof date === "string" && date >= MIN_DATE && date <= MAX_DATE;
  }

  function isSupportedDayNumber(dayNumber) {
    return dayNumber >= dateToDayNumber(MIN_DATE) && dayNumber <= dateToDayNumber(MAX_DATE);
  }

  function dateToDayNumber(date) {
    return Math.floor(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86400000);
  }

  function dayNumberToDate(dayNumber) {
    var date = new Date(dayNumber * 86400000);
    return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  function monthPrefix(year, month) {
    return year + "-" + pad(month);
  }

  function formatDateKey(year, month, day) {
    return year + "-" + pad(month) + "-" + pad(day);
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function formatDisplayDate(date) {
    if (!date || date.length !== 10) {
      return "日期详情";
    }
    return Number(date.slice(5, 7)) + " 月 " + Number(date.slice(8, 10)) + " 日";
  }

  function todayKey() {
    var today = new Date();
    return formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }
})();
