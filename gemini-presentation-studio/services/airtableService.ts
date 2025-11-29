
export interface AirtableConfig {
    apiKey: string;
    baseId: string;
    tableName: string;
    imgbbApiKey?: string;
}

export interface ThemeRecord {
    id: string;
    name: string;
    prompt: string;
}

export interface ControlRecord {
    id: string;
    label: string;
    value: string;
    description?: string;
    category: 'Layout' | 'Style' | 'Lighting' | 'Camera';
}

export interface TemplateRecord {
    id: string;
    title: string;
    description: string;
    prompt: string;
    category: string;
}

// Helper to upload base64 to ImgBB and get a public URL
// Now returns an object with success/url or error message
const uploadToImageHost = async (apiKey: string, base64Image: string): Promise<{ url: string | null; error?: string }> => {
    try {
        const formData = new FormData();
        const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        formData.append("image", cleanBase64);
        formData.append("name", `gen-${Date.now()}.png`);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text();
            let msg = `HTTP ${response.status}`;
            try {
                const errJson = JSON.parse(errText);
                if (errJson.error && errJson.error.message) msg = errJson.error.message;
            } catch (e) {}
            return { url: null, error: msg };
        }

        const data = await response.json();
        if (data.success && data.data && data.data.url) {
            return { url: data.data.url };
        }
        return { url: null, error: "ImgBB response missing URL" };
    } catch (e: any) {
        return { url: null, error: e.message || "Network error bridging to ImgBB" };
    }
};

// Helper to convert base64 data URL to a Blob
const base64ToBlob = (base64DataUrl: string): Blob => {
    const parts = base64DataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'video/mp4';
    const base64Data = parts[1];
    const byteCharacters = atob(base64Data);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
    }

    return new Blob(byteArrays, { type: mimeType });
};

// Upload video to file.io (temporary hosting) - free, no API key needed
const uploadVideoToFileIO = async (base64Video: string): Promise<{ url: string | null; error?: string }> => {
    try {
        const blob = base64ToBlob(base64Video);
        const formData = new FormData();
        formData.append('file', blob, `video-${Date.now()}.mp4`);

        const response = await fetch('https://file.io', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            return { url: null, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        if (data.success && data.link) {
            return { url: data.link };
        }
        return { url: null, error: data.message || "File.io upload failed" };
    } catch (e: any) {
        return { url: null, error: e.message || "Network error uploading video" };
    }
};

// Upload video to 0x0.st (permanent hosting) - free, no API key needed
const uploadVideoTo0x0 = async (base64Video: string): Promise<{ url: string | null; error?: string }> => {
    try {
        const blob = base64ToBlob(base64Video);
        const formData = new FormData();
        formData.append('file', blob, `video-${Date.now()}.mp4`);

        const response = await fetch('https://0x0.st', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            return { url: null, error: `HTTP ${response.status}` };
        }

        const url = await response.text();
        if (url && url.startsWith('http')) {
            return { url: url.trim() };
        }
        return { url: null, error: "0x0.st upload failed" };
    } catch (e: any) {
        return { url: null, error: e.message || "Network error uploading video" };
    }
};

export const saveRecordToAirtable = async (
    config: AirtableConfig,
    data: {
        prompt: string;
        type: 'image' | 'video';
        topic?: string;
        campaign?: string;
        style?: string;
        layout?: string;
        aspectRatio?: string;
        resolution?: string;
        isFavorite?: boolean;
        imageData?: string | null;
        videoData?: string | null;
        lighting?: string;
        camera?: string;
        rawInput?: string;
        templateId?: string;
        // Sequence fields
        sequenceId?: string;
        sequenceIndex?: number;
        sequenceTotal?: number;
        sourcePhotoUrls?: string[];
        keySubjects?: string;
        angleDescription?: string;
    }
): Promise<string> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`;
    const formattedType = data.type.charAt(0).toUpperCase() + data.type.slice(1);

    const metadata = {
        raw: data.rawInput,
        lit: data.lighting,
        cam: data.camera,
        tid: data.templateId,
        // Sequence metadata
        seqId: data.sequenceId,
        seqIdx: data.sequenceIndex,
        seqTot: data.sequenceTotal,
        srcUrls: data.sourcePhotoUrls,
        keySub: data.keySubjects,
        angle: data.angleDescription
    };

    const cleanMetadata = Object.fromEntries(Object.entries(metadata).filter(([_, v]) => v != null && v !== ''));

    let combinedPrompt = data.prompt;
    if (Object.keys(cleanMetadata).length > 0) {
        combinedPrompt = `${data.prompt} ||| ${JSON.stringify(cleanMetadata)}`;
    }

    const fields: any = {
        "Topic": data.topic || "Uncategorized",
        "Campaign": data.campaign || "General",
        "Prompt": combinedPrompt,
        "Type": formattedType,
        "Style": data.style || "N/A",
        "Layout": data.layout || "N/A",
        "AspectRatio": data.aspectRatio || "N/A",
        "Resolution": data.resolution || "N/A",
        "Favorite": data.isFavorite ? "Yes" : "No"
    };

    let uploadError = "";

    // Handle image upload
    if (config.imgbbApiKey && data.imageData && data.type === 'image') {
        const result = await uploadToImageHost(config.imgbbApiKey, data.imageData);
        if (result.url) {
            fields["Attachments"] = [{ url: result.url }];
        } else if (result.error) {
            uploadError = result.error;
            console.warn("Image bridge failed:", result.error);
        }
    }

    // Handle video upload using 0x0.st (free, permanent hosting)
    if (data.videoData && data.type === 'video') {
        console.log("Uploading video to 0x0.st...");
        const result = await uploadVideoTo0x0(data.videoData);
        if (result.url) {
            fields["Attachments"] = [{ url: result.url }];
            console.log("Video uploaded successfully:", result.url);
        } else if (result.error) {
            uploadError = result.error;
            console.warn("Video upload failed:", result.error);
        }
    }

    const payload = { fields: fields, typecast: true };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Airtable Error: ${err.error?.message || response.statusText}`);
    }
    const responseData = await response.json();
    
    if (uploadError) {
        throw new Error(`Saved to Airtable, but Image Upload Failed: ${uploadError}`);
    }

    return responseData.id;
};

