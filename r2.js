
import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";

export const R2_BUCKET = process.env.R2_BUCKET; 
export const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, ""); 

const ACCESS_KEY =
    process.env.R2_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY ||
    process.env.AWS_ACCESS_KEY_ID ||
    null;

const SECRET_KEY =
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    null;

const ENDPOINT =
    process.env.R2_ENDPOINT ||
    (process.env.CF_ACCOUNT_ID
        ? `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : null);

if (!ENDPOINT) console.warn("[R2] Falta ENDPOINT (define R2_ENDPOINT o CF_ACCOUNT_ID)");
if (!ACCESS_KEY) console.warn("[R2] Falta R2_ACCESS_KEY_ID");
if (!SECRET_KEY) console.warn("[R2] Falta R2_SECRET_ACCESS_KEY");
if (!R2_BUCKET) console.warn("[R2] Falta R2_BUCKET");
if (!R2_PUBLIC_BASE) console.warn("[R2] Falta R2_PUBLIC_BASE");


export const R2 = new S3Client({
    region: "auto",
    endpoint: ENDPOINT || "https://example.r2.cloudflarestorage.com",
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    forcePathStyle: true, 
});

function stripLeadingSlash(s = "") {
    return s.replace(/^\/+/, "");
}
function stripBucketPrefixFromKey(k = "") {
    return R2_BUCKET ? k.replace(new RegExp(`^${R2_BUCKET}/`), "") : k;
}

export function keyFromMaybeUrl(input = "") {
    if (!input) return "";

    if (!/^https?:\/\//i.test(input)) {
        return stripBucketPrefixFromKey(stripLeadingSlash(String(input)));
    }

    try {
        const u = new URL(input);
        const path = stripLeadingSlash(u.pathname); 

        
        if (u.hostname.endsWith(".r2.cloudflarestorage.com")) {
            const parts = path.split("/");
            
            if (parts[0] === R2_BUCKET) return parts.slice(1).join("/"); 
            
            return path;
        }

        if (u.hostname.endsWith(".r2.dev")) {
            return path; 
        }

        return stripBucketPrefixFromKey(path);

    } catch {
        return stripBucketPrefixFromKey(stripLeadingSlash(String(input)));
    }
}


export function toPublicUrlFromKey(key = "") {
    if (!R2_PUBLIC_BASE) throw new Error("R2_PUBLIC_BASE no está definido");
    
    const clean = stripBucketPrefixFromKey(stripLeadingSlash(key));
    
    return `${R2_PUBLIC_BASE}/${clean}`;
}

export default R2;
