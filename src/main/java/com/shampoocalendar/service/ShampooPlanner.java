package com.shampoocalendar.service;

import com.shampoocalendar.model.ImportantEvent;
import com.shampoocalendar.model.ImportanceLevel;
import com.shampoocalendar.model.ShampooMarker;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

public class ShampooPlanner {
    private static final int MIN_INTERVAL = 1;
    private static final int MAX_BASE_INTERVAL = 14;
    private static final int MIN_FLEX_INTERVAL = 0;
    private static final int MAX_FLEX_INTERVAL = 7;

    private final CalendarDataService calendarDataService;

    public ShampooPlanner(CalendarDataService calendarDataService) {
        this.calendarDataService = calendarDataService;
    }

    public List<ShampooMarker> plan(List<ImportantEvent> events, int requestedIntervalDays) {
        return plan(events, requestedIntervalDays, 0, 0);
    }

    public List<ShampooMarker> plan(List<ImportantEvent> events, int requestedBaseIntervalDays, int requestedFlexIntervalDays) {
        return plan(events, requestedBaseIntervalDays, 0, requestedFlexIntervalDays);
    }

    public List<ShampooMarker> plan(List<ImportantEvent> events,
                                    int requestedBaseIntervalDays,
                                    int requestedMinusFlexIntervalDays,
                                    int requestedPlusFlexIntervalDays) {
        int baseIntervalDays = normalizeBaseInterval(requestedBaseIntervalDays);
        int minusFlexIntervalDays = normalizeFlexInterval(requestedMinusFlexIntervalDays);
        int plusFlexIntervalDays = normalizeFlexInterval(requestedPlusFlexIntervalDays);
        int minIntervalDays = Math.max(MIN_INTERVAL, baseIntervalDays - minusFlexIntervalDays);
        int maxIntervalDays = baseIntervalDays + plusFlexIntervalDays;
        Map<Integer, List<ImportantEvent>> eventsByPreparationDay = buildPreparationMap(events);
        TreeSet<Integer> anchorDays = selectPriorityAnchors(eventsByPreparationDay, minIntervalDays);
        TreeSet<Integer> shampooDays = new TreeSet<Integer>();

        if (anchorDays.isEmpty()) {
            addRoutineDays(shampooDays, calendarDataService.getStartDayNumber(), calendarDataService.getEndDayNumber(), baseIntervalDays);
        } else {
            addAnchoredPlan(shampooDays, anchorDays, baseIntervalDays, minIntervalDays, maxIntervalDays);
        }

        List<ShampooMarker> markers = new ArrayList<ShampooMarker>();
        for (Integer day : shampooDays) {
            List<ImportantEvent> relatedEvents = eventsByPreparationDay.get(day);
            markers.add(new ShampooMarker(day.intValue(), relatedEvents != null, relatedEvents));
        }
        Collections.sort(markers, new Comparator<ShampooMarker>() {
            public int compare(ShampooMarker left, ShampooMarker right) {
                return left.getDayNumber() - right.getDayNumber();
            }
        });
        return markers;
    }

    public int normalizeInterval(int requestedIntervalDays) {
        return normalizeBaseInterval(requestedIntervalDays);
    }

    public int normalizeBaseInterval(int requestedBaseIntervalDays) {
        if (requestedBaseIntervalDays < MIN_INTERVAL) {
            return MIN_INTERVAL;
        }
        if (requestedBaseIntervalDays > MAX_BASE_INTERVAL) {
            return MAX_BASE_INTERVAL;
        }
        return requestedBaseIntervalDays;
    }

    public int normalizeFlexInterval(int requestedFlexIntervalDays) {
        if (requestedFlexIntervalDays < MIN_FLEX_INTERVAL) {
            return MIN_FLEX_INTERVAL;
        }
        if (requestedFlexIntervalDays > MAX_FLEX_INTERVAL) {
            return MAX_FLEX_INTERVAL;
        }
        return requestedFlexIntervalDays;
    }

