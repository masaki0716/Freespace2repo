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
    res.sendFile(path.join(__dirname, "public", "main_front.html"));
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
app.get("/get-exsistingthemes", async (req, res) => {
    try {
        const themes = await getThemes();
        res.json(themes);
    } catch (error) {
        console.error("テーマ一覧取得エラー:", error);
        res.status(500).send("サーバーエラー");
    }
});

// テーマ内全データ取得
app.get("/get-theme/:name", async (req, res) => {
    const { name } = req.params;
    try {
        const [rows] = await pool.query(`SELECT * FROM \`${name}\``);
        console.log("Rows from database:", rows);
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
  const tableName = req.params.name;
  // 初回は ID=1
  let current = sequentialIndices[tableName] || 1;

  try {
    // まず該当 ID のレコードを取得
    const [rows] = await pool.query(
      `SELECT * FROM \`${tableName}\` WHERE id = ?`, 
      [current]
    );

    // レコードがなければ、ID を 1 にリセットして再取得
    if (rows.length === 0) {
      current = 1;
      const [resetRows] = await pool.query(
        `SELECT * FROM \`${tableName}\` WHERE id = ?`, 
        [current]
      );
      if (resetRows.length === 0) {
        // テーブルにそもそも行がない場合
        return res.status(404).json({ message: "No word found" });
      }
      sequentialIndices[tableName] = 2;  // 次は 2
      return res.json(resetRows[0]);
    }

    // 通常は取得できたレコードを返し、次は current+1
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

app.listen(PORT, (err) => {
    if (err) {
        console.error("Server start error:", err);
        process.exit(1);
    }
    console.log(`START listening ${PORT}`);
});