export const fetchGenerationHistory = async (config: AirtableConfig): Promise<any[]> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}?maxRecords=50`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
    if (!response.ok) return [];

    const data = await response.json();
    return data.records.map((r: any) => {
        const fields = r.fields;
        let imageUrl = null;
        let videoUrl = null;
        const attachments = fields.Attachments || fields.Attachment || fields.Images || fields.Image || fields.File;

        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            const attachment = attachments[0];
            const typeLower = (fields.Type || 'image').toLowerCase();
            if (typeLower === 'video') {
                 videoUrl = attachment.url;
                 imageUrl = attachment.thumbnails?.large?.url || null; 
            } else {
                 imageUrl = attachment.url;
            }
        }

        let displayPrompt = fields.Prompt || '';
        let extendedMetadata: any = {};
        if (displayPrompt.includes(' ||| ')) {
            const parts = displayPrompt.split(' ||| ');
            displayPrompt = parts[0];
            try { extendedMetadata = JSON.parse(parts[1]); } catch (e) {}
        }

        return {
            id: r.id,
            createdTime: r.createdTime,
            type: (fields.Type || 'image').toLowerCase(),
            topic: fields.Topic || '',
            campaign: fields.Campaign || '',
            isFavorite: fields.Favorite === 'Yes',
            prompt: displayPrompt,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            aspectRatio: fields.AspectRatio,
            resolution: fields.Resolution,
            // Sequence fields
            sequenceId: extendedMetadata.seqId,
            sequenceIndex: extendedMetadata.seqIdx,
            sequenceTotal: extendedMetadata.seqTot,
            sourcePhotoUrls: extendedMetadata.srcUrls,
            keySubjects: extendedMetadata.keySub,
            angleDescription: extendedMetadata.angle,
            metadata: {
                style: fields.Style,
                layout: fields.Layout,
                lighting: extendedMetadata.lit,
                camera: extendedMetadata.cam,
                rawInput: extendedMetadata.raw,
                templateId: extendedMetadata.tid
            }
        };
    }).sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
};

export const checkAirtableConnection = async (config: AirtableConfig): Promise<void> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}?maxRecords=1`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
    if (!response.ok) throw new Error("Connection failed");
};

// --- Theme / Creative Direction CRUD ---
export const fetchThemes = async (config: AirtableConfig): Promise<ThemeRecord[]> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/Themes`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.records.map((r: any) => ({ id: r.id, name: r.fields.Name, prompt: r.fields.Prompt }));
};

export const createTheme = async (config: AirtableConfig, name: string, prompt: string): Promise<ThemeRecord> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/Themes`;
    const payload = { fields: { "Name": name, "Prompt": prompt }, typecast: true };
    const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Failed");
    const r = await response.json();
    return { id: r.id, name: r.fields.Name, prompt: r.fields.Prompt };
};

export const deleteTheme = async (config: AirtableConfig, recordId: string): Promise<void> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/Themes/${recordId}`;
    await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${config.apiKey}` } });
};

// --- CONTROLS CRUD (Layout, Style, Lighting, Camera) ---
// Airtable columns: Label, Description, Category
// Label is used for both display and value selection
export const fetchControls = async (config: AirtableConfig): Promise<ControlRecord[]> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/Controls?maxRecords=100`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.records.map((r: any) => ({
        id: r.id,
        label: r.fields.Label,
        value: r.fields.Label,  // Use Label as the value
        description: r.fields.Description,
        category: r.fields.Category
    }));
};

export const createControl = async (config: AirtableConfig, label: string, category: string, description?: string): Promise<ControlRecord> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/Controls`;
    const fields: any = { "Label": label, "Category": category };
    if (description) fields["Description"] = description;
    const payload = { fields, typecast: true };
    const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Failed");
    const r = await response.json();
    return { id: r.id, label: r.fields.Label, value: r.fields.Label, description: r.fields.Description, category: r.fields.Category };
};

export const deleteControl = async (config: AirtableConfig, id: string): Promise<void> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/Controls/${id}`;
    await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${config.apiKey}` } });
};

// --- TEMPLATES CRUD ---
export const fetchTemplates = async (config: AirtableConfig): Promise<TemplateRecord[]> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/Templates?maxRecords=100`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.records.map((r: any) => ({
        id: r.id,
        title: r.fields.Title,
        description: r.fields.Description,
        prompt: r.fields.Prompt,
        category: r.fields.Category || 'Custom'
    }));
};

export const createTemplate = async (config: AirtableConfig, title: string, desc: string, prompt: string, cat: string): Promise<TemplateRecord> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/Templates`;
    const payload = { fields: { "Title": title, "Description": desc, "Prompt": prompt, "Category": cat }, typecast: true };
    const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Failed");
    const r = await response.json();
    return { id: r.id, title: r.fields.Title, description: r.fields.Description, prompt: r.fields.Prompt, category: r.fields.Category };
};
