import fs from "fs/promises";

async function removeEmptyItems(filePath) {
  try {
    // JSONファイルを読み込む
    const data = await fs.readFile(filePath, "utf-8");
    const items = JSON.parse(data);

    // タイトルまたはコンテンツが空のアイテムをフィルタリング
    const filteredItems = items.filter(
      (item) => item.title.trim() !== "" && item.content.trim() !== ""
    );

    // フィルタリングされたアイテムをJSONファイルに書き込む
    await fs.writeFile(
      filePath,
      JSON.stringify(filteredItems, null, 2),
      "utf-8"
    );

    console.log("空のタイトルまたはコンテンツを持つアイテムが削除されました。");
  } catch (error) {
    console.error("エラーが発生しました:", error.message);
  }
}

// 使用例
removeEmptyItems("path/to/your/furubira_content.json");
