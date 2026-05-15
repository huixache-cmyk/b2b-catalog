$git = "C:\Program Files\Git\cmd\git.exe"

& $git config --global user.name "Gerardo Rodriguez"
& $git config --global user.email "huixache@gmail.com"
& $git init
& $git add .
& $git commit -m "Init B2B Catalog with Supabase and Scraper AI"
& $git branch -M main
& $git remote remove origin
& $git remote add origin https://github.com/huixache-cmyk/b2b-catalog.git
& $git push -u origin main
