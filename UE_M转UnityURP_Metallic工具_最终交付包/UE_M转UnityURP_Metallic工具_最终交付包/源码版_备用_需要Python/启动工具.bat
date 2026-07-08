@echo off
setlocal
set "APP=%~dp0UE_M_to_Unity_URP_Metallic_Tool.pyw"
set "PYTHON_EXE="
set "PYTHONW_EXE="

echo ================================================
echo UE M Texture to Unity URP Metallic Tool
echo Checking runtime environment...
echo ================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL%==0 (
    for /f "delims=" %%P in ('where python') do (
        if not defined PYTHON_EXE set "PYTHON_EXE=%%P"
    )
)

where pythonw >nul 2>nul
if %ERRORLEVEL%==0 (
    for /f "delims=" %%P in ('where pythonw') do (
        if not defined PYTHONW_EXE set "PYTHONW_EXE=%%P"
    )
)

if not defined PYTHON_EXE (
    set "BUNDLED_PY=C:\Users\LiSuYan\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    set "BUNDLED_PYW=C:\Users\LiSuYan\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\pythonw.exe"
    if exist "%BUNDLED_PY%" (
        set "PYTHON_EXE=%BUNDLED_PY%"
        set "PYTHONW_EXE=%BUNDLED_PYW%"
    )
)

if not defined PYTHON_EXE (
    echo Python was not found.
    echo.
    echo Please install Python 3.10 or newer, then launch this tool again.
    echo Download: https://www.python.org/downloads/
    echo Important: enable "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo Python: "%PYTHON_EXE%"
echo.
echo Checking Pillow...
"%PYTHON_EXE%" -c "import PIL" >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Pillow is installed.
) else (
    echo Pillow is missing. Installing Pillow automatically...
    "%PYTHON_EXE%" -m ensurepip --upgrade
    "%PYTHON_EXE%" -m pip install --user --upgrade pillow
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo Pillow installation failed.
        echo Please check the network, or run this command manually:
        echo "%PYTHON_EXE%" -m pip install --user --upgrade pillow
        echo.
        pause
        exit /b 1
    )

    "%PYTHON_EXE%" -c "import PIL" >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo Pillow was installed but still cannot be imported.
        echo Please close this window and launch the tool again.
        echo.
        pause
        exit /b 1
    )
    echo Pillow installation completed.
)

echo.
echo Launching tool...
if defined PYTHONW_EXE (
    start "" "%PYTHONW_EXE%" "%APP%"
) else (
    start "" "%PYTHON_EXE%" "%APP%"
)
exit /b 0
