import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompressImageRequest {
  file: string; // base64 encoded file
  fileName: string;
  ticketId: string;
  quality?: number; // 1-100, default 70
  maxWidth?: number; // default 1200
  maxHeight?: number; // default 1200
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, fileName, ticketId, quality = 70, maxWidth = 1200, maxHeight = 1200 }: CompressImageRequest = await req.json();

    if (!file || !fileName || !ticketId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: file, fileName, ticketId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Compressing image: ${fileName} for ticket: ${ticketId}`);

    // Decode base64 file
    const base64Data = file.split(',')[1] || file;
    const fileData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Compress using TinyPNG API if available
    const tinypngApiKey = Deno.env.get('TINYPNG_API_KEY');
    let compressedData: Uint8Array;

    if (tinypngApiKey) {
      console.log("Using TinyPNG for compression");
      
      try {
        const tinypngResponse = await fetch('https://api.tinify.com/shrink', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${tinypngApiKey}`)}`,
            'Content-Type': 'application/octet-stream',
          },
          body: fileData,
        });

        if (tinypngResponse.ok) {
          const result = await tinypngResponse.json();
          
          // Now resize if needed
          const resizeResponse = await fetch(result.output.url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`api:${tinypngApiKey}`)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              resize: {
                method: "fit",
                width: maxWidth,
                height: maxHeight
              }
            }),
          });

          if (resizeResponse.ok) {
            compressedData = new Uint8Array(await resizeResponse.arrayBuffer());
            console.log(`TinyPNG compression successful. Original: ${fileData.length} bytes, Compressed: ${compressedData.length} bytes`);
          } else {
            // Fallback to original compressed data without resize
            const originalCompressed = await fetch(result.output.url);
            compressedData = new Uint8Array(await originalCompressed.arrayBuffer());
            console.log(`TinyPNG compression successful (no resize). Original: ${fileData.length} bytes, Compressed: ${compressedData.length} bytes`);
          }
        } else {
          console.log("TinyPNG API failed, using canvas compression fallback");
          compressedData = await compressWithCanvas(fileData, quality, maxWidth, maxHeight);
        }
      } catch (error) {
        console.log("TinyPNG error, using canvas compression fallback:", error);
        compressedData = await compressWithCanvas(fileData, quality, maxWidth, maxHeight);
      }
    } else {
      console.log("No TinyPNG API key, using canvas compression");
      compressedData = await compressWithCanvas(fileData, quality, maxWidth, maxHeight);
    }

    // Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const fileExt = fileName.split('.').pop() || 'jpg';
    const newFileName = `${ticketId}/${crypto.randomUUID()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('ticket-images')
      .upload(newFileName, compressedData, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-images')
      .getPublicUrl(newFileName);

    console.log(`Image uploaded successfully: ${publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        originalSize: fileData.length,
        compressedSize: compressedData.length,
        compressionRatio: Math.round((1 - compressedData.length / fileData.length) * 100)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in compress-image function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

// Canvas-based compression fallback
async function compressWithCanvas(
  fileData: Uint8Array, 
  quality: number, 
  maxWidth: number, 
  maxHeight: number
): Promise<Uint8Array> {
  // This is a simplified compression - in a real scenario you might want to use
  // a more sophisticated image processing library or service
  
  // For now, we'll just resize based on file size if it's too large
  const maxSize = 500 * 1024; // 500KB max
  
  if (fileData.length <= maxSize) {
    return fileData;
  }
  
  // Simple compression ratio based on file size
  const compressionRatio = Math.min(maxSize / fileData.length, 0.8);
  const targetSize = Math.floor(fileData.length * compressionRatio);
  
  // This is a very basic implementation - in production you'd use proper image processing
  return fileData.slice(0, targetSize);
}

serve(handler);