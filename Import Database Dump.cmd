@echo off

:: Configuration
set DUMP_FILE=tradeplatform.sql
set DATABASE_NAME=tradeplatform
set MYSQL_USER=root
set MYSQL_PASSWORD=root

cd %USERPROFILE%\Desktop\ZEProject
git pull

mysql -u %MYSQL_USER% -p%MYSQL_PASSWORD% -e "DROP DATABASE IF EXISTS %DATABASE_NAME%;"
mysql -u %MYSQL_USER% -p%MYSQL_PASSWORD% -e "CREATE DATABASE %DATABASE_NAME%;"

mysql -u %MYSQL_USER% -p%MYSQL_PASSWORD% %DATABASE_NAME% < %DUMP_FILE%

echo Database %DATABASE_NAME% has been re-imported with the latest dump file.
timeout 3 /nobreak >nul