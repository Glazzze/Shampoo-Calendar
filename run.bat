@echo off
where javac >nul 2>nul
if errorlevel 1 (
  echo javac was not found. Install JDK 7 or newer and add javac to PATH.
  exit /b 1
)

for /f "delims=" %%i in ('where javac') do (
  set "JAVAC=%%i"
  goto found_javac
)
:found_javac
for %%i in ("%JAVAC%") do set "JAVA=%%~dpijava.exe"
if not exist "%JAVA%" (
  echo java.exe was not found next to javac. Check your JDK installation.
  exit /b 1
)

if not exist out mkdir out
dir /s /b src\main\java\*.java > out\sources.txt
"%JAVAC%" -encoding UTF-8 -d out @out\sources.txt
if errorlevel 1 exit /b %errorlevel%

"%JAVA%" -cp out;src\main\resources com.shampoocalendar.ShampooCalendarApplication
