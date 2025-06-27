const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parser');

admin.initializeApp();

const db = admin.firestore();

// データ型を変換するヘルパー関数
function convertDataTypes(row, collectionName) {
  const convertedRow = { ...row }; // 元の行をコピー

  // 全てのテーブルに共通するフィールドの変換
  if (convertedRow.display_order) {
    convertedRow.display_order = Number(convertedRow.display_order);
  }
  if (convertedRow.created_at) {
    convertedRow.created_at = admin.firestore.Timestamp.fromDate(new Date(convertedRow.created_at));
  }
  if (convertedRow.updated_at) {
    convertedRow.updated_at = admin.firestore.Timestamp.fromDate(new Date(convertedRow.updated_at));
  }

  // テーブル固有の変換
  switch (collectionName) {
    case 'chat_rows':
      if (convertedRow.id) convertedRow.id = Number(convertedRow.id);
      if (convertedRow.timestamp) {
        convertedRow.timestamp = admin.firestore.Timestamp.fromDate(new Date(convertedRow.timestamp));
      }
      break;

    case 'furubira_info_rows':
      if (convertedRow.id) convertedRow.id = Number(convertedRow.id);
      // embeddingはJSON文字列なので、オブジェクト(配列)にパースする
      if (convertedRow.embedding) {
        try {
          convertedRow.embedding = JSON.parse(convertedRow.embedding);
        } catch (e) {
          console.error('Failed to parse embedding for row:', row);
          convertedRow.embedding = [];
        }
      }
      break;
    
    case 'system_message_rows':
      if (convertedRow.id) convertedRow.id = Number(convertedRow.id);
      break;
  }

  return convertedRow;
}

const csvDirectory = path.join(__dirname, '..', 'tmp', 'csv_data');

fs.readdirSync(csvDirectory).forEach(file => {
  if (path.extname(file) === '.csv') {
    let collectionName = path.basename(file, '.csv'); // ファイル名をコレクション名とする
    
    // フォルダ名末尾が_rowsの場合は削除
    if (collectionName.endsWith('_rows')) {
      collectionName = collectionName.slice(0, -5); // '_rows'の5文字を削除
    }
    
    const collectionRef = db.collection(collectionName);
    console.log(`Migrating ${file} to ${collectionName} collection...`);

    fs.createReadStream(path.join(csvDirectory, file))
      .pipe(parse())
      .on('data', (row) => {
        const convertedData = convertDataTypes(row, collectionName);
        const docId = convertedData.id;

        if (!docId) {
            console.error('Row is missing a valid ID, skipping:', row);
            return;
        }

        const dataToWrite = { ...convertedData };
        delete dataToWrite.id;

        collectionRef.doc(String(docId)).set(dataToWrite).then(() => {
            console.log(`Set document with ID: ${docId} in ${collectionName}`);
        }).catch(error => {
            console.error(`Failed to set document ${docId}:`, error);
        });
      })
      .on('end', () => {
        console.log(`${file} has been successfully processed.`);
      });
  }
});