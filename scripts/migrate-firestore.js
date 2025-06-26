const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parser');

admin.initializeApp();

const db = admin.firestore();

const csvDirectory = path.join(__dirname, '..', 'tmp', 'csv_data'); // ダウンロードしたCSVを置くフォルダ

fs.readdirSync(csvDirectory).forEach(file => {
  if (path.extname(file) === '.csv') {
    const collectionName = path.basename(file, '.csv'); // ファイル名をコレクション名とする
    const collectionRef = db.collection(collectionName);
    console.log(`Migrating ${file} to ${collectionName} collection...`);

    fs.createReadStream(path.join(csvDirectory, file))
      .pipe(parse())
      .on('data', (row) => {
        // ここで必要に応じてデータ型を変換する（例: 文字列を数値に）
        // const docData = { ...row, price: Number(row.price) };

        collectionRef.add(row).then((docRef) => {
            console.log(`Added document with ID: ${docRef.id}`);
        });
      })
      .on('end', () => {
        console.log(`${file} has been successfully processed.`);
      });
  }
});