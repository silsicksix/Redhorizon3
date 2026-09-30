import { Node, Link, GraphData } from '../types';
import { areNodesSyntacticallyEqual, mergeNodeData } from './graphMergeUtils';

export function parseOfflineComments(jsonInput: string): GraphData {
    try {
        const data = JSON.parse(jsonInput);
        const nodes: Node[] = [];
        const links: Link[] = [];

        // Structure from UserscriptBuilder.tsx:
        // {
        //   source_url, page_title, meta_desc, emails_found,
        //   comments: [ { user, fb_id, profile_url, avatar_url, text }, ... ]
        // }

        if (data && data.comments && Array.isArray(data.comments)) {
            // Central Page Node
            const pageNodeId = 'node_source_page_' + btoa(data.source_url || 'unknown').substring(0, 8);
            
            const now = new Date();
            
            const mainPageDetails = [];
            mainPageDetails.push(`Source URL: ${data.source_url}`);
            // Add a synthetic timestamp so TimelineWorkspace detects it
            
            mainPageDetails.push(`Captured At: ${now.toISOString()}`);
            if (data.osint_data?.main_post_timestamp) mainPageDetails.push(`Original Time: ${data.osint_data.main_post_timestamp}`);
            if (data.meta_desc) mainPageDetails.push(`Description: ${data.meta_desc}`);
            if (data.osint_data?.author_url) mainPageDetails.push(`PROFILE_URL: ${data.osint_data.author_url}`);
            if (data.osint_data?.author_avatar) mainPageDetails.push(`IMAGE_URL: ${data.osint_data.author_avatar}`);
            if (data.osint_data?.main_post_text) mainPageDetails.push(`POST: ${data.osint_data.main_post_text}`);

            nodes.push({
                id: pageNodeId,
                label: data.osint_data?.author || data.page_title || 'Source Page',
                type: data.osint_data ? 'person' : 'source',
                details: mainPageDetails.join('\n'),
                imageUrl: data.osint_data?.author_avatar || undefined,
                imageUrls: data.osint_data?.main_post_images?.length > 0 ? data.osint_data.main_post_images : (data.osint_data?.author_avatar ? [data.osint_data.author_avatar] : []),
            });

            let minuteOffset = 0;
            data.comments.forEach((c: any) => {
                minuteOffset += 5; // Adds 5 minutes for each subsequent comment to create a staggered timeline
                const commentTime = new Date(now.getTime() + minuteOffset * 60000).toISOString();
                const nodeId = `node_${c.fb_id && c.fb_id !== 'N/A' ? c.fb_id : c.user.replace(/[^a-zA-Z0-9]/g, '_')}`;
                
                const detailsParts = [];
                detailsParts.push(`Captured At: ${commentTime}`);
                if (c.fb_id && c.fb_id !== 'N/A') detailsParts.push(`FB_ID: ${c.fb_id}`);
                
                const candidateNode: Partial<Node> = {
                    id: nodeId,
                    label: c.user,
                    type: 'person',
                    url: c.profile_url && c.profile_url !== 'unknown' ? c.profile_url : undefined,
                    details: (c.fb_id && c.fb_id !== 'N/A' ? `FB_ID: ${c.fb_id}\n` : '') + (c.profile_url ? `PROFILE_URL: ${c.profile_url}` : '')
                };

                // Track if we should add URLs to details (deduplication)
                const existingNode = nodes.find(n => n.id === nodeId || areNodesSyntacticallyEqual(n, candidateNode));
                
                if (c.profile_url && c.profile_url !== 'unknown' && c.profile_url !== '') {
                    // Only add to details if it's a new node or doesn't have it yet
                    if (!existingNode || (existingNode.details && !existingNode.details.includes(c.profile_url))) {
                        detailsParts.push(`PROFILE_URL: ${c.profile_url}`);
                    }
                }
                
                if (c.avatar_url && c.avatar_url !== '') {
                    // Only add to details if not already present to save space/tokens
                    if (!existingNode || (existingNode.details && !existingNode.details.includes(c.avatar_url))) {
                        detailsParts.push(`IMAGE_URL: ${c.avatar_url}`);
                    }
                }

                if (c.timestamp) detailsParts.push(`Original Time: ${c.timestamp}`);
                
                // Add Comment URL if available, otherwise fallback to source_url
                if (c.comment_url) {
                    detailsParts.push(`COMMENT_URL: ${c.comment_url}`);
                } else if (data.source_url) {
                    detailsParts.push(`COMMENT_URL: ${data.source_url}`);
                }

                detailsParts.push(`Snippet: ${c.text}`);
                
                const combinedImages = [];
                if (c.avatar_url) {
                    combinedImages.push(c.avatar_url);
                }
                if (c.attached_images && c.attached_images.length > 0) {
                    combinedImages.push(...c.attached_images);
                    // Also adding to details so it is saved in dossier
                    c.attached_images.forEach((img: string, i: number) => {
                        // Avoid adding duplicate attached images if they already exist in details
                        if (!existingNode || (existingNode.details && !existingNode.details.includes(img))) {
                            detailsParts.push(`Attached Image ${i+1}: ${img}`);
                        }
                    });
                }
                
                if (!existingNode) {
                    nodes.push({
                        id: nodeId,
                        label: c.user,
                        type: 'person',
                        details: detailsParts.join('\n'),
                        imageUrl: c.avatar_url,
                        imageUrls: combinedImages,
                        url: c.profile_url
                    });
                } else {
                    // Update existing node with potentially more images and details
                    if (c.attached_images) {
                        existingNode.imageUrls = [...new Set([...(existingNode.imageUrls || []), ...c.attached_images])];
                    }
                    if (c.avatar_url && !existingNode.imageUrl) {
                        existingNode.imageUrl = c.avatar_url;
                    }
                    existingNode.details += '\n---\n' + detailsParts.join('\n');
                }
                
                const effectiveTargetId = existingNode ? existingNode.id : nodeId;
                // Only link if the author is different from the page node
                if (pageNodeId !== effectiveTargetId) {
                    const linkExists = links.some(l => (l.source === pageNodeId && l.target === effectiveTargetId));
                    if (!linkExists) {
                        links.push({
                            source: pageNodeId,
                            target: effectiveTargetId,
                            label: 'interacted_with'
                        });
                    }
                }
            });
        }
        return { nodes, links };
    } catch (e) {
        console.error("Failed to parse offline data:", e);
        return { nodes: [], links: [] };
    }
}
