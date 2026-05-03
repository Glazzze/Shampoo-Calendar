package com.shampoocalendar.util;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.TimeZone;

public final class DateUtil {
    private static final long MILLIS_PER_DAY = 24L * 60L * 60L * 1000L;
    private static final TimeZone UTC = TimeZone.getTimeZone("UTC");

    private DateUtil() {
    }

    public static int toDayNumber(int year, int month, int dayOfMonth) {
        GregorianCalendar calendar = new GregorianCalendar(UTC);
        calendar.clear();
        calendar.setLenient(false);
        calendar.set(year, month - 1, dayOfMonth);
        return (int) (calendar.getTimeInMillis() / MILLIS_PER_DAY);
    }

    public static int parseDate(String value) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException("日期格式必须是 yyyy-MM-dd");
        }
        int year = Integer.parseInt(value.substring(0, 4));
        int month = Integer.parseInt(value.substring(5, 7));
        int day = Integer.parseInt(value.substring(8, 10));
        return toDayNumber(year, month, day);
    }

    public static String formatDate(int dayNumber) {
        Calendar calendar = calendarFor(dayNumber);
        return String.format("%04d-%02d-%02d",
                Integer.valueOf(calendar.get(Calendar.YEAR)),
                Integer.valueOf(calendar.get(Calendar.MONTH) + 1),
                Integer.valueOf(calendar.get(Calendar.DAY_OF_MONTH)));
    }

    public static int getYear(int dayNumber) {
        return calendarFor(dayNumber).get(Calendar.YEAR);
    }

    public static int getMonth(int dayNumber) {
        return calendarFor(dayNumber).get(Calendar.MONTH) + 1;
    }

    public static int getDayOfMonth(int dayNumber) {
        return calendarFor(dayNumber).get(Calendar.DAY_OF_MONTH);
    }

    public static int getIsoDayOfWeek(int dayNumber) {
        int javaDay = calendarFor(dayNumber).get(Calendar.DAY_OF_WEEK);
        return javaDay == Calendar.SUNDAY ? 7 : javaDay - 1;
    }

    public static boolean isWeekend(int dayNumber) {
        int dayOfWeek = getIsoDayOfWeek(dayNumber);
        return dayOfWeek == 6 || dayOfWeek == 7;
    }

    private static Calendar calendarFor(int dayNumber) {
        GregorianCalendar calendar = new GregorianCalendar(UTC);
        calendar.clear();
        calendar.setTimeInMillis((long) dayNumber * MILLIS_PER_DAY);
        return calendar;
    }
}
