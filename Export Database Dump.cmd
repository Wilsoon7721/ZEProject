@echo off

:: Configuration
set DUMP_FILE=tradeplatform.sql
set DATABASE_NAME=tradeplatform
set MYSQL_USER=root
set MYSQL_PASSWORD=root

mysqldump --hex-blob -u %MYSQL_USER% -p%MYSQL_PASSWORD% --databases %DATABASE_NAME% > %DUMP_FILE%

echo Database %DATABASE_NAME% has been exported to %DUMP_FILE%.

timeout 3 /nobreak >nul
echo Pushing to Git repository...
cd %USERPROFILE%\Desktop\ZEProject
git add -A
git commit -m "Code Modifications"
git push

timeout 5 /nobreak >nul