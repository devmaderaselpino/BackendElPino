import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { R2, R2_BUCKET, toPublicUrlFromKey } from '../r2.js';
import { customAlphabet } from "nanoid";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, 
});

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 21);

function isPdf(file) {
    if (!file || file.mimetype !== "application/pdf") return false;
    const head = file.buffer?.subarray(0, 4).toString();
    return head === "%PDF";
}

router.post("/pdf", upload.single("file"), async (req, res) => {
    const file = req.file;

    try {
        if (!R2_BUCKET) {
            return res.status(500).json({ error: "R2_BUCKET_NOT_SET" });
        }
        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        if (!isPdf(file)) {
            return res.status(400).json({ error: "Solo PDFs válidos (máx 15MB)" });
        }

        const key = `uploads/${Date.now()}-${nanoid()}.pdf`;

        const put = await R2.send(
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                Body: file.buffer,
                ContentType: "application/pdf",
            
            })
        );

        let publicUrl = null;
        
        try {
            publicUrl = toPublicUrlFromKey(key); 
        } catch {
    
        }

        return res.json({ key, publicUrl, etag: put?.ETag ?? put?.$metadata?.requestId ?? null });
    } catch (err) {
        console.error("[upload/pdf] error:", {
            name: err?.name,
            code: err?.Code || err?.code,
            message: err?.message,
            meta: err?.$metadata,
            stack: err?.stack,
        });
        return res.status(500).json({
        error: "R2_PUT_FAILED",
            details: {
                name: err?.name,
                code: err?.Code || err?.code,
                message: err?.message,
                httpStatus: err?.$metadata?.httpStatusCode,
            },
        });
    }
});

export default router;