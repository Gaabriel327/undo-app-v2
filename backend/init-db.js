const db = require('./db');

const CATEGORIES = ['selbstbild', 'emotion', 'gewohnheit', 'beziehung', 'mindset', 'vision', 'zukunft'];

async function initDB() {
  await db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    birth_date TEXT,
    motive TEXT,
    chance TEXT,
    tokens INTEGER DEFAULT 10,
    streak INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    last_active TEXT,
    last_reflection_date TEXT,
    subscription TEXT DEFAULT 'free',
    pro_until TEXT,
    profile_completed INTEGER DEFAULT 0,
    language TEXT DEFAULT 'de',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK(mode IN ('morning','evening','optional')),
    question TEXT NOT NULL,
    question_id INTEGER,
    answer TEXT NOT NULL,
    feedback TEXT,
    category TEXT,
    subcategory TEXT,
    parent_id INTEGER REFERENCES reflections(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    subcategory TEXT,
    difficulty INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
    mode TEXT DEFAULT 'any' CHECK(mode IN ('morning','evening','any')),
    text TEXT UNIQUE NOT NULL,
    suggested_tips TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS user_question_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    mode TEXT,
    asked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    answered_at DATETIME,
    quality INTEGER DEFAULT 0
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS user_category_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    score REAL DEFAULT 50,
    last_seen DATETIME,
    UNIQUE(user_id, category)
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    motive TEXT,
    chance TEXT,
    last_q_text TEXT,
    last_q_day TEXT,
    last_q_mode TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS group_reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    duration_days INTEGER DEFAULT 30,
    active INTEGER DEFAULT 1,
    expires_at DATETIME,
    max_uses INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS token_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE INDEX IF NOT EXISTS idx_reflections_user ON reflections(user_id, created_at)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_uqh_user ON user_question_history(user_id, asked_at)`);

  await seedQuestions();
  console.log('Datenbank initialisiert.');
}

async function seedQuestions() {
  /*
   * Fragen konzipiert aus der Perspektive eines Psychologen
   * mit Schwerpunkt Persönlichkeitsentwicklung und humanistischer Psychologie.
   * Kategorien: Selbstbild, Emotion, Gewohnheit, Beziehung, Mindset, Vision, Zukunft
   */
  const questions = [

    // ── Selbstbild ────────────────────────────────────────────────────────
    { category: 'selbstbild', mode: 'morning', difficulty: 2,
      text: 'Welche Eigenschaft beschreibt dich heute am treffendsten — und warum hast du genau diese gewählt?' },
    { category: 'selbstbild', mode: 'morning', difficulty: 3,
      text: 'Inwiefern entspricht das Bild, das du von dir selbst hast, dem Bild, das andere von dir haben könnten?' },
    { category: 'selbstbild', mode: 'morning', difficulty: 4,
      text: 'Welcher Teil deiner Persönlichkeit wird in deinem Alltag am wenigsten gesehen — und was würde sich verändern, wenn du ihn sichtbarer machst?' },
    { category: 'selbstbild', mode: 'evening', difficulty: 3,
      text: 'Gab es heute einen Moment, in dem du nicht so gehandelt hast, wie du es von dir erwartest? Was hat dich daran gehindert?' },
    { category: 'selbstbild', mode: 'evening', difficulty: 4,
      text: 'Welches Selbstbild hat deine Entscheidungen heute am stärksten beeinflusst — bewusst oder unbewusst?' },
    { category: 'selbstbild', mode: 'any', difficulty: 4,
      text: 'Welche Geschichte über dich selbst erzählst du dir immer wieder — und welche Beweise widersprechen ihr?' },
    { category: 'selbstbild', mode: 'any', difficulty: 5,
      text: 'Wenn du deinen Kern losgelöst von deiner Rolle, deinem Beruf und deinen Beziehungen beschreiben müsstest — wer wärst du?' },

    // ── Emotion ───────────────────────────────────────────────────────────
    { category: 'emotion', mode: 'morning', difficulty: 2,
      text: 'Welches Gefühl begleitet dich in diesen Tag — und woher kommt es, wenn du einen Schritt zurücktrittst und es betrachtest?' },
    { category: 'emotion', mode: 'morning', difficulty: 3,
      text: 'Gibt es eine Emotion, die du heute lieber vermeiden würdest? Was sagt dir das über dich?' },
    { category: 'emotion', mode: 'morning', difficulty: 4,
      text: 'Welches Gefühl begegnet dir regelmässig am Morgen — und welche Funktion erfüllt es für dich?' },
    { category: 'emotion', mode: 'evening', difficulty: 3,
      text: 'Welche Emotion hat deinen Tag heute am stärksten geformt — und wie hast du auf sie reagiert?' },
    { category: 'emotion', mode: 'evening', difficulty: 4,
      text: 'Hast du heute ein Gefühl unterdrückt oder verdrängt? Was wäre passiert, wenn du es zugelassen hättest?' },
    { category: 'emotion', mode: 'evening', difficulty: 5,
      text: 'In welchem Moment heute warst du emotional am ehrlichsten — mit dir selbst, nicht mit anderen?' },
    { category: 'emotion', mode: 'any', difficulty: 4,
      text: 'Welches Gefühl meidest du chronisch — und welchen Preis zahlst du dafür im Laufe der Zeit?' },

    // ── Gewohnheit ────────────────────────────────────────────────────────
    { category: 'gewohnheit', mode: 'morning', difficulty: 2,
      text: 'Welche Routine gibt dir am Morgen das Gefühl von Kontrolle und Stabilität?' },
    { category: 'gewohnheit', mode: 'morning', difficulty: 3,
      text: 'Welche Gewohnheit möchtest du heute bewusst ausführen — und was ist der tiefere Grund, warum sie dir wichtig ist?' },
    { category: 'gewohnheit', mode: 'morning', difficulty: 4,
      text: 'Welche unbewusste Routine läuft bereits ab, bevor du deinen ersten bewussten Gedanken des Tages hast?' },
    { category: 'gewohnheit', mode: 'evening', difficulty: 3,
      text: 'Welche Gewohnheit hat dir heute geholfen — und welche hat dich von dem abgehalten, was du wirklich wolltest?' },
    { category: 'gewohnheit', mode: 'evening', difficulty: 4,
      text: 'Gab es heute einen Auslöser, der dich in ein altes Muster zurückgezogen hat? Woran hast du ihn erkannt?' },
    { category: 'gewohnheit', mode: 'any', difficulty: 4,
      text: 'Welche Gewohnheit sabotiert dein Wachstum am konstantesten — und welches Bedürfnis erfüllt sie gleichzeitig?' },
    { category: 'gewohnheit', mode: 'any', difficulty: 5,
      text: 'Wenn du eine einzige Gewohnheit einführen könntest, die alle anderen positiv beeinflusst — welche wäre das und warum?' },

    // ── Beziehung ─────────────────────────────────────────────────────────
    { category: 'beziehung', mode: 'morning', difficulty: 2,
      text: 'An welche Person denkst du heute zuerst — und was sagt dir das über diese Verbindung?' },
    { category: 'beziehung', mode: 'morning', difficulty: 3,
      text: 'Welche Beziehung in deinem Leben bekommt gerade zu wenig Aufmerksamkeit — und weshalb?' },
    { category: 'beziehung', mode: 'morning', difficulty: 4,
      text: 'Welches Muster zeigt sich in den Beziehungen, die dich im Moment am meisten herausfordern?' },
    { category: 'beziehung', mode: 'evening', difficulty: 3,
      text: 'Gab es heute eine Begegnung, die dich berührt oder beschäftigt hat? Was hat sie in dir ausgelöst?' },
    { category: 'beziehung', mode: 'evening', difficulty: 4,
      text: 'Hast du heute jemandem wirklich zugehört — ohne bereits an deine Antwort zu denken?' },
    { category: 'beziehung', mode: 'any', difficulty: 4,
      text: 'Welches Verhaltensmuster zeigst du in Konflikten — und welche Bindungserfahrung könnte dahinterstecken?' },
    { category: 'beziehung', mode: 'any', difficulty: 5,
      text: 'Was brauchst du in deinen wichtigsten Beziehungen, das du dir schwer erlaubst, offen einzufordern?' },

    // ── Mindset ───────────────────────────────────────────────────────────
    { category: 'mindset', mode: 'morning', difficulty: 2,
      text: 'Mit welcher inneren Haltung gehst du heute in den Tag — und ist das eine Wahl oder eine Gewohnheit?' },
    { category: 'mindset', mode: 'morning', difficulty: 3,
      text: 'Welcher Glaubenssatz gibt dir heute Kraft — und wie ist er entstanden?' },
    { category: 'mindset', mode: 'morning', difficulty: 4,
      text: 'Welche Überzeugung über dich selbst oder die Welt könnte dich heute einschränken, ohne dass du es merkst?' },
    { category: 'mindset', mode: 'evening', difficulty: 3,
      text: 'Wo hast du heute eine Situation durch eine bestimmte Brille gesehen — und wie hätte sie aus einer anderen Perspektive ausgesehen?' },
    { category: 'mindset', mode: 'evening', difficulty: 4,
      text: 'Welcher begrenzende Gedanke hat sich heute am lautesten gemeldet — und welche Funktion erfüllt er für dich?' },
    { category: 'mindset', mode: 'any', difficulty: 4,
      text: 'Unterscheidest du zwischen dem, was du denkst, und dem, was wirklich wahr ist? Nenne ein Beispiel aus der letzten Zeit.' },
    { category: 'mindset', mode: 'any', difficulty: 5,
      text: 'Welche deiner Überzeugungen über Misserfolg, Fehler oder Schwäche beeinflusst dein Handeln am stärksten — und woher stammt sie?' },

    // ── Vision ────────────────────────────────────────────────────────────
    { category: 'vision', mode: 'morning', difficulty: 2,
      text: 'Was gibt deinem heutigen Tag einen tieferen Sinn — jenseits der Aufgaben auf deiner Liste?' },
    { category: 'vision', mode: 'morning', difficulty: 3,
      text: 'Welcher Wert ist dir heute am wichtigsten — und wie kannst du ihn in deinen Handlungen sichtbar machen?' },
    { category: 'vision', mode: 'morning', difficulty: 4,
      text: 'Welcher Aspekt deiner Lebensvorstellung hat sich im letzten Jahr verändert — und was hat diese Veränderung ausgelöst?' },
    { category: 'vision', mode: 'evening', difficulty: 3,
      text: 'War das, wofür du heute Zeit aufgewendet hast, im Einklang mit dem, was dir wirklich wichtig ist?' },
    { category: 'vision', mode: 'evening', difficulty: 4,
      text: 'Welcher Moment heute hat dich an das erinnert, wer du werden möchtest?' },
    { category: 'vision', mode: 'any', difficulty: 4,
      text: 'Wenn du in zehn Jahren auf diesen Lebensabschnitt zurückblickst — was hoffst du, dass du in dieser Zeit erkannt oder verändert hast?' },
    { category: 'vision', mode: 'any', difficulty: 5,
      text: 'Was würdest du tun, wenn du nicht von der Meinung anderer, von Angst vor Scheitern oder von Ressourcenmangel limitiert wärst?' },

    // ── Zukunft ───────────────────────────────────────────────────────────
    { category: 'zukunft', mode: 'morning', difficulty: 2,
      text: 'Welchen einen Schritt kannst du heute machen, der in sechs Monaten einen messbaren Unterschied macht?' },
    { category: 'zukunft', mode: 'morning', difficulty: 3,
      text: 'Welche Entscheidung hast du vor dir hergeschoben — und was wäre nötig, um sie heute zu treffen?' },
    { category: 'zukunft', mode: 'morning', difficulty: 4,
      text: 'Welches Zukunftsbild motiviert dich wirklich — und welches schleppt du mit dir, weil andere es für dich entworfen haben?' },
    { category: 'zukunft', mode: 'evening', difficulty: 3,
      text: 'Was hast du heute getan, das dein zukünftiges Ich dankbar sein wird — oder was hast du unterlassen, das es bereuen könnte?' },
    { category: 'zukunft', mode: 'evening', difficulty: 4,
      text: 'Welche Entscheidung hast du heute getroffen, die über den Tag hinausreicht? War sie bewusst oder reaktiv?' },
    { category: 'zukunft', mode: 'any', difficulty: 4,
      text: 'Welche Angst vor der Zukunft kostet dich im Hier und Jetzt am meisten Energie — und wie realistisch ist sie tatsächlich?' },
    { category: 'zukunft', mode: 'any', difficulty: 5,
      text: 'Was wäre der mutighste Schritt, den du in den nächsten drei Monaten machen könntest — und was hält dich bisher davon ab?' },
  ];

  for (const q of questions) {
    await db.run(
      `INSERT OR IGNORE INTO questions (category, mode, difficulty, text) VALUES (?, ?, ?, ?)`,
      [q.category, q.mode, q.difficulty, q.text]
    );
  }
  console.log(`${questions.length} Fragen geladen.`);
}

initDB().catch(console.error);
