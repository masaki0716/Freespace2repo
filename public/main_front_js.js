  const themes = document.getElementById("themes");//上部タブ
  const themeContents = document.getElementById("themeContents");//下部タブ

  async function loadThemes() {
    try {//非エラー時←→エラー(catch)
      const response = await fetch("/get-existingthemes");//ser46 HTTPres全体情報取得
      const themesList = await response.json(); // jsonになった情報のみ取得
  
      themesList.forEach(theme => {
        createTheme(theme.table_name);//18
      });
      
    } catch (error) {
      console.error("テーマのロードに失敗しました:", error);
    }
  }

  function createTheme(name) { //引数を"テーマ:数字"に指定　 = `テーマ${++themeCounter}`
    // タブ作成
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.textContent = name; //タブで目で見る部分
    tab.dataset.theme = name; //プログラム内で処理する名前
    //↑HTMLだと <div class="tab" data-theme="テーマ1"> テーマ1 </div>
    themes.appendChild(tab); //69 作ったタブを、<div id="themes">の中に追加する
    // ↓ここまでで
    //   <div id="themes">
    //      <div class="tab" data-theme="テーマ1">テーマ1</div>
    //   </div>


    // 内容作成
    const content = document.createElement("div");// <div>を作成する
    content.className = "content";
    content.id = name;
    //innerHTML:content内のhtml全て書き換え
    content.innerHTML = `
      <div class="subtab" data-page="quiz">${name}の問題</div>
      <div class="subtab" data-page="add">追加</div>
      <div class="subtab" data-page="list">一覧</div>
      <div class="subcontent" id="quiz">
        <textarea id="getploblem" rows="4" cols="50" readonly></textarea>
       <button id="ploblem">問題を生成</button><br><br>
        <input type="text" id="answer" readonly>
        <button id="getanswer">回答を表示</button><br>
        <button id="correct" type="button">正解！</button>
        <button id="incorrect" type="button">不正解</button>
      </div>
      <div class="subcontent" id="add">
          <input type="text" id="inputbox">
          <button id="write_db">DBに追加</button>
      </div>
      <div class="subcontent" id="list">
          <table id="messageTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>メッセージ</th>
                <th>level</th>
                <th>復習日</th>
              </tr>
            </thead>
          <tbody>

        </tbody>
          </table>
      </div>

    `;
    themeContents.appendChild(content);//タブ、サブタブ生成

    
const writeBtn = content.querySelector("#write_db");//追加ボタン
const inputBox = content.querySelector("#inputbox");//追加ボックス

writeBtn.addEventListener("click", () => {
  const inputValue = inputBox.value;
  add_ward(name, inputValue); //234 名前も入力値もここで渡せる
  inputBox.value = "";
});

// 問題生成ボタンイベント設定
const problemBtn = content.querySelector("#ploblem");//# : 一致するID ボタン
const outputBox = content.querySelector("#getploblem");// txt表示
const answerBtn = content.querySelector("#getanswer");//回答表示ボタン
const answerTxt = content.querySelector("#answer");//回答txt表示

problemBtn.addEventListener("click", () => {
  answerTxt.value = "";
  generateQuestion(name, outputBox);//256
});

answerBtn.addEventListener("click", () => {
  const lastWord = lastWordMap[name];
  // まだ問題を生成していなければ何もしない
  if (!lastWord) return;
  answerTxt.value = lastWord;
});


    activateTab(tab);//167

    tab.addEventListener("click", () => activateTab(tab));

    // 小タブ切り替え
    const subtabs = content.querySelectorAll(".subtab");
    const subcontents = content.querySelectorAll(".subcontent");
    subtabs.forEach(tab => {
      tab.addEventListener("click", () => {
        subtabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        subcontents.forEach(c => c.classList.remove("show"));
        content.querySelector(`#${tab.dataset.page}`).classList.add("show");
        if(tab.dataset.page === "list"){
          show_db(name);
        }
      });
    });
  };

  function show_db(name) {
    const content = document.getElementById(name);  // 対応するテーマのコンテンツを取得
    const tableBody = content.querySelector("#messageTable tbody");  // 対応するテーブルのtbodyを取得
  
    // 既存の行を削除（これで前回のデータが消える）
    tableBody.innerHTML = "";
  
    fetch(`/get-theme/${name}`)
      .then(response => response.json())
      .then(data => {
        data.forEach(row => {
          const tr = document.createElement("tr");
  
          const tdId = document.createElement("td");
          tdId.textContent = row.id;
  
          const tdWord = document.createElement("td");
          tdWord.textContent = row.word;
  
          const tdMeaning = document.createElement("td");
          tdMeaning.textContent = row.level;
  
          const dateCell = document.createElement("td");
          const dataObj = new Date(row.date);
          dateCell.textContent = dataObj.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
  
          tr.appendChild(tdId);
          tr.appendChild(tdWord);
          tr.appendChild(tdMeaning);
          tr.appendChild(dateCell);
  
          tableBody.appendChild(tr);  // 新しいデータ行を追加
        });
      })
      .catch(error => {
        console.error("エラー:", error);
      });
  }
  
  


  function activateTab(tab) {//101
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".content").forEach(c => c.classList.remove("show"));
    document.getElementById(tab.dataset.theme).classList.add("show");
  }

  document.getElementById("addTheme").addEventListener("click", async () => {
    const name = prompt("新しいテーマの名前を入力してください");
    if (name) {
      // 1. 最初に /create-theme を実行
      const response1 = await fetch("/create-theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });
  
      const message1 = await response1.text();
      alert(message1);  // /create-theme のメッセージを表示
  
      // /create-theme の処理が成功したら次の処理を実行
      if (message1.includes("successfully")) {
        // 2. 次に /create-newtheme を実行
        const response2 = await fetch("/create-newtheme", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name })
        });
  
        const message2 = await response2.text();
        alert(message2);  // /create-newtheme のメッセージを表示
  
        // /create-newtheme の処理が成功したら、フロントでテーマを作成
        if (message2 === "テーマ作成成功") {
          createTheme(name);  // 新規作成成功のときだけテーマを作る
        }
      }
    }
  });
  
  
  

