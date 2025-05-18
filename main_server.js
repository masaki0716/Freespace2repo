


const express = require("express");
const path = require("path");
const { createThemeTable, pool, createTheme, getThemes, insertWord } = require("./db/db"); 
const { OpenAI } = require("openai");
require("dotenv").config(); 

const app = express();
const PORT = process.env.PORT || 8080;


app.use(express.json());

// OpenAI クライアントの初期化
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// メインページを返す
app.get("/", (req, res) => {
  // res.status(200).send("OK");
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
        // await createTheme(name);
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
  //themes=[rows(データそのもの),fields(カラムの定義)]
  const [rows] = await connection.query("SELECT * FROM themes");
  connection.release();//プールに返す
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
    const tableName = req.params.name;//params：URLのname
    const message = req.body.message;//params：URLのmassage
    try {
        await insertWord(tableName, message);//db76
        res.json({ success: true, message: "データ追加成功" });
    } catch (err) {
        console.error("挿入エラー:", err);
        res.status(500).json({ success: false, message: "データ追加失敗" });
    }
});


const sequentialIndices = {};
app.get("/get-sequential/:name", async (req, res) => {
  const realPool = await pool;
  const tableName = req.params.name;
  let current = sequentialIndices[tableName] || 1;//{テーマ１:2,テーマ2:5,,}なければid=1

  try {
    let [rows] = await realPool.query(
      `SELECT * FROM \`${tableName}\` WHERE id = ?`, 
      [current]
    );

    if (rows.length === 0) {// 該当IDが存在しなければ、id=1にリセットして再取得
      current = 1;
      [rows] = await realPool.query(
        `SELECT * FROM \`${tableName}\` WHERE id = ?`, 
        [current]
      );

      if (rows.length === 0) {//id=1もなければエラー
        return res.status(404).json({ message: "No word found" });
      }
    }

    sequentialIndices[tableName] = current + 1;//idがあれば次回継続
    return res.json(rows[0]);//rows[0]={id:x,word:xxx,level:xx}

  } catch (err) {
    console.error("単語取得エラー:", err);
    return res.status(500).json({ error: "単語の取得中にエラーが発生しました" });
  }
});

app.post("/generateQuestion", async (req, res) => {//ma268
    const { message, id } = req.body;      
    try {
      const completion = await openai.chat.completions.create({//APIレスポンス全体
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "出力は『〇〇は何でしょう？』の形式。答えが一意に定まる短い問題を作る。" },
          { role: "user", content: `"${message}"が正解になる問題を1つ作って。` }
        ],
        temperature: 0.5,
      });
      const question = completion.choices[0].message.content;//問題文
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