    private Map<Integer, List<ImportantEvent>> buildPreparationMap(List<ImportantEvent> events) {
        Map<Integer, List<ImportantEvent>> eventsByPreparationDay = new HashMap<Integer, List<ImportantEvent>>();
        if (events == null) {
            return eventsByPreparationDay;
        }

        for (ImportantEvent event : events) {
            if (event == null || !calendarDataService.isSupportedDay(event.getDayNumber())) {
                continue;
            }
            int preparationDay = event.getDayNumber() - 1;
            if (!calendarDataService.isSupportedDay(preparationDay)) {
                continue;
            }
            Integer key = Integer.valueOf(preparationDay);
            List<ImportantEvent> relatedEvents = eventsByPreparationDay.get(key);
            if (relatedEvents == null) {
                relatedEvents = new ArrayList<ImportantEvent>();
                eventsByPreparationDay.put(key, relatedEvents);
            }
            relatedEvents.add(event);
        }

        for (List<ImportantEvent> relatedEvents : eventsByPreparationDay.values()) {
            Collections.sort(relatedEvents);
        }
        return eventsByPreparationDay;
    }

    private TreeSet<Integer> selectPriorityAnchors(Map<Integer, List<ImportantEvent>> eventsByPreparationDay, int intervalDays) {
        TreeSet<Integer> selectedAnchors = new TreeSet<Integer>();
        addAnchorsByImportance(selectedAnchors, eventsByPreparationDay, ImportanceLevel.VERY_IMPORTANT, intervalDays);
        addAnchorsByImportance(selectedAnchors, eventsByPreparationDay, ImportanceLevel.NORMAL, intervalDays);
        addAnchorsByImportance(selectedAnchors, eventsByPreparationDay, ImportanceLevel.LOW, intervalDays);
        return selectedAnchors;
    }

    private void addAnchorsByImportance(TreeSet<Integer> selectedAnchors,
                                        Map<Integer, List<ImportantEvent>> eventsByPreparationDay,
                                        ImportanceLevel targetLevel,
                                        int minIntervalDays) {
        TreeSet<Integer> candidateDays = new TreeSet<Integer>(eventsByPreparationDay.keySet());
        for (Integer day : candidateDays) {
            if (!hasImportance(eventsByPreparationDay.get(day), targetLevel)) {
                continue;
            }
            if (keepsDistanceFromSelected(day.intValue(), selectedAnchors, minIntervalDays)) {
                selectedAnchors.add(day);
            }
        }
    }

    private boolean hasImportance(List<ImportantEvent> events, ImportanceLevel targetLevel) {
        if (events == null) {
            return false;
        }
        for (ImportantEvent event : events) {
            if (event.getImportanceLevel() == targetLevel) {
                return true;
            }
        }
        return false;
    }

    private boolean keepsDistanceFromSelected(int day, TreeSet<Integer> selectedAnchors, int minIntervalDays) {
        Integer previous = selectedAnchors.floor(Integer.valueOf(day));
        if (previous != null && day - previous.intValue() < minIntervalDays) {
            return false;
        }
        Integer next = selectedAnchors.ceiling(Integer.valueOf(day));
        if (next != null && next.intValue() - day < minIntervalDays) {
            return false;
        }
        return true;
    }

    private void addRoutineDays(TreeSet<Integer> shampooDays, int startDay, int endDay, int intervalDays) {
        for (int day = startDay; day <= endDay; day += intervalDays) {
            shampooDays.add(Integer.valueOf(day));
        }
    }

