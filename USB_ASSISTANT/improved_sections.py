# IMPROVED CODING CATEGORY (replaces lines ~1202-1333)
# This provides better pattern matching, more helpful defaults, and specific code examples

elif category == "coding":
    # Enhanced pattern matching with specific error types and coding scenarios
    msg_lower = last_msg

    # Check for specific error patterns first (more specific = higher priority)
    if any(word in msg_lower for word in ["null", "undefined", "none", "nonetype", "nullpointer"]):
        response = """**Null/Undefined Error - Quick fix:**

This means you're trying to use something that doesn't exist or hasn't been initialized.

**JavaScript:**
```javascript
// Problem
let user = undefined;
console.log(user.name); // TypeError: Cannot read property 'name' of undefined

// Fix - Check before accessing
if (user && user.name) {
    console.log(user.name);
}
// Or use optional chaining
console.log(user?.name);
```

**Python:**
```python
# Problem
user = None
print(user.name)  # AttributeError: 'NoneType' has no attribute 'name'

# Fix
if user is not None:
    print(user.name)
```

**Quick checklist:**
1. Is the variable actually assigned before this line?
2. Check API/function returns - returning null instead of data?
3. Async timing issue - trying to use data before it loaded?
4. Add console.log/print RIGHT BEFORE the error to see actual value

Share the error line and I'll pinpoint exactly what's null."""

    elif "import" in msg_lower or ("module" in msg_lower and ("not found" in msg_lower or "error" in msg_lower)):
        response = """**Import/Module Error - Installation fix:**

**Python - "ModuleNotFoundError"**
```bash
# Install the package
pip install package-name
# Or if using Python 3 specifically
pip3 install package-name
# If above fails, try
python -m pip install package-name

# Check if installed
pip list | grep package-name
```

**JavaScript/Node - "Cannot find module"**
```bash
# Install package
npm install package-name
# Or globally for CLI tools
npm install -g package-name
```

**Common issues:**
1. **Wrong package name** - Check exact spelling on PyPI/npm
2. **Virtual environment** - Make sure you're in the right one:
   ```bash
   source venv/bin/activate  # Mac/Linux
   venv\\Scripts\\activate   # Windows
   ```
3. **Python version mismatch** - Use same python that installed it:
   ```bash
   python3 -m pip install package-name
   # Then run with python3, not python
   ```
4. **Permission denied** - Use sudo (Mac/Linux) or run as admin (Windows)

What's the exact error? Share it and I'll give you the precise command."""

    elif "syntax" in msg_lower or "invalid syntax" in msg_lower or "unexpected token" in msg_lower:
        response = """**Syntax Error - Common fixes:**

The code structure is wrong. Check these common mistakes:

**1. Missing/mismatched brackets**
```python
# Wrong - Missing closing parenthesis
def my_function(x:
    return x + 1

# Right
def my_function(x):
    return x + 1
```

**2. Missing colons (Python)**
```python
# Wrong
if x > 5
    print(x)

# Right
if x > 5:
    print(x)
```

**3. Quote mismatch**
```javascript
// Wrong - Mixed quotes
let message = "Hello World';

// Right
let message = "Hello World";
```

**4. Missing commas**
```python
# Wrong
my_list = [1, 2, 3 4, 5]  # Missing comma between 3 and 4

# Right
my_list = [1, 2, 3, 4, 5]
```

**5. Indentation (Python)**
```python
# Wrong - Not indented
def my_function():
print("Hello")

# Right - Properly indented
def my_function():
    print("Hello")
```

**Pro tip:** The error is often on the line BEFORE where it's reported. Count your brackets and check for missing commas.

Share the error line and I'll spot the issue immediately."""

    elif "error" in msg_lower or "bug" in msg_lower or "not work" in msg_lower or "doesn't work" in msg_lower or "broken" in msg_lower or "crash" in msg_lower:
        response = f"""**Debug: {last_msg[:80]}**

**Try these immediate fixes:**
1. **Read the error** - Look for line number and error type
2. **Check the line mentioned AND the line before it**
3. **Restart** - Program, terminal, computer
4. **Recent changes** - What did you add/change just before this broke?

**Common error types:**

**NameError/ReferenceError** - Variable doesn't exist
```python
# Make sure it's defined before use
x = 5      # Define first
print(x)   # Use after
```

**TypeError** - Wrong data type
```python
# Can't add string and number
age = 25
print("Age: " + str(age))  # Convert to string first
```

**IndexError** - Array out of bounds
```python
my_list = [1, 2, 3]
# Only has indexes 0-2, so accessing [5] fails
if len(my_list) > 5:
    print(my_list[5])
```

**Debugging techniques:**
1. **Print everything** - See actual values
   ```python
   print(f"x = {x}, type = {type(x)}")
   ```
2. **Comment out code** - Remove sections until error disappears
3. **Google exact error** - Copy/paste error message

Share the exact error message and the code causing it - I'll give you working code."""

    # Check for "how to" questions about specific technologies
    elif "how" in msg_lower and any(word in msg_lower for word in ["website", "web", "html", "frontend", "page", "css"]):
        response = """**Build a website - Working code:**

Create these 3 files in a folder:

**index.html**
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello World</h1>
    <p>This is my website!</p>
    <button onclick="sayHello()">Click me</button>

    <script src="script.js"></script>
</body>
</html>
```

**style.css**
```css
body {
    font-family: Arial, sans-serif;
    margin: 40px;
    background-color: #f0f0f0;
}

button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}
```

**script.js**
```javascript
function sayHello() {
    alert("Hello! You clicked the button.");
}
```

**To view:** Double-click index.html

**Next steps:**
- Learn Flexbox/Grid for layouts
- Add forms for user input
- Make it interactive with JavaScript
- Learn React/Vue for complex apps

What should your website do? I'll write the exact code."""

    elif "how" in msg_lower and any(word in msg_lower for word in ["api", "backend", "server", "endpoint", "rest"]):
        response = """**Build an API - Working code:**

**Quick Python REST API:**
```python
# Install: pip install flask
from flask import Flask, request, jsonify

app = Flask(__name__)
items = []

# GET all items
@app.route('/api/items', methods=['GET'])
def get_items():
    return jsonify(items)

# POST create item
@app.route('/api/items', methods=['POST'])
def create_item():
    data = request.get_json()
    items.append(data)
    return jsonify(data), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Run it:**
```bash
python app.py
# Test: Open browser to http://localhost:5000/api/items
```

**Test with curl:**
```bash
curl -X POST http://localhost:5000/api/items \\
  -H "Content-Type: application/json" \\
  -d '{"name":"test", "value":123}'
```

**Add database (SQLite):**
```python
# pip install flask-sqlalchemy
from flask_sqlalchemy import SQLAlchemy

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
db = SQLAlchemy(app)

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))

with app.app_context():
    db.create_all()
```

What should your API do? I'll write the specific endpoints."""

    elif "how" in msg_lower and any(word in msg_lower for word in ["game", "pygame", "graphics"]):
        response = """**Build a game - Working code:**

**Simple terminal game:**
```python
import random

number = random.randint(1, 100)
attempts = 0

print("Guess the number (1-100)!")

while True:
    guess = int(input("Your guess: "))
    attempts += 1

    if guess < number:
        print("Too low!")
    elif guess > number:
        print("Too high!")
    else:
        print(f"Correct! Took {attempts} attempts")
        break
```

**Graphical game with Pygame:**
```python
# Install: pip install pygame
import pygame

pygame.init()
screen = pygame.display.set_mode((800, 600))
clock = pygame.time.Clock()

player_x, player_y = 400, 300
player_speed = 5

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Movement
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]: player_x -= player_speed
    if keys[pygame.K_RIGHT]: player_x += player_speed
    if keys[pygame.K_UP]: player_y -= player_speed
    if keys[pygame.K_DOWN]: player_y += player_speed

    # Draw
    screen.fill((0, 0, 0))
    pygame.draw.circle(screen, (255, 0, 0), (player_x, player_y), 20)
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
```

What kind of game? I'll provide starter code."""

    elif "how" in msg_lower and any(word in msg_lower for word in ["data", "csv", "excel", "pandas", "analyze"]):
        response = """**Data analysis - Working code:**

```python
# Install: pip install pandas matplotlib
import pandas as pd
import matplotlib.pyplot as plt

# Read CSV
df = pd.read_csv('data.csv')

# Or create sample data
data = {
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'salary': [50000, 60000, 70000]
}
df = pd.DataFrame(data)

# Basic operations
print(df.head())              # First 5 rows
print(df.describe())          # Statistics
print(df['age'].mean())       # Average

# Filter
young = df[df['age'] < 30]
high_earners = df[df['salary'] > 55000]

# Group and aggregate
avg_by_dept = df.groupby('department')['salary'].mean()

# Plot
df.plot(x='name', y='salary', kind='bar')
plt.title('Salaries')
plt.show()

# Save
df.to_csv('output.csv', index=False)
```

**Clean data:**
```python
df = df.drop_duplicates()     # Remove duplicates
df = df.dropna()              # Remove missing
df = df.fillna(0)             # Replace missing with 0
```

**Excel:**
```python
df = pd.read_excel('file.xlsx')
df.to_excel('output.xlsx', index=False)
```

What data do you have? I'll write the exact analysis code."""

    elif "how" in msg_lower and any(word in msg_lower for word in ["code", "program", "create", "make", "build", "write"]):
        response = f"""**Let's code it: {last_msg[:80]}**

**Choose your tech based on goal:**

**Beginner friendly:**
- **Python** - General programming, data, automation
- **JavaScript** - Websites, web apps
- **HTML/CSS** - Web pages (not programming, but useful)

**By project type:**
- **Website/Web app** - HTML/CSS/JavaScript + React
- **Mobile app** - React Native or Flutter
- **Data analysis** - Python + Pandas
- **Game** - Python + Pygame (2D) or Unity (3D)
- **Automation** - Python
- **API/Backend** - Python Flask or Node.js

**Quick starter templates:**

**Python script:**
```python
def main():
    print("Starting...")
    # Your code here

if __name__ == "__main__":
    main()
```

**Web page:**
```html
<!DOCTYPE html>
<html>
<body>
    <h1>My App</h1>
    <script>
        // Your code here
    </script>
</body>
</html>
```

Tell me what you want to build and I'll provide complete working code. Include:
- What it should do
- Preferred language (or say "recommend one")
- Platform (web, desktop, mobile, etc.)"""

    elif "install" in msg_lower or "setup" in msg_lower or "configure" in msg_lower:
        response = f"""**Installation: {last_msg[:80]}**

**Quick command reference:**

**Python:**
```bash
# Check version
python --version
python3 --version

# Install packages
pip install package-name
pip3 install package-name

# Virtual environment (recommended)
python -m venv venv
source venv/bin/activate      # Mac/Linux
venv\\Scripts\\activate        # Windows
```

**Node.js:**
```bash
# Check version
node --version
npm --version

# Install packages
npm install package-name
npm install -g package-name   # Global

# Start new project
npm init -y
```

**Git:**
```bash
git --version
git config --global user.name "Your Name"
git config --global user.email "email@example.com"
```

**Common fixes:**

**"Command not found"**
- Not installed OR not in PATH
- Reinstall and check "Add to PATH"

**"Permission denied"**
```bash
sudo pip install package-name  # Mac/Linux
# Or run terminal as administrator (Windows)
```

**"Module not found" after installing**
- Check Python version: `python --version`
- Use: `python -m pip install package-name`
- Try `pip3` instead of `pip`

What are you trying to install? Share:
- Package/tool name
- Operating system
- Any error messages

I'll give you exact commands."""

    elif "algorithm" in msg_lower or "optimize" in msg_lower or "faster" in msg_lower or "performance" in msg_lower or "slow" in msg_lower:
        response = f"""**Optimization: {last_msg[:80]}**

**Quick wins:**

**1. Better data structures**
```python
# SLOW - List lookup: O(n)
if item in my_list:  # Checks every item
    ...

# FAST - Set lookup: O(1)
if item in my_set:  # Instant
    ...
```

**2. Avoid nested loops**
```python
# SLOW - O(n²)
for item1 in list1:
    for item2 in list2:
        if item1 == item2:
            matches.append(item1)

# FAST - O(n)
matches = set(list1).intersection(set(list2))
```

**3. Cache results**
```python
# SLOW - Recalculates same values
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)

# FAST - Cache with decorator
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)
```

**4. Break early**
```python
# SLOW - Checks everything
for item in huge_list:
    if item == target:
        found = True
# Keeps going!

# FAST - Stop when found
for item in huge_list:
    if item == target:
        return True
```

**5. Use built-ins**
```python
# SLOW
total = 0
for num in numbers:
    total += num

# FAST
total = sum(numbers)
```

**Test performance:**
```python
import time
start = time.time()
# Your code
print(f"Took {time.time() - start:.4f}s")
```

**Complexity guide:**
- O(1) - Dictionary lookup, array index
- O(log n) - Binary search
- O(n) - Single loop
- O(n log n) - Good sorting
- O(n²) - Nested loops (avoid!)

Share your slow code and I'll optimize it."""

    elif any(word in msg_lower for word in ["learn", "tutorial", "beginner", "start programming", "new to"]):
        response = """**Learn programming - Practical start:**

**Day 1 - Python basics:**
```python
# Variables
name = "Alice"
age = 25
price = 19.99

# Math
total = 10 + 5
result = total * 2
print(result)

# Lists
fruits = ["apple", "banana", "cherry"]
print(fruits[0])
fruits.append("orange")

# Loops
for fruit in fruits:
    print(fruit)

for i in range(5):
    print(i)

# If statements
if age >= 18:
    print("Adult")
else:
    print("Minor")

# Functions
def greet(name):
    return f"Hello, {name}!"

print(greet("Bob"))
```

**Week 1 project - Todo list:**
```python
todos = []

while True:
    print("\\n1. Add  2. View  3. Complete  4. Quit")
    choice = input("Choose: ")

    if choice == "1":
        todos.append(input("Task: "))
    elif choice == "2":
        for i, task in enumerate(todos, 1):
            print(f"{i}. {task}")
    elif choice == "3":
        todos.pop(int(input("Task #: ")) - 1)
    elif choice == "4":
        break
```

**Learning path:**
- Week 1-2: Variables, loops, if/else, functions, lists
- Week 3-4: Files, error handling, classes, APIs
- Month 2: Build projects (calculator, games, web scraper)
- Month 3+: Specialize (web dev, data science, automation)

**Best resources:**
- Python.org tutorials
- freeCodeCamp.org
- YouTube: Corey Schafer

**Tips:**
1. Code every day (30 min minimum)
2. Build projects, don't just watch
3. Type code yourself
4. Break things and fix them

**First projects:**
- Mad Libs generator
- Dice roller
- Password generator
- Rock paper scissors
- Simple calculator

What do you want to build eventually? I'll create a custom learning path."""

    elif any(word in msg_lower for word in ["api", "fetch", "request", "http", "json"]) and "how" not in msg_lower:
        response = """**API requests - Working examples:**

**Python:**
```python
# Install: pip install requests
import requests

# GET - Fetch data
response = requests.get('https://api.example.com/data')
if response.status_code == 200:
    data = response.json()
    print(data)

# POST - Send data
new_item = {"name": "John", "email": "john@example.com"}
response = requests.post('https://api.example.com/users', json=new_item)

# With authentication
headers = {"Authorization": "Bearer YOUR_TOKEN"}
response = requests.get('https://api.example.com/protected', headers=headers)

# URL parameters
params = {"search": "python", "limit": 10}
response = requests.get('https://api.example.com/search', params=params)
```

**JavaScript:**
```javascript
// Async/await
async function getData() {
    try {
        const response = await fetch('https://api.example.com/data');
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Error:', error);
    }
}

// POST request
async function createUser(userData) {
    const response = await fetch('https://api.example.com/users', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(userData)
    });
    return await response.json();
}
```

**Free APIs to practice:**
```python
# Weather (get free key at openweathermap.org)
response = requests.get(f'http://api.openweathermap.org/data/2.5/weather?q=London&appid={api_key}')

# Random user (no key needed)
response = requests.get('https://randomuser.me/api/')

# Dog pictures
response = requests.get('https://dog.ceo/api/breeds/image/random')
```

**Status codes:**
- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Invalid request
- 401 Unauthorized - Need auth
- 404 Not Found - Doesn't exist
- 500 Server Error - Server problem

What API are you trying to use? I'll write the exact code."""

    elif any(word in msg_lower for word in ["database", "sql", "sqlite", "mysql", "store data"]):
        response = """**Database - Quick start:**

**SQLite (easiest, no setup):**
```python
import sqlite3

# Connect
conn = sqlite3.connect('my_database.db')
cursor = conn.cursor()

# Create table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        age INTEGER
    )
''')

# Insert
cursor.execute("INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
               ("Alice", "alice@example.com", 25))
conn.commit()

# Query
cursor.execute("SELECT * FROM users")
users = cursor.fetchall()
for user in users:
    print(user)

# Filter
cursor.execute("SELECT * FROM users WHERE age > ?", (25,))

# Update
cursor.execute("UPDATE users SET age = ? WHERE name = ?", (26, "Alice"))
conn.commit()

# Delete
cursor.execute("DELETE FROM users WHERE name = ?", ("Bob",))
conn.commit()

conn.close()
```

**Using ORM (easier):**
```python
# pip install sqlalchemy
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
    age = Column(Integer)

engine = create_engine('sqlite:///my_database.db')
Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)
session = Session()

# Add
session.add(User(name="Alice", email="alice@example.com", age=25))
session.commit()

# Query
users = session.query(User).all()
older = session.query(User).filter(User.age > 25).all()
```

**Important:** Always use parameterized queries to prevent SQL injection:
```python
# GOOD
cursor.execute("SELECT * FROM users WHERE name = ?", (user_input,))

# BAD - Never do this!
cursor.execute(f"SELECT * FROM users WHERE name = '{user_input}'")
```

What do you need to store? I'll create the exact schema."""

    else:
        response = f"""**Coding help: {last_msg[:80]}**

I can help with:
- **Fix errors** - Paste error message, I'll solve it
- **Write code** - Tell me what you want, I'll code it
- **Explain code** - Share code, I'll explain
- **Optimize** - Share slow code, I'll speed it up
- **Install/setup** - Tell me what won't install
- **APIs** - Show me API docs, I'll write the code
- **Databases** - Tell me what to store
- **Debugging** - Describe the bug

**Best way to get help:**
- Be specific: "How do I read CSV in Python?"
- Share code if something's broken
- Copy/paste error messages
- Tell me what it should do

**Quick examples:**

**Read file:**
```python
with open('file.txt', 'r') as f:
    content = f.read()
```

**Write file:**
```python
with open('output.txt', 'w') as f:
    f.write("Hello")
```

**Get user input:**
```python
name = input("Your name: ")
age = int(input("Your age: "))
```

**Filter list:**
```python
numbers = [1, 2, 3, 4, 5]
evens = [n for n in numbers if n % 2 == 0]
```

What do you want to do? Tell me and I'll write working code."""


