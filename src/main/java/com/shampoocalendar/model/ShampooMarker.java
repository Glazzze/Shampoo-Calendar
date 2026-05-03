package com.shampoocalendar.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ShampooMarker {
    private final int dayNumber;
    private final boolean eventPreparation;
    private final List<ImportantEvent> relatedEvents;

    public ShampooMarker(int dayNumber, boolean eventPreparation, List<ImportantEvent> relatedEvents) {
        this.dayNumber = dayNumber;
        this.eventPreparation = eventPreparation;
        if (relatedEvents == null) {
            this.relatedEvents = Collections.emptyList();
        } else {
            this.relatedEvents = Collections.unmodifiableList(new ArrayList<ImportantEvent>(relatedEvents));
        }
    }

    public int getDayNumber() {
        return dayNumber;
    }

    public boolean isEventPreparation() {
        return eventPreparation;
    }

    public List<ImportantEvent> getRelatedEvents() {
        return relatedEvents;
    }
}
