package com.shampoocalendar.service;

import com.shampoocalendar.util.DateUtil;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

public class CalendarDataService {
    public static final int START_YEAR = 2026;
    public static final int END_YEAR = 2036;

    private final int startDayNumber;
    private final int endDayNumber;

    public CalendarDataService() {
        Properties properties = loadDateRangeProperties();
        this.startDayNumber = DateUtil.parseDate(properties.getProperty("start", "2026-01-01"));
        this.endDayNumber = DateUtil.parseDate(properties.getProperty("end", "2036-12-31"));
        if (this.startDayNumber > this.endDayNumber) {
            throw new IllegalArgumentException("日期数据范围配置错误");
        }
    }

    public int getStartDayNumber() {
        return startDayNumber;
    }

    public int getEndDayNumber() {
        return endDayNumber;
    }

    public boolean isSupportedDay(int dayNumber) {
        return dayNumber >= startDayNumber && dayNumber <= endDayNumber;
    }

    public boolean isSupportedYearMonth(int year, int month) {
        return year >= START_YEAR && year <= END_YEAR && month >= 1 && month <= 12;
    }

    public List<Integer> getMonthDays(int year, int month) {
        List<Integer> days = new ArrayList<Integer>();
        if (!isSupportedYearMonth(year, month)) {
            return days;
        }
        int day = DateUtil.toDayNumber(year, month, 1);
        while (DateUtil.getYear(day) == year && DateUtil.getMonth(day) == month) {
            days.add(Integer.valueOf(day));
            day++;
        }
        return days;
    }

    private Properties loadDateRangeProperties() {
        Properties properties = new Properties();
        InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream("data/date-range.properties");
        if (inputStream == null) {
            return properties;
        }
        try {
            properties.load(inputStream);
        } catch (IOException ignored) {
            // Fallback defaults keep the application usable if the resource cannot be read.
        } finally {
            try {
                inputStream.close();
            } catch (IOException ignored) {
            }
        }
        return properties;
    }
}
