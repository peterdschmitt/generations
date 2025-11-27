import { AirtableConfig } from './airtableService';

export interface SourcePhoto {
    id: string;
    name: string;
    imageUrl: string;
    tags?: string[];
    createdAt?: string;
}

// Upload image to ImgBB and return public URL
const uploadToImgBB = async (apiKey: string, base64Image: string): Promise<string> => {
    const formData = new FormData();
    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    formData.append("image", cleanBase64);
    formData.append("name", `source-${Date.now()}.png`);

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
        throw new Error(`ImgBB upload failed: ${msg}`);
    }

    const data = await response.json();
    if (data.success && data.data && data.data.url) {
        return data.data.url;
    }
    throw new Error("ImgBB response missing URL");
};

// Fetch all source photos from Airtable
export const fetchSourcePhotos = async (config: AirtableConfig): Promise<SourcePhoto[]> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/SourcePhotos?maxRecords=100`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
    });

    if (!response.ok) {
        if (response.status === 404) {
            console.warn("SourcePhotos table not found. Please create it in Airtable.");
            return [];
        }
        return [];
    }

    const data = await response.json();
    return data.records.map((r: any) => ({
        id: r.id,
        name: r.fields.Name || 'Untitled',
        imageUrl: r.fields.ImageUrl || '',
        tags: r.fields.Tags || [],
        createdAt: r.createdTime
    })).sort((a: SourcePhoto, b: SourcePhoto) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
};

// Upload a new source photo (to ImgBB first, then save URL to Airtable)
export const uploadSourcePhoto = async (
    config: AirtableConfig,
    name: string,
    base64Image: string,
    tags?: string[]
): Promise<SourcePhoto> => {
    if (!config.imgbbApiKey) {
        throw new Error("ImgBB API key is required to upload source photos. Configure it in Settings.");
    }

    // First upload to ImgBB
    const imageUrl = await uploadToImgBB(config.imgbbApiKey, base64Image);

    // Then save to Airtable
    const url = `https://api.airtable.com/v0/${config.baseId}/SourcePhotos`;
    const fields: any = {
        "Name": name,
        "ImageUrl": imageUrl
    };
    if (tags && tags.length > 0) {
        fields["Tags"] = tags;
    }

    const payload = { fields, typecast: true };
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Airtable Error: ${err.error?.message || response.statusText}`);
    }

    const r = await response.json();
    return {
        id: r.id,
        name: r.fields.Name,
        imageUrl: r.fields.ImageUrl,
        tags: r.fields.Tags || [],
        createdAt: r.createdTime
    };
};

// Delete a source photo from Airtable (ImgBB doesn't support deletion via API)
export const deleteSourcePhoto = async (config: AirtableConfig, recordId: string): Promise<void> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/SourcePhotos/${recordId}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
    });

    if (!response.ok) {
        throw new Error("Failed to delete source photo");
    }
};

// Update source photo name/tags
export const updateSourcePhoto = async (
    config: AirtableConfig,
    recordId: string,
    updates: { name?: string; tags?: string[] }
): Promise<SourcePhoto> => {
    const url = `https://api.airtable.com/v0/${config.baseId}/SourcePhotos/${recordId}`;
    const fields: any = {};
    if (updates.name) fields["Name"] = updates.name;
    if (updates.tags) fields["Tags"] = updates.tags;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
    });

    if (!response.ok) {
        throw new Error("Failed to update source photo");
    }

    const r = await response.json();
    return {
        id: r.id,
        name: r.fields.Name,
        imageUrl: r.fields.ImageUrl,
        tags: r.fields.Tags || [],
        createdAt: r.createdTime
    };
};
