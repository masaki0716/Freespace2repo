


const express = require("express");
const path = require("path");
const { createThemeTable, pool, createTheme, getThemes, insertWord } = require("./db/db"); // db.js からインポート
const { OpenAI } = require("openai");
require("dotenv").config(); // .env から API キーを読み込む

const app = express();
const PORT = process.env.PORT || 8080;


app.use(express.json());

// OpenAI クライアントの初期化
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// メインページを返す
app.get("/", (req, res) => {
  res.status(200).send("OK");
    // res.sendFile(path.join(__dirname, "public", "main_front.html"));
});

// テーブル作成用 API
app.post("/create-theme", async (req, res) => {
    const { name } = req.body;
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        return res.status(400).send("Invalid table name");
    }
    try {
        await createThemeTable(name);
        res.send("✅ Table created successfully");
    } catch (err) {
        console.error(err.message);
        if (err.message === "Table already exists") {
            res.status(200).send("⚠️ Table already exists");
        } else {
            res.status(500).send("❌ Error creating table");
        }
    }
});

// テーマ一覧取得
app.get("/get-existingthemes", async (req, res) => {
  const realPool = await pool;
  const connection = await realPool.getConnection();

  await connection.query(`
    CREATE TABLE IF NOT EXISTS themes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_name VARCHAR(255) NOT NULL,
      date_created DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const [rows] = await connection.query("SELECT * FROM themes");
  connection.release();
  res.json(rows);
});



// テーマ内全データ取得
app.get("/get-theme/:name", async (req, res) => {
  const { name } = req.params;
  try {
      const realPool = await pool;
      const [rows] = await realPool.query(`SELECT * FROM \`${name}\``);
      if (rows.length === 0) {
          return res.status(404).send("No data found for this theme.");
      }
      res.json(rows);
  } catch (err) {
      console.error(err.message);
      res.status(500).send("❌ Error fetching data");
  }
});


// 新しいテーマ作成
app.post("/create-newtheme", async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).send("テーマ名が必要です");
    }
    try {
      await createTheme(name);  // db.createTheme() を createTheme() に修正
      res.send("テーマ作成成功");
    } catch (error) {
      console.error("テーマ作成エラー:", error);
      res.status(500).send("サーバーエラー");
    }
});

// テーマへ単語追加
app.post("/write/:name", async (req, res) => {
    const tableName = req.params.name;
    const message = req.body.message;
    try {
        await insertWord(tableName, message);
        res.json({ success: true, message: "データ追加成功" });
    } catch (err) {
        console.error("挿入エラー:", err);
        res.status(500).json({ success: false, message: "データ追加失敗" });
    }
});

// ランダム単語取得エンドポイント
// サーバー起動時のどこか、ルート定義の前に
// テーブルごとに現在の ID を保持するマップ
const sequentialIndices = {};

// GET /get-sequential/:name
app.get("/get-sequential/:name", async (req, res) => {
  const realPool = await pool;
  const tableName = req.params.name;
  let current = sequentialIndices[tableName] || 1;

  try {
    const [rows] = await realPool.query(
      `SELECT * FROM \`${tableName}\` WHERE id = ?`, 
      [current]
    );

    if (rows.length === 0) {
      current = 1;
      const [resetRows] = await realPool.query(
        `SELECT * FROM \`${tableName}\` WHERE id = ?`, 
        [current]
      );
      if (resetRows.length === 0) {
        return res.status(404).json({ message: "No word found" });
      }
      sequentialIndices[tableName] = 2;
      return res.json(resetRows[0]);
    }

    sequentialIndices[tableName] = current + 1;
    return res.json(rows[0]);

  } catch (err) {
    console.error("Sequential fetch error:", err);
    return res.status(500).json({ error: "Error fetching word" });
  }
});

app.post("/generateQuestion", async (req, res) => {
    const { message, id } = req.body;          // id を受け取る
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "問題は'〜は何でしょう？'と言ってね" },
          { role: "user", content: `"${message}"が一意に定まる正解になる問題を100文字以内で作って。` }
        ],
        temperature: 0.7,
      });
      const question = completion.choices[0].message.content;
      // id も一緒に返す
      res.json({ question, id });
    } catch (err) {
      console.error("Error generating question:", err);
      res.status(500).json({ error: "Error generating question" });
    }
  });

// 静的ファイル配信
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error("Server start error:", err);
        process.exit(1);
    }
    console.log(`START listening ${PORT}`);
});
