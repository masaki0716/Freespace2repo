const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST,       // 環境変数に設定されたホスト名
    user: process.env.DB_USER,       // 環境変数に設定されたユーザー名
    password: process.env.DB_PASS,   // 環境変数に設定されたパスワード
    database: process.env.DB_NAME,   // 環境変数に設定されたデータベース名
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// const pool = mysql.createPool({
//     host: "localhost",
//     user: "root",
//     password: "Masaki.0716",
//     database: "myDB",
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

async function createThemeTable(name) {
    const conn = await pool.getConnection();
    try {
        // まず、テーブルが存在するか確認
        const [rows] = await conn.query(
            "SHOW TABLES LIKE ?", [name]
        );

        if (rows.length > 0) {
            // すでに存在する場合
            throw new Error("Table already exists");
        }

        // なければ作成
        const createSql = `
          CREATE TABLE \`${name}\` (
            id INT AUTO_INCREMENT PRIMARY KEY,   -- id列（数字）
            word VARCHAR(255),                   -- word列（文字列）
            level TINYINT UNSIGNED DEFAULT 0,                -- meaning列（文字列）
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
    const [rows] = await pool.query("SELECT table_name FROM themes ORDER BY id ASC");
    return rows.map(row => row.table_name);
}

// 新しいテーマを追加する関数
async function createTheme(name) {
    await pool.query("INSERT INTO themes (table_name, date) VALUES (?, CURDATE())", [name]);
}

// データ追加関数（word列にmessageを追加）
// db.js
async function insertWord(tableName, word) {
    const query = `INSERT INTO \`${tableName}\` (word,date) VALUES (?, NOW())`;
    await pool.query(query, [word]);

}



module.exports = { createThemeTable, pool, getThemes, createTheme,insertWord};
