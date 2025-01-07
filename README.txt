FLEXFIT GYM MANAGEMENT SYSTEM INSTALLATION GUIDE
================================================

I. SYSTEM REQUIREMENTS
----------------------
1. Node.js (v16 or higher)
2. Python (v3.8 or higher)
3. MySQL Server
4. Chrome Browser (for web crawler)
5. Git

II. INSTALLATION
----------------

- Extract the source code from the provided archive.

1. Install Node.js dependencies:
npm install

2. Set up Python environment:
- Run setup.bat to automatically set up the Python environment and required libraries
- Or manually install Python libraries:
pip install openai langchain langchain_community chromadb sentence-transformers torch torchvision torchaudio selenium

3. Configure the database:
- Create a new MySQL database
- Copy .env.example to .env
- Update database connection information in the .env file:
DATABASE_URL="mysql://username:password@localhost:3306/database_name"

4. Initialize the database:
npx prisma generate
npx prisma db push

III. RUNNING THE APPLICATION
----------------------------

1. Start the server:
# Development mode
npm run start:dev

# Production mode 
npm run start:prod

2. Access the application:
- Frontend: http://localhost:3000
- API Documentation: http://localhost:3000/api

IV. NOTES
--------
1. Ensure Chrome Browser is installed for the web crawler feature
2. The .env file must be fully configured with environment variables
3. The documents/ directory should contain data for the chatbot
4. The Python virtual environment will be created in the python_env/ directory

V. TROUBLESHOOTING
-------------------
1. Database connection error:
- Check connection information in .env
- Ensure MySQL Server is running

2. Python error:
- Rerun setup.bat
- Check PYTHON_PATH in .env

3. Web crawler error:
- Install Chrome Browser
- Update Chrome Driver if necessary

