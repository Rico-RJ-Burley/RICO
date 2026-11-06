# Web Servers — IT 3203 Project (Rico Burley)

A static research website about web servers, built with HTML and one CSS file.
Class project for IT 3203 at Kennesaw State University: https://ksuweb.github.io/IT3203/

## Pages
- `index.html` – homepage (title, abstract, key terms, table of contents)
- `basics.html`, `history.html`, `software.html`, `security.html` – topic pages
- `concepts.html` – 10 key concepts
- `quiz.html` – 10-question timed self-assessment quiz (Milestone 2)
- `references.html` – references and learning resources
- `about.html` – about me and the project
- `css/styles.css` – the single stylesheet
- `js/quiz.js` – quiz timer, grading, results and reset
- `images/` – SVG images used on the pages

## Deploy to GitHub Pages
1. Create a new public repository (for example `web-servers`).
2. Upload everything in this folder to the repository root (index.html must be at the top level).
3. Go to Settings > Pages, set Source to "Deploy from a branch", branch `main`, folder `/ (root)`, and Save.
4. The site will appear at `https://<your-username>.github.io/web-servers/`.

## Milestone 2: the quiz
- 10 questions: 3 fill-in-the-blank, 4 multiple choice (radio), 2 select-all (checkbox), 1 drop-down
- Press **Start quiz** to begin a 10-minute countdown; the quiz submits itself at 0:00
- On submit: pass/fail (70+ passes), total score, a row per question with your answer and the correct one, and time spent
- **Reset quiz** clears every answer and result
