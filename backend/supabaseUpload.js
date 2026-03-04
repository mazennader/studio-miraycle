import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ⚠️ MUST MATCH BUCKET NAME EXACTLY
const BUCKET = "artshop-images";

export async function uploadImage(file) {
  if (!file) throw new Error("No file provided");

  // sanitize extension
  const ext = file.originalname.split(".").pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  console.log("Uploading to bucket:", BUCKET);
  console.log("Filename:", fileName);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error("SUPABASE UPLOAD ERROR:", error);
    throw new Error("Supabase upload failed");
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  if (!data?.publicUrl) {
    throw new Error("Failed to get public URL");
  }

  return data.publicUrl;
}

export async function uploadPdf(file) {
  // file = req.file from multer (buffer, mimetype, originalname)

  const ext = (file.originalname.split(".").pop() || "pdf").toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("artshop-images") // ✅ use your same bucket OR change to your pdf bucket name
    .upload(filename, file.buffer, {
      contentType: file.mimetype || "application/pdf",
      upsert: false,
    });

  if (error) throw error;

  const { data: pub } = supabase.storage
    .from("artshop-images")
    .getPublicUrl(data.path);

  return pub.publicUrl;
}


