const mysql = require("mysql2/promise");
const url = require("url");

// 非同期で接続プールを作成する関数
async function createPool() {
    try {
        // DB_URL 環境変数から MySQL の接続情報を取得
        const dbUrl = process.env.DB_URL; // 例: "mysql://user:password@host:port/database"
        
        // URLを解析して接続情報を抽出
        const parsedUrl = url.parse(dbUrl);
        const [user, password] = parsedUrl.auth.split(":");
        
        // プールの作成
        const pool = mysql.createPool({
            host: parsedUrl.hostname,         // ホスト名
            user: user,                       // ユーザー名
            password: password,               // パスワード
            database: parsedUrl.pathname.slice(1),  // データベース名（pathnameから先頭の '/' を取り除く）
            port: parsedUrl.port || 3306,     // ポート番号（デフォルトは3306）
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        // データベース接続の確認
        await pool.query("SELECT 1");
        
        return pool; // 正常に接続できれば pool を返す
    } catch (error) {
        console.error("DB Connection Failed: ", error);  // エラーのログ出力
        throw new Error("DB connection failed");
    }
}

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
