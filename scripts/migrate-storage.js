const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  storageBucket: "YOUR_STORAGE_BUCKET_URL" // 例: your-project-id.appspot.com
});

const bucket = admin.storage().bucket();
const imageDirectory = path.join(__dirname, '..', 'tmp', 'image_data'); // 解凍した画像を置くフォルダ

fs.readdirSync(imageDirectory).forEach(file => {
  const filePath = path.join(imageDirectory, file);

  bucket.upload(filePath, {
    destination: `images/${file}`, // Storage内の保存先パス
    public: true // publicに設定して直接URLでアクセスできるようにする場合
  }).then(() => {
    console.log(`${file} uploaded successfully.`);
  }).catch(err => {
    console.error(`Error uploading ${file}:`, err);
  });
});