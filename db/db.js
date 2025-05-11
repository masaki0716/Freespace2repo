require("dotenv").config();  // .env を読み込む

const mysql = require("mysql2/promise");

async function createPool() {
    try {
        const dbUrl = process.env.DB_URL;
        const dbConfig = new URL(dbUrl);  // URL を分解

        // 接続プールを作成
        const pool = mysql.createPool({
            host: dbConfig.hostname,
            port: dbConfig.port || 3306,  // port がなければ 3306 を使用
            user: dbConfig.username,
            password: dbConfig.password,
            database: dbConfig.pathname.replace('/', ''),  // /の後がDB名
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // 接続テスト
        await pool.query("SELECT 1");
        console.log("✅ MySQL connected");
        return pool;
    } catch (err) {
        console.error("❌ Connection failed:", err.message);
        throw err;
    }
}

// createPool関数を呼び出すなどして使う


        //         const pool = mysql.createPool({
//     host: "localhost",
//     user: "root",
//     password: "Masaki.0716",
//     database: "myDB",
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });


// 非同期でプールを作成し、接続確認を行ったプールを利用
const poolPromise = createPool(); // 非同期で作成したプールを利用

// テーブル作成用関数
async function createThemeTable(name) {
    const pool = await poolPromise; // 非同期でプールを取得
    const conn = await pool.getConnection();
    try {
        // まず、テーブルが存在するか確認
        const [rows] = await conn.query("SHOW TABLES LIKE ?", [name]);

        if (rows.length > 0) {
            throw new Error("Table already exists");
        }

        // なければ作成
        const createSql = `
          CREATE TABLE \`${name}\` (
            id INT AUTO_INCREMENT PRIMARY KEY,   -- id列（数字）
            word VARCHAR(255),                   -- word列（文字列）
            level TINYINT UNSIGNED DEFAULT 0,    -- level列（整数）
            date DATE                            -- date列（年月日型）
          )
        `;
        await conn.query(createSql);

    } finally {
        conn.release();
    }
}

// テーマ一覧を取得する関数
async function getThemes() {
    const pool = await poolPromise; // 非同期でプールを取得
    const [rows] = await pool.query("SELECT table_name FROM themes ORDER BY id ASC");
    return rows.map(row => row.table_name);
}

// 新しいテーマを追加する関数
async function createTheme(name) {
    const pool = await poolPromise; // 非同期でプールを取得
    await pool.query("INSERT INTO themes (table_name, date) VALUES (?, CURDATE())", [name]);
}

// データ追加関数（word列にmessageを追加）
async function insertWord(tableName, word) {
    const pool = await poolPromise; // 非同期でプールを取得
    const query = `INSERT INTO \`${tableName}\` (word, date) VALUES (?, NOW())`;
    await pool.query(query, [word]);
}

module.exports = { createThemeTable, pool: poolPromise, getThemes, createTheme, insertWord };
