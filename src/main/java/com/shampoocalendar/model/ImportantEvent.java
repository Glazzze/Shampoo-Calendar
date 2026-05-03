package com.shampoocalendar.model;

public class ImportantEvent implements Comparable<ImportantEvent> {
    private final int dayNumber;
    private final String title;
    private final ImportanceLevel importanceLevel;

    public ImportantEvent(int dayNumber, String title) {
        this(dayNumber, title, ImportanceLevel.NORMAL);
    }

    public ImportantEvent(int dayNumber, String title, ImportanceLevel importanceLevel) {
        this.dayNumber = dayNumber;
        this.title = title == null || title.trim().length() == 0 ? "重要事项" : title.trim();
        this.importanceLevel = importanceLevel == null ? ImportanceLevel.NORMAL : importanceLevel;
    }

    public int getDayNumber() {
        return dayNumber;
    }

    public String getTitle() {
        return title;
    }

    public ImportanceLevel getImportanceLevel() {
        return importanceLevel;
    }

    public int compareTo(ImportantEvent other) {
        int dateCompare = this.dayNumber - other.dayNumber;
        if (dateCompare != 0) {
            return dateCompare;
        }
        int importanceCompare = this.importanceLevel.getRank() - other.importanceLevel.getRank();
        if (importanceCompare != 0) {
            return importanceCompare;
        }
        return this.title.compareTo(other.title);
    }
}