# IMPROVED GENERAL/UNCENSORED CATEGORY (replaces lines ~1335-1369)
# This provides more helpful, contextual responses instead of just asking questions

else:
    # General category or uncensored - be more helpful and provide value upfront
    msg_lower = last_msg

    # Try to infer intent and provide helpful information
    if any(word in msg_lower for word in ["how", "what", "why", "when", "where", "who"]):
        # Question detected - provide helpful context and framework
        response = f"""I can help with that. Based on your question: "{last_msg[:100]}..."

Here's what I know that might be useful:

**General approach:**
1. **Identify what you need** - Information, solution, or guidance?
2. **Consider your resources** - What do you have available?
3. **Start simple** - Basic solution first, then optimize
4. **Test and iterate** - Try it, see what happens, adjust

**Common scenarios:**

**If you're problem-solving:**
- Break it into smaller steps
- Look for similar solved problems
- Consider multiple approaches
- Start with what you know works

**If you're learning something new:**
- Start with basics, build up
- Practice with real examples
- Learn by doing, not just reading
- Don't be afraid to make mistakes

**If you're making a decision:**
- List pros and cons
- Consider short and long term
- What's the worst that could happen?
- Trust your instincts

Want me to dive deeper into a specific aspect? Or just tell me more about your situation and I'll provide targeted advice."""

    elif any(word in msg_lower for word in ["help", "advice", "suggestion", "recommend"]):
        response = f"""Let me help you with this: "{last_msg[:100]}..."

**Here's my take:**

Whatever you're working on, here are some universal principles that usually work:

**1. Start where you are**
- Don't wait for perfect conditions
- Use what you have right now
- Progress beats perfection

**2. Break it down**
- Big goals → smaller milestones
- One step at a time
- Celebrate small wins

**3. Learn as you go**
- You don't need to know everything first
- Figuring things out is part of the process
- Mistakes are data, not failures

**4. Ask better questions**
- "How can I..." instead of "Can I..."
- "What's one small step..." instead of "How do I do everything..."
- "What have others done..." to learn from experience

**5. Take action**
- Imperfect action beats perfect planning
- Test, learn, adjust
- Momentum builds confidence

**Practical next steps:**
- What's the smallest action you can take today?
- Who has done something similar that you can learn from?
- What's the biggest unknown you need to figure out?

Tell me more about what you're trying to accomplish and I'll give you more specific guidance."""

    elif any(word in msg_lower for word in ["think", "opinion", "view", "feel", "believe"]):
        response = f"""Regarding: "{last_msg[:100]}..."

**My perspective:**

There's usually no single "right" answer to most things - it depends on your situation, goals, and constraints.

**Framework for thinking through this:**

**Consider multiple angles:**
- Practical: What actually works in real life?
- Ethical: What's the right thing to do?
- Strategic: What serves your long-term goals?
- Immediate: What solves the current problem?

**Balance competing priorities:**
- Speed vs. Quality
- Cost vs. Value
- Risk vs. Reward
- Simple vs. Comprehensive

**Trust your judgment:**
- You know your situation better than anyone
- Your instincts are often right
- You can always adjust course later

**Practical wisdom:**
- Most decisions are reversible
- Waiting for perfect information means never acting
- "Good enough" often is good enough
- Learn by doing, not just thinking

**What usually works:**
- Be honest and direct
- Consider others but don't be paralyzed by opinions
- Start small, scale what works
- Focus on what you can control

Want to talk through the specific situation? Share more details and I'll give you my honest take."""

    elif any(word in msg_lower for word in ["can", "should", "would", "could", "will"]):
        response = f"""About: "{last_msg[:100]}..."

**Direct answer: Probably yes**, but it depends on specifics.

Most things people ask "can I" or "should I" about are actually possible - the real questions are:
- Is it worth the effort?
- What's the best way to do it?
- What are the trade-offs?

**Framework for deciding:**

**Can you do it?**
- Technically possible? (Usually yes)
- Do you have resources? (Usually enough to start)
- Do you have time? (You make time for priorities)

**Should you do it?**
- Aligns with your goals?
- Is now the right time?
- What's the opportunity cost?

**How to approach it:**
1. **Start small** - Test the idea before going all-in
2. **Research quickly** - 20 minutes of googling often answers most questions
3. **Talk to people** who've done it
4. **Try it** - Experimentation beats endless planning

**Practical reality:**
- You don't need permission
- You don't need perfect conditions
- You don't need to know everything first
- You just need to start

**Red flags that might mean "no":**
- Illegal or unethical
- Requires resources you truly don't have
- Conflicts with more important priorities
- Your gut is screaming "bad idea"

**Otherwise, why not try?**
- Worst case: You learn something
- Best case: It works
- Most likely: Somewhere in between

What specifically are you concerned about? I can help you think through the practical aspects."""

    else:
        # No clear question pattern - provide open-ended helpful response
        response = f"""I'm here to help with: "{last_msg[:100]}..."

**Let me offer some thoughts:**

Without more context, here's what I can share that might be useful:

**General principles that apply to most situations:**

**1. Action over overthinking**
- Start somewhere, anywhere
- You'll figure it out as you go
- Done beats perfect

**2. Seek patterns, not just answers**
- Learn principles, not just steps
- Understand why, not just how
- Apply to new situations

**3. Use available resources**
- People who've done it before
- Online communities and forums
- Documentation and guides
- Trial and error

**4. Focus on what matters**
- What's the actual goal?
- What's the minimum viable version?
- What can you skip or do later?

**Common helpful info:**

**If it's technical:**
- Break it into steps
- Test each part independently
- Google exact error messages
- Check the documentation

**If it's creative:**
- Start with existing examples
- Remix and modify
- Don't wait for inspiration
- Create first, judge later

**If it's practical:**
- What's worked for others?
- What's the simplest approach?
- What can you test quickly?
- How can you minimize risk?

**Want more specific help?** Tell me:
- What you're trying to accomplish
- What you've tried already (if anything)
- What's blocking you or confusing you
- Any constraints or requirements

I'll give you more targeted, practical guidance based on your actual situation."""
