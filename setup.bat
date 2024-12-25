@echo off
SETLOCAL

:: Kiểm tra Python
python --version
if errorlevel 1 (
    echo Python is not installed!
    pause
    exit /b
)

:: Xóa thư mục cũ nếu tồn tại
if exist python_env rmdir /s /q python_env

:: Tạo virtual environment mới
echo Creating virtual environment...
python -m venv python_env\ai_env

:: Kích hoạt environment và cài đặt packages
echo Activating environment...
call python_env\ai_env\Scripts\activate.bat

:: Cài đặt packages
echo Installing packages...
python -m pip install --upgrade pip
pip install --no-cache-dir openai
pip install --no-cache-dir langchain
pip install --no-cache-dir langchain_community
pip install --no-cache-dir chromadb
pip install --no-cache-dir sentence-transformers
pip install --no-cache-dir torch torchvision torchaudio

:: Tạo các thư mục cần thiết
if not exist documents mkdir documents
if not exist src\ai\python mkdir src\ai\python

:: Tạo file test
echo Creating test file...
(
echo Phong gym XYZ cung cap cac dich vu:
echo - Lop yoga buoi sang: 6h-7h30
echo - Lop fitness: 8h-21h
echo - Huan luyen vien ca nhan
echo - Thiet bi hien dai
) > documents\gym_info.txt

:: Thêm PYTHON_PATH vào .env
echo Adding Python path to .env...
echo PYTHON_PATH=%cd%\python_env\ai_env\Scripts\python.exe > .env

echo Setup completed successfully!
echo Virtual environment is now activated.
echo You can start using Python packages.

ENDLOCAL
pause 