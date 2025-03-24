import fs from "fs/promises";

async function fixTitles(filePath) {
  try {
    // JSONファイルを読み込む
    const data = await fs.readFile(filePath, "utf-8");
    const items = JSON.parse(data);

    // 各タイトルについて、先頭の「｜」を削除し、
    // その後に続く最初の「｜」以降を削除する
    const updatedItems = items.map((item) => {
      let title = item.title.trim();

      // 先頭が「｜」の場合、削除する
      if (title.startsWith("｜")) {
        title = title.substring(1).trim();
      }

      // 次の「｜」以降の文字を削除する
      const pipeIndex = title.indexOf("｜");
      if (pipeIndex !== -1) {
        title = title.substring(0, pipeIndex).trim();
      }

      item.title = title;
      return item;
    });

    // 修正されたアイテムをJSONファイルに書き込む
    await fs.writeFile(
      filePath,
      JSON.stringify(updatedItems, null, 2),
      "utf-8"
    );

    console.log("タイトルが修正されました。");
  } catch (error) {
    console.error("エラーが発生しました:", error.message);
  }
}

// 使用例
fixTitles("./furubira_content.json");