    private void addAnchoredPlan(TreeSet<Integer> shampooDays,
                                 TreeSet<Integer> anchorDays,
                                 int baseIntervalDays,
                                 int minIntervalDays,
                                 int maxIntervalDays) {
        int startDay = calendarDataService.getStartDayNumber();
        int endDay = calendarDataService.getEndDayNumber();
        int firstAnchor = anchorDays.first().intValue();

        for (int day = firstAnchor; day >= startDay; day -= baseIntervalDays) {
            shampooDays.add(Integer.valueOf(day));
        }

        Integer previousAnchor = null;
        for (Integer anchorDay : anchorDays) {
            shampooDays.add(anchorDay);
            if (previousAnchor != null) {
                addIntervalDaysBetween(shampooDays, previousAnchor.intValue(), anchorDay.intValue(), baseIntervalDays, minIntervalDays, maxIntervalDays);
            }
            previousAnchor = anchorDay;
        }

        int lastAnchor = anchorDays.last().intValue();
        for (int day = lastAnchor + baseIntervalDays; day <= endDay; day += baseIntervalDays) {
            shampooDays.add(Integer.valueOf(day));
        }
    }

    private void addIntervalDaysBetween(TreeSet<Integer> shampooDays,
                                        int previousDay,
                                        int nextDay,
                                        int baseIntervalDays,
                                        int minIntervalDays,
                                        int maxIntervalDays) {
        int gap = nextDay - previousDay;
        if (gap <= maxIntervalDays) {
            return;
        }

        int segments = chooseSegmentCount(gap, baseIntervalDays, minIntervalDays, maxIntervalDays);
        if (segments <= 1) {
            addBaseSteppedDaysBetween(shampooDays, previousDay, nextDay, baseIntervalDays);
            return;
        }

        int[] intervalLengths = buildIntervalLengths(gap, segments, baseIntervalDays, minIntervalDays, maxIntervalDays);
        int currentDay = previousDay;
        for (int i = 0; i < intervalLengths.length - 1; i++) {
            currentDay += intervalLengths[i];
            if (currentDay > previousDay && currentDay < nextDay) {
                shampooDays.add(Integer.valueOf(currentDay));
            }
        }
    }

    private void addBaseSteppedDaysBetween(TreeSet<Integer> shampooDays, int previousDay, int nextDay, int baseIntervalDays) {
        for (int day = previousDay + baseIntervalDays; day < nextDay; day += baseIntervalDays) {
            shampooDays.add(Integer.valueOf(day));
        }
    }

    private int chooseSegmentCount(int gap, int baseIntervalDays, int minIntervalDays, int maxIntervalDays) {
        int minSegments = (gap + maxIntervalDays - 1) / maxIntervalDays;
        int maxSegments = gap / minIntervalDays;
        int bestSegments = -1;
        int bestAdjustedSegments = Integer.MAX_VALUE;
        int bestDeviation = Integer.MAX_VALUE;
        int bestDirection = -1;

        for (int segments = minSegments; segments <= maxSegments; segments++) {
            int diff = gap - (segments * baseIntervalDays);
            int capacity = diff >= 0 ? maxIntervalDays - baseIntervalDays : baseIntervalDays - minIntervalDays;
            if (diff != 0 && capacity == 0) {
                continue;
            }
            int deviation = Math.abs(diff);
            int adjustedSegments = capacity == 0 ? 0 : (deviation + capacity - 1) / capacity;
            int direction = diff >= 0 ? 1 : 0;
            if (adjustedSegments < bestAdjustedSegments
                    || (adjustedSegments == bestAdjustedSegments && deviation < bestDeviation)
                    || (adjustedSegments == bestAdjustedSegments && deviation == bestDeviation && direction > bestDirection)) {
                bestSegments = segments;
                bestAdjustedSegments = adjustedSegments;
                bestDeviation = deviation;
                bestDirection = direction;
            }
        }

        return bestSegments;
    }

    private int[] buildIntervalLengths(int gap, int segments, int baseIntervalDays, int minIntervalDays, int maxIntervalDays) {
        int[] intervalLengths = new int[segments];
        for (int i = 0; i < intervalLengths.length; i++) {
            intervalLengths[i] = baseIntervalDays;
        }

        int extraDays = gap - (segments * baseIntervalDays);
        int direction = extraDays >= 0 ? 1 : -1;
        int remaining = Math.abs(extraDays);
        int index = 0;
        while (remaining > 0 && index < intervalLengths.length * MAX_FLEX_INTERVAL) {
            int intervalIndex = index % intervalLengths.length;
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
}
