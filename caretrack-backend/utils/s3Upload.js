const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// Initialize S3 client (Reusing environment variables)
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

/**
 * Uploads a Base64 encoded image to AWS S3.
 * @param {string} base64String - The full base64 image string (data:image/png;base64,...)
 * @param {string} folder - The folder name within the bucket (e.g. 'signatures')
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
const uploadBase64ToS3 = async (base64String, folder = 'signatures') => {
    if (!base64String || !base64String.startsWith('data:image')) {
        throw new Error('Invalid base64 image string');
    }

    try {
        // 1. Remove the data URL prefix to get the raw base64 data
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // 2. Extract content type
        const typeMatch = base64String.match(/data:([^;]+);/);
        const contentType = typeMatch ? typeMatch[1] : 'image/png';
        const extension = contentType.split('/')[1] || 'png';

        // 3. Generate a unique file name
        const fileName = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;

        // 4. Configure the S3 upload command
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: contentType,
            // Access control depends on your bucket configuration. 
            // If your bucket is private, you might need ACL: 'public-read' 
            // (but many modern buckets block ACLs, preferring Bucket Policies).
        });

        // 5. Execute the upload
        await s3.send(command);

        // 6. Return the direct URL
        return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (err) {
        console.error('S3 Base64 Upload Error:', err);
        throw new Error('Failed to upload signature to S3');
    }
};

module.exports = { uploadBase64ToS3 };
