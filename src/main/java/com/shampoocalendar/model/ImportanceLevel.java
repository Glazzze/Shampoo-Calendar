package com.shampoocalendar.model;

public enum ImportanceLevel {
    VERY_IMPORTANT("very-important", "非常重要", 1),
    NORMAL("normal", "一般", 2),
    LOW("low", "不太重要", 3);

    private final String code;
    private final String label;
    private final int rank;

    ImportanceLevel(String code, String label, int rank) {
        this.code = code;
        this.label = label;
        this.rank = rank;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public int getRank() {
        return rank;
    }

    public static ImportanceLevel fromCode(String code) {
        if (code == null) {
            return NORMAL;
        }
        for (ImportanceLevel level : values()) {
            if (level.code.equalsIgnoreCase(code.trim())) {
                return level;
            }
        }
        return NORMAL;
    }
}