document.getElementById("removeTheme").addEventListener("click", () => {
    const activeTab = document.querySelector(".tab.active");
    if (!activeTab) return;
  
    // 確認ウィンドウを出す
    const confirmDelete = confirm("削除？");
    if (!confirmDelete) return; // キャンセルしたら何もしない
  
    const themeId = activeTab.dataset.theme;
    const content = document.getElementById(themeId);
  
    activeTab.remove();
    content.remove();
  
    const nextTab = document.querySelector(".tab");
    if (nextTab) activateTab(nextTab);
  });

  function add_ward(name, message) {
    fetch(`/write/${name}`, {//ser98
      method: "POST",
      headers: {
        "Content-Type": "application/json",//データはjsonと伝える
      },
      body: JSON.stringify({ message })//messageをjsonに変換
    })
    .then(response => response.json())//resが帰ってきた後の処理
    .then(data => {
      console.log("サーバーからの応答：", data);
      alert("データベースに追加されました");
    })
    .catch(error => {
      console.error("エラー:", error);
      alert("追加に失敗しました");
    });
  }

  
const lastWordMap = {};//回答用
const lastIdMap   = {};//使わないがid保持

function generateQuestion(themeName, outputElement) {//90　問題生成(id,問題文)
  outputElement.value = "生成中...";

  fetch(`/get-sequential/${themeName}`)//ser114
    .then(res => {//id=xのrows,json形式
      if (!res.ok) throw new Error("404");//404:not found
      return res.json();
    })
    .then(data => {//Promiseチェーン　前のthenのreturnを受けとる
      // data には .id, .word, .level, .date が含まれる
      const { id, word } = data;
      lastWordMap[themeName] = word;  // あとで回答表示用に保持
      return fetch("/generateQuestion", {//ser144
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: word, id })
      });
    })
    .then(res => res.json())//{問題文,id}
    .then(result => {
      // result.question, result.id が返ってくる
      outputElement.value = result.question || "問題生成に失敗しました";
      lastIdMap[themeName] = result.id;
    })
    .catch(error => {
      console.error("問題生成エラー:", error);
      if (error.message === "404") {
        outputElement.value = "これ以上のデータはありません";
      } else {
        outputElement.value = "エラーが発生しました";
      }
    });
}

loadThemes();


