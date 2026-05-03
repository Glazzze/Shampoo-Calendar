package com.shampoocalendar.web;

import com.shampoocalendar.model.ImportantEvent;
import com.shampoocalendar.model.ImportanceLevel;
import com.shampoocalendar.model.ShampooMarker;
import com.shampoocalendar.service.CalendarDataService;
import com.shampoocalendar.service.ShampooPlanner;
import com.shampoocalendar.util.DateUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ApiHandler implements HttpHandler {
    private final CalendarDataService calendarDataService;
    private final ShampooPlanner shampooPlanner;

    public ApiHandler(CalendarDataService calendarDataService, ShampooPlanner shampooPlanner) {
        this.calendarDataService = calendarDataService;
        this.shampooPlanner = shampooPlanner;
    }

    public void handle(HttpExchange exchange) throws IOException {
        try {
            String path = exchange.getRequestURI().getPath();
            if ("/api/health".equals(path)) {
                sendJson(exchange, 200, "{\"status\":\"ok\"}");
                return;
            }
            if ("/api/dates".equals(path) && "GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                handleDates(exchange);
                return;
            }
            if ("/api/plan".equals(path) && "POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                handlePlan(exchange);
                return;
            }
            sendJson(exchange, 404, "{\"error\":\"接口不存在\"}");
        } catch (IllegalArgumentException ex) {
            sendJson(exchange, 400, "{\"error\":\"" + JsonUtil.escape(ex.getMessage()) + "\"}");
        } catch (Exception ex) {
            sendJson(exchange, 500, "{\"error\":\"服务器处理失败\"}");
        } finally {
            exchange.close();
        }
    }

    private void handleDates(HttpExchange exchange) throws IOException {
        Map<String, String> query = parseForm(exchange.getRequestURI().getRawQuery());
        int year = parseInt(query.get("year"), CalendarDataService.START_YEAR);
        int month = parseInt(query.get("month"), 1);
        if (!calendarDataService.isSupportedYearMonth(year, month)) {
            throw new IllegalArgumentException("日期范围仅支持 2026-2036 年");
        }

        StringBuilder json = new StringBuilder();
        json.append("{\"year\":").append(year)
                .append(",\"month\":").append(month)
                .append(",\"days\":[");
        List<Integer> days = calendarDataService.getMonthDays(year, month);
        for (int i = 0; i < days.size(); i++) {
            int day = days.get(i).intValue();
            if (i > 0) {
                json.append(',');
            }
            json.append("{\"date\":\"").append(DateUtil.formatDate(day)).append("\"")
                    .append(",\"day\":").append(DateUtil.getDayOfMonth(day))
                    .append(",\"dayOfWeek\":").append(DateUtil.getIsoDayOfWeek(day))
                    .append(",\"weekend\":").append(DateUtil.isWeekend(day))
                    .append('}');
        }
        json.append("]}");
        sendJson(exchange, 200, json.toString());
    }

    private void handlePlan(HttpExchange exchange) throws IOException {
        String body = readBody(exchange.getRequestBody());
        Map<String, String> form = parseForm(body);
        int legacyIntervalDays = parseInt(form.get("intervalDays"), 3);
        int baseIntervalDays = shampooPlanner.normalizeBaseInterval(parseInt(form.get("baseIntervalDays"), legacyIntervalDays));
        int minusFlexIntervalDays = shampooPlanner.normalizeFlexInterval(parseInt(form.get("minusFlexIntervalDays"), 0));
        int plusFlexIntervalDays = shampooPlanner.normalizeFlexInterval(parseInt(form.get("plusFlexIntervalDays"), parseInt(form.get("flexIntervalDays"), 0)));
        int minIntervalDays = Math.max(1, baseIntervalDays - minusFlexIntervalDays);
        int maxIntervalDays = baseIntervalDays + plusFlexIntervalDays;
        List<ImportantEvent> events = parseEvents(form.get("events"));
        List<ShampooMarker> markers = shampooPlanner.plan(events, baseIntervalDays, minusFlexIntervalDays, plusFlexIntervalDays);

        StringBuilder json = new StringBuilder();
        json.append("{\"range\":{\"start\":\"")
                .append(DateUtil.formatDate(calendarDataService.getStartDayNumber()))
                .append("\",\"end\":\"")
                .append(DateUtil.formatDate(calendarDataService.getEndDayNumber()))
                .append("\"},\"baseIntervalDays\":")
                .append(baseIntervalDays)
                .append(",\"minusFlexIntervalDays\":")
                .append(minusFlexIntervalDays)
                .append(",\"plusFlexIntervalDays\":")
                .append(plusFlexIntervalDays)
                .append(",\"flexIntervalDays\":")
                .append(plusFlexIntervalDays)
                .append(",\"minIntervalDays\":")
                .append(minIntervalDays)
                .append(",\"maxIntervalDays\":")
                .append(maxIntervalDays)
                .append(",\"intervalDays\":")
                .append(baseIntervalDays)
                .append(",\"shampooDays\":[");

        for (int i = 0; i < markers.size(); i++) {
            ShampooMarker marker = markers.get(i);
            if (i > 0) {
                json.append(',');
            }
            appendMarker(json, marker);
        }
        json.append("]}");
        sendJson(exchange, 200, json.toString());
    }

    private void appendMarker(StringBuilder json, ShampooMarker marker) {
        json.append("{\"date\":\"").append(DateUtil.formatDate(marker.getDayNumber())).append("\"")
                .append(",\"type\":\"").append(marker.isEventPreparation() ? "event-prep" : "routine").append("\"")
                .append(",\"label\":\"").append(marker.isEventPreparation() ? "重要事项前一天" : "间隔维护").append("\"")
                .append(",\"relatedEvents\":[");
        List<ImportantEvent> relatedEvents = marker.getRelatedEvents();
        for (int i = 0; i < relatedEvents.size(); i++) {
            ImportantEvent event = relatedEvents.get(i);
            if (i > 0) {
                json.append(',');
            }
            json.append("{\"date\":\"").append(DateUtil.formatDate(event.getDayNumber())).append("\"")
                    .append(",\"importance\":\"").append(event.getImportanceLevel().getCode()).append("\"")
                    .append(",\"importanceLabel\":\"").append(event.getImportanceLevel().getLabel()).append("\"")
                    .append(",\"title\":\"").append(JsonUtil.escape(event.getTitle())).append("\"}");
        }
        json.append("]}");
    }

    private List<ImportantEvent> parseEvents(String value) {
        List<ImportantEvent> events = new ArrayList<ImportantEvent>();
        if (value == null || value.trim().length() == 0) {
            return events;
        }
        String[] lines = value.split("\\r?\\n");
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.length() == 0) {
                continue;
            }
            int firstSeparator = line.indexOf('|');
            int secondSeparator = firstSeparator >= 0 ? line.indexOf('|', firstSeparator + 1) : -1;
            String dateText = firstSeparator >= 0 ? line.substring(0, firstSeparator) : line;
            ImportanceLevel importanceLevel = ImportanceLevel.NORMAL;
            String title = "重要事项";

            if (firstSeparator >= 0 && secondSeparator >= 0) {
                importanceLevel = ImportanceLevel.fromCode(line.substring(firstSeparator + 1, secondSeparator));
                title = line.substring(secondSeparator + 1);
            } else if (firstSeparator >= 0) {
                title = line.substring(firstSeparator + 1);
            }

            int dayNumber = DateUtil.parseDate(dateText.trim());
            if (calendarDataService.isSupportedDay(dayNumber)) {
                events.add(new ImportantEvent(dayNumber, title, importanceLevel));
            }
        }
        return events;
    }

    private Map<String, String> parseForm(String form) throws IOException {
        Map<String, String> values = new LinkedHashMap<String, String>();
        if (form == null || form.length() == 0) {
            return values;
        }
        String[] pairs = form.split("&");
        for (int i = 0; i < pairs.length; i++) {
            String pair = pairs[i];
            int separator = pair.indexOf('=');
            String rawKey = separator >= 0 ? pair.substring(0, separator) : pair;
            String rawValue = separator >= 0 ? pair.substring(separator + 1) : "";
            String key = URLDecoder.decode(rawKey, "UTF-8");
            String value = URLDecoder.decode(rawValue, "UTF-8");
            values.put(key, value);
        }
        return values;
    }

    private int parseInt(String value, int fallback) {
        if (value == null || value.trim().length() == 0) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private String readBody(InputStream inputStream) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int length;
        while ((length = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, length);
        }
        return new String(outputStream.toByteArray(), "UTF-8");
    }

    private void sendJson(HttpExchange exchange, int statusCode, String json) throws IOException {
        byte[] bytes = json.getBytes("UTF-8");
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        exchange.getResponseBody().write(bytes);
    }
}
