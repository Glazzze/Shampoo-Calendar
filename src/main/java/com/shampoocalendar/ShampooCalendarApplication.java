package com.shampoocalendar;

import com.shampoocalendar.service.CalendarDataService;
import com.shampoocalendar.service.ShampooPlanner;
import com.shampoocalendar.web.ApiHandler;
import com.shampoocalendar.web.StaticFileHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class ShampooCalendarApplication {
    public static void main(String[] args) throws IOException {
        int port = readPort(args);
        CalendarDataService calendarDataService = new CalendarDataService();
        ShampooPlanner shampooPlanner = new ShampooPlanner(calendarDataService);

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api", new ApiHandler(calendarDataService, shampooPlanner));
        server.createContext("/", new StaticFileHandler());
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();

        System.out.println("Shampoo Calendar is running at http://localhost:" + port);
        System.out.println("Press Ctrl+C to stop.");
    }

    private static int readPort(String[] args) {
        if (args != null && args.length > 0) {
            return parsePort(args[0], 8080);
        }
        String envPort = System.getenv("PORT");
        return parsePort(envPort, 8080);
    }

    private static int parsePort(String value, int fallback) {
        if (value == null || value.trim().length() == 0) {
            return fallback;
        }
        try {
            int port = Integer.parseInt(value.trim());
            if (port > 0 && port <= 65535) {
                return port;
            }
        } catch (NumberFormatException ignored) {
            // Keep the app easy to launch when PORT is absent or malformed.
        }
        return fallback;
    }
}
