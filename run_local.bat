@echo off
REM Script para rodar Gerador de Laudos localmente (Windows)
REM 
REM Uso:
REM   run_local.bat streamlit    - Usa Streamlit
REM   run_local.bat flask        - Usa Flask
REM   run_local.bat test         - Testa conexão
REM   run_local.bat              - Menu interativo

setlocal enabledelayedexpansion

REM Configurações
set PROJECT_DIR=C:\Users\%USERNAME%\gestao_clinica
set VENV_PATH=%PROJECT_DIR%\.venv

REM Cores (usando simbolos)
set "GREEN=[32m"
set "RED=[31m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "RESET=[0m"

:main
cls
echo.
echo =====================================================================
echo                 GERADOR DE LAUDOS - Menu Local
echo =====================================================================
echo.

if not exist "%VENV_PATH%" (
    echo %RED%ERRO: Ambiente virtual nao encontrado em %VENV_PATH%%RESET%
    echo.
    pause
    exit /b 1
)

if "%1"=="" (
    echo Escolha uma opcao:
    echo.
    echo   1) Streamlit (http://localhost:8501)
    echo   2) Flask (http://localhost:5000)
    echo   3) Testar Conexao
    echo   4) Ver Documentacao
    echo   5) Sair
    echo.
    set /p choice="Opcao (1-5): "
) else (
    set choice=%1
)

if "%choice%"=="1" (
    call :run_streamlit
) else if "%choice%"=="2" (
    call :run_flask
) else if "%choice%"=="3" (
    call :test_connection
) else if "%choice%"=="4" (
    call :show_docs
) else if "%choice%"=="5" (
    exit /b 0
) else if "%choice%"=="streamlit" (
    call :run_streamlit
) else if "%choice%"=="flask" (
    call :run_flask
) else if "%choice%"=="test" (
    call :test_connection
) else (
    echo.
    echo %RED%Opcao invalida!%RESET%
    echo.
    pause
    goto main
)

goto end

:run_streamlit
cls
echo.
echo =====================================================================
echo                    Iniciando Streamlit
echo =====================================================================
echo.
echo Ativando ambiente virtual...
call "%VENV_PATH%\Scripts\activate.bat"

echo.
echo Verificando se Streamlit esta instalado...
pip show streamlit >nul 2>&1
if errorlevel 1 (
    echo Instalando Streamlit...
    pip install streamlit
)

echo.
echo %GREEN%Iniciando app_laudos_local.py%RESET%
echo %BLUE%Acesse: http://localhost:8501%RESET%
echo %BLUE%Pressione CTRL+C para parar%RESET%
echo.

cd /d "%PROJECT_DIR%"
streamlit run app_laudos_local.py

goto end

:run_flask
cls
echo.
echo =====================================================================
echo                      Iniciando Flask
echo =====================================================================
echo.
echo Ativando ambiente virtual...
call "%VENV_PATH%\Scripts\activate.bat"

echo.
echo Verificando se Flask esta instalado...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Instalando Flask...
    pip install flask
)

echo.
echo %GREEN%Iniciando api_laudos_local.py%RESET%
echo %BLUE%Acesse: http://localhost:5000%RESET%
echo %BLUE%Pressione CTRL+C para parar%RESET%
echo.

cd /d "%PROJECT_DIR%"
python api_laudos_local.py

goto end

:test_connection
cls
echo.
echo =====================================================================
echo                  Testando Conexao
echo =====================================================================
echo.
echo Ativando ambiente virtual...
call "%VENV_PATH%\Scripts\activate.bat"

echo.
echo Testando Google Docs API...
cd /d "%PROJECT_DIR%"

python -c "from services.google_docs_api import get_google_docs_api; api = get_google_docs_api(); print('[OK] Google Docs API conectado')" 2>nul
if errorlevel 1 (
    echo %RED%[ERRO] Falha ao conectar Google Docs API%RESET%
    echo.
    echo Verifique:
    echo - Se credentials.json existe
    echo - Se .env esta configurado corretamente
    echo - Se Google Docs API esta habilitada
) else (
    echo %GREEN%[OK] Tudo funcionando corretamente!%RESET%
)

echo.
pause
goto main

:show_docs
cls
echo.
echo =====================================================================
echo                      Documentacao
echo =====================================================================
echo.
echo Arquivos disponíveis:
echo - LOCALHOST_README.md
echo - GOOGLE_DOCS_SETUP.md
echo - examples/exemplo_laudos.py
echo.
pause
goto main

:end
