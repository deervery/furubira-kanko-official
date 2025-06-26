require('dotenv').config();

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const bucket = admin.storage().bucket();
const baseImageDirectory = path.join(__dirname, '..', 'tmp', 'image_data');

function uploadDirectory(directoryPath) {
  const files = fs.readdirSync(directoryPath, { withFileTypes: true });

  files.forEach(file => {
    const fullPath = path.join(directoryPath, file.name);

    if (file.isDirectory()) {
      // もし項目がディレクトリなら、その中で再度この関数を呼び出す
      uploadDirectory(fullPath);
    } else {
      // 項目がファイルなら、アップロード処理を行う
      
      // Storage内の保存パスを計算 (例: accommodations/image1.jpg)
      const destinationPath = path.relative(baseImageDirectory, fullPath)
                                  .replace(/\\/g, '/'); // Windowsのパス区切り文字を置換

      bucket.upload(fullPath, {
        destination: destinationPath,
      }).then(() => {
        console.log(`✅ Uploaded: ${destinationPath}`);
      }).catch(err => {
        console.error(`❌ FAILED to upload ${destinationPath}:`, err);
      });
    }
  });
}

console.log('Starting image migration...');
uploadDirectory(baseImageDirectory);
console.log('...Image migration script finished.');