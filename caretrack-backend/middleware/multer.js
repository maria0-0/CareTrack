const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Inițializăm clientul S3
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            // Generăm un nume unic pentru fișier în cloud
            const ext = path.extname(file.originalname);
            cb(null, `caretrack/${Date.now().toString()}-${file.fieldname}${ext}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 } // Limită 5MB
});

module.exports = { upload };