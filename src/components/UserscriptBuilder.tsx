import React, { useState } from 'react';
import { X, Copy, Code, ArrowRight, ShieldCheck, Globe, Webhook, Box, Target } from 'lucide-react';

interface UserscriptBuilderProps {
  onClose: () => void;
  onLog: (msg: string, type: 'info'|'success'|'warning'|'error') => void;
}

const UserscriptBuilder: React.FC<UserscriptBuilderProps> = ({ onClose, onLog }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'script' | 'guide'>('info');

  const scriptTemplate = `// ==UserScript==
// @name         Red Horizon OSINT Web Extractor
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Bypass CORS & Extract OSINT data from any website directly to Red Horizon.
// @author       Red Horizon Investigator
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    console.log('[Red Horizon] OSINT Extractor Active (v1.5)');

    function initTrigger() {
        if (document.getElementById('red-horizon-container')) return;

        // Initialize OSINT Memory Buffer in sessionStorage
        if (!sessionStorage.getItem('OSINT_MEMORY')) {
            sessionStorage.setItem('OSINT_MEMORY', JSON.stringify({
                friends: [],
                about_data: [],
                emails: [],
                photos: [],
                comments: []
            }));
        }

        // Background Data Collector
        const observeTarget = document.documentElement;
        const memoryObserver = new MutationObserver(() => {
            try {
                const memString = sessionStorage.getItem('OSINT_MEMORY') || '{}';
                const memory = JSON.parse(memString);
                let updated = false;

                // Collect About/Profile Data
                const sectionTexts = Array.from(document.querySelectorAll('div[data-pagelet^="ProfileAppSection_"], #pagelet_timeline_main_column, div[data-pagelet="ProfileTilesFeed_0"]'));
                if (window.location.href.includes('about') || window.location.href.includes('friends') || window.location.href.includes('followers')) {
                    const mainRole = document.querySelector('[role="main"]');
                    if (mainRole) sectionTexts.push(mainRole);
                }
                
                sectionTexts.forEach(section => {
                    const txt = section.innerText;
                    if (txt && txt.length > 20 && !memory.about_data.includes(txt)) {
                        memory.about_data.push(txt);
                        updated = true;
                    }
                });

                // Original Photos
                const photoAnchors = Array.from(document.querySelectorAll('a[href*="/photo/"]'));
                photoAnchors.forEach(a => {
                    const cleanUrl = a.href.split('&__cft__')[0];
                    if (!memory.photos.includes(cleanUrl)) {
                        memory.photos.push(cleanUrl);
                        updated = true;
                    }
                });

                // Emails
                const emails = document.body.innerText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)/gi) || [];
                emails.forEach(e => {
                    if (!memory.emails.includes(e)) {
                        memory.emails.push(e);
                        updated = true;
                    }
                });

                if (updated) {
                    sessionStorage.setItem('OSINT_MEMORY', JSON.stringify(memory));
                }
            } catch(e) {}
        });

        // Run observer every few seconds instead of on every DOM mutation to save CPU, but mutation observer is fine if debounced.
        let timeout;
        const debouncedObserver = new MutationObserver((mutations) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => memoryObserver.observe(observeTarget, {childList: false}), 1000); 
            // Call the logic directly via debounce
            memoryObserver.takeRecords(); 
            // Trigger manual scrape
        });
        
        // Manual interval since React/FB SPA is crazy
        setInterval(() => {
            try {
                const mem = JSON.parse(sessionStorage.getItem('OSINT_MEMORY') || '{}');
                let updated = false;
                
                const sectionTexts = Array.from(document.querySelectorAll('div[data-pagelet^="ProfileAppSection_"], #pagelet_timeline_main_column, div[data-pagelet="ProfileTilesFeed_0"]'));
                if (window.location.href.includes('about') || window.location.href.includes('friends') || window.location.href.includes('followers')) {
                    const mainRole = document.querySelector('[role="main"]');
                    if (mainRole) sectionTexts.push(mainRole);
                }
                sectionTexts.forEach(section => {
                    const txt = section.innerText;
                    if (txt && txt.length > 20 && !mem.about_data.includes(txt)) {
                        mem.about_data.push(txt);
                        updated = true;
                    }
                });

                const photoAnchors = Array.from(document.querySelectorAll('a[href*="/photo/"]'));
                photoAnchors.forEach(a => {
                    const cleanUrl = a.href.split('&__cft__')[0];
                    if (!mem.photos.includes(cleanUrl)) {
                        mem.photos.push(cleanUrl);
                        updated = true;
                    }
                });

                const emails = document.body.innerText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)/gi) || [];
                emails.forEach(e => {
                    if (!mem.emails.includes(e)) {
                        mem.emails.push(e);
                        updated = true;
                    }
                });

                if (updated) {
                    sessionStorage.setItem('OSINT_MEMORY', JSON.stringify(mem));
                }
            } catch(e){}
        }, 3000); // Scrape DOM every 3 seconds into memory


        const container = document.createElement('div');
        container.id = 'red-horizon-container';
        container.style.cssText = 'position: fixed !important; bottom: 20px !important; right: 20px !important; z-index: 2147483647 !important; display: flex !important; flex-direction: column !important; gap: 10px !important; pointer-events: auto !important; width: 250px !important; background: transparent !important;';

        const btn = document.createElement('button');
        btn.id = 'red-horizon-extractor';
        btn.innerHTML = '🎯 Extract OSINT (Fast)';
        btn.style.cssText = 'background: #ff0033 !important; color: #fff !important; padding: 12px !important; border: 1px solid #ff0033 !important; border-radius: 4px !important; font-family: monospace !important; font-weight: bold !important; cursor: pointer !important; box-shadow: 0 0 15px rgba(255,0,51,0.6) !important; opacity: 0.9 !important; transition: all 0.3s !important; width: 100% !important; display: block !important; font-size: 12px !important; text-align: center !important; text-transform: uppercase !important; pointer-events: auto !important;';

        container.appendChild(btn);
        
        btn.onmouseover = () => { btn.style.opacity = '1'; btn.style.transform = 'scale(1.02)'; };
        btn.onmouseout = () => { btn.style.opacity = '0.9'; btn.style.transform = 'scale(1)'; };
        
        document.body.appendChild(container);
        console.log('[Red Horizon] UI Injected');

        const getHighResImage = (url) => {
            if (!url) return '';
            return url;
        };

        const executeSimpleExtraction = async () => {
            btn.innerHTML = '⏳ EXTRACTING...';
            const elements = document.querySelectorAll('[role="article"], [data-ad-comet-preview="message"], .comment-body');
            let data = [];
            elements.forEach(el => {
                const text = el.innerText;
                const img = el.querySelector('img')?.src;
                if (text && text.length > 20) data.push({ text: text.substring(0, 500) + '...', img: img });
            });
            GM_setClipboard(JSON.stringify(data, null, 2));
            btn.innerHTML = '✅ COPIED!';
            setTimeout(() => btn.innerHTML = '🎯 Extract OSINT (Fast)', 2000);
        };

        const executeExtraction = async (isDeep) => {
            const originalText = isDeep ? btnDeep.innerHTML : btn.innerHTML;
            if (isDeep) {
                btnDeep.innerHTML = '⏳ SCANNING...';
                progressLog.style.display = 'block';
                progressLog.innerHTML = 'Starting invisible XHR fetch...<br/>';
            } else {
                btn.innerHTML = '⏳ EXTRACTING...';
            }
            
            // Function to find the main author/page (Target)
            const authorLink = document.querySelector('h1 a, h2 a, h3 a, [role="main"] h1, [role="main"] h2 a') || document.querySelector('a[role="link"]');
            const pageName = authorLink ? authorLink.innerText.trim() : document.title;
            const pageUrl = authorLink && authorLink.href ? authorLink.href : window.location.href;
            
            // Function to find main avatar/poster image
            let pageAvatarRaw = '';
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage) {
                pageAvatarRaw = ogImage.getAttribute('content');
            } else {
                const h1 = document.querySelector('h1');
                if (h1) {
                    let h1Container = h1.parentElement;
                    while (h1Container && h1Container.tagName !== 'BODY') {
                        const img = h1Container.querySelector('image, img');
                        if (img) {
                            pageAvatarRaw = img.tagName.toLowerCase() === 'image' ? (img.getAttribute('xlink:href') || img.getAttribute('href')) : img.src;
                            break;
                        }
                        h1Container = h1Container.parentElement;
                    }
                }
            }
            if(!pageAvatarRaw) {
                const pageImgCandidates = Array.from(document.querySelectorAll('image, img')).filter(el => {
                    const src = el.tagName.toLowerCase() === 'image' ? (el.getAttribute('xlink:href') || el.getAttribute('href')) : el.src;
                    const rect = el.getBoundingClientRect();
                    return src && (src.includes('fbcdn') || src.includes('scontent') || src.includes('profile')) && !src.includes('emoji') && rect.width > 50;
                });
                pageAvatarRaw = pageImgCandidates.length > 0 ? (pageImgCandidates[0].tagName.toLowerCase() === 'image' ? (pageImgCandidates[0].getAttribute('xlink:href') || pageImgCandidates[0].getAttribute('href')) : pageImgCandidates[0].src) : '';
            }
            const pageAvatar = pageAvatarRaw;

            let targetProfilePhotoLink = '';
            const allPhotoLinks = Array.from(document.querySelectorAll('a[href*="/photo/"]'));
            const headerRole = document.querySelector('[role="main"]') || document.body;
            const headerPhotoLinks = Array.from(headerRole.querySelectorAll('a[href*="/photo/"]'));
            if (headerPhotoLinks.length > 0) {
                targetProfilePhotoLink = headerPhotoLinks[0].href.split('&__cft__')[0];
            } else if (allPhotoLinks.length > 0) {
                targetProfilePhotoLink = allPhotoLinks[0].href.split('&__cft__')[0];
            }

            let postText = '';
            const firstArticle = document.querySelector('[role="article"]');
            if (firstArticle) {
                let postTextElem = firstArticle.querySelector('[data-ad-comet-preview="message"]');
                if (!postTextElem) {
                    const dirs = Array.from(firstArticle.querySelectorAll('div[dir="auto"]')).filter(d => d.innerText.length > 20 && !d.querySelector('div[dir="auto"]'));
                    if (dirs.length > 0) postTextElem = dirs[0];
                }
                postText = postTextElem ? postTextElem.innerText : firstArticle.innerText.split('\\n').slice(0, 15).join(' ');
            } else {
                postText = document.body.innerText.substring(0, 1000);
            }
            
            
            let mainPostTimestamp = '';
            if (firstArticle) {
                const timeEl = firstArticle.querySelector('a[href*="/posts/"] span, a[href*="/permalink/"] span, abbr, bdo');
                mainPostTimestamp = timeEl ? timeEl.innerText : '';
                if (!mainPostTimestamp) {
                    const linksWithTime = Array.from(firstArticle.querySelectorAll('a')).find(a => /([1-9][0-9]? (h|m|d)|hrs?|mins?|days?|[A-Z][a-z]{2} \\d{1,2}|Yesterday)/i.test(a.innerText));
                    mainPostTimestamp = linksWithTime ? linksWithTime.innerText.trim() : '';
                }
            }

            let aboutData = "";
            const aboutSection = document.querySelector('div[data-pagelet="ProfileAppSection_0"], div[data-pagelet="ProfileAppSection_1"], #pagelet_timeline_main_column');
            const introSection = document.querySelector('div[data-pagelet="ProfileTilesFeed_0"]');
            if (aboutSection) {
                aboutData = aboutSection.innerText;
            } else if (window.location.href.includes('about') || window.location.href.includes('friends') || window.location.href.includes('followers')) {
                const mainRole = document.querySelector('[role="main"]');
                if (mainRole) aboutData = mainRole.innerText;
            }
            if (introSection) {
                aboutData += "\\n\\nINTRO:\\n" + introSection.innerText;
            }

            let postImages = [];
            let originalPhotoLinks = [];
            if (firstArticle) {
                 const postImgElements = Array.from(firstArticle.querySelectorAll('img')).filter(img => {
                     return img.src && (img.src.includes('fbcdn') || img.src.includes('scontent')) && (img.width > 150 || img.height > 150) && !img.src.includes('p100x100'); 
                 });
                 postImages = postImgElements.map(img => getHighResImage(img.src));

                 const photoAnchors = Array.from(firstArticle.querySelectorAll('a[href*="/photo/"]'));
                 originalPhotoLinks = photoAnchors.map(a => a.href.split('&__cft__')[0]);
            }

            let memory = {};
            try {
                memory = JSON.parse(sessionStorage.getItem('OSINT_MEMORY') || '{}');
            } catch(e){}

            let commentsRaw = Array.from(document.querySelectorAll('[role="article"]')).map((article, index) => {
                const links = Array.from(article.querySelectorAll('a[role="link"]'));
                const userLink = links.find(a => a.innerText.trim().length > 0) || links[0];
                const profileUrl = userLink ? userLink.href.split('?')[0].split('&')[0] : '';
                
                const svgImage = article.querySelector('image');
                const imgElements = Array.from(article.querySelectorAll('img'));
                let avatarUrlRaw = svgImage ? (svgImage.getAttribute('xlink:href') || svgImage.getAttribute('href')) : '';
                if (!avatarUrlRaw) {
                    const validImg = imgElements.find(img => img.src && (img.src.includes('fbcdn') || img.src.includes('scontent') || img.src.length > 100) && (img.width < 150 && img.height < 150));
                    if (validImg) avatarUrlRaw = validImg.src;
                }
                const avatarUrl = getHighResImage(avatarUrlRaw);

                const attachedImages = imgElements.filter(img => img.src && (img.src.includes('fbcdn') || img.src.includes('scontent')) && (img.width >= 100 || img.height >= 100) && !img.src.includes('p100x100')).map(img => getHighResImage(img.src));
                const commentPhotoAnchors = Array.from(article.querySelectorAll('a[href*="/photo/"]'));
                const commentOriginalUrls = commentPhotoAnchors.map(a => a.href.split('&__cft__')[0]);

                const idExtract = profileUrl.match(/id=(\\d+)/) || profileUrl.match(/facebook\\.com\\/profile\\.php\\?id=(\\d+)/) || article.innerHTML.match(/hovercard.*?id=(\\d+)/i) || profileUrl.match(/\\.com\\/([^/?&]+)/);
                const fbIdMatch = idExtract && idExtract[1] !== 'groups' ? idExtract[1] : 'N/A';
                
                const timeEl = article.querySelector('a[href*="/posts/"] span, a[href*="/permalink/"] span, a[href*="/comment/"] span, abbr, bdo');
                let extractedTime = timeEl ? timeEl.innerText : '';
                if (!extractedTime) {
                    const linksWithTime = Array.from(article.querySelectorAll('a')).find(a => /([1-9][0-9]? (h|m|d)|hrs?|mins?|days?|[A-Z][a-z]{2} \\d{1,2}|Yesterday|Just now)/i.test(a.innerText));
                    extractedTime = linksWithTime ? linksWithTime.innerText.trim() : '';
                }

                const timeLinkEl = article.querySelector('a[href*="/posts/"], a[href*="/permalink/"], a[href*="/comment/"]');
                const commentUrl = timeLinkEl ? (timeLinkEl as HTMLAnchorElement).href.split('?')[0].split('&')[0] : '';

                let commentTextElem = article.querySelector('[data-ad-comet-preview="message"]');
                if (!commentTextElem) {
                    // Fallback to div dirs if data-ad doesn't exist
                    const dirs = Array.from(article.querySelectorAll('div[dir="auto"]')).filter(d => d.innerText.length > 20 && !d.querySelector('div[dir="auto"]'));
                    if (dirs.length > 0) {
                        commentTextElem = dirs[0];
                    }
                }
                const extractedText = commentTextElem ? commentTextElem.innerText : article.innerText.split('\\n').slice(0, 15).join(' ').substring(0, 1000);

                return {
                    user: userLink?.innerText.trim() || 'Unknown Account',
                    fb_id: fbIdMatch,
                    profile_url: profileUrl,
                    avatar_url: avatarUrl || '',
                    attached_images: attachedImages,
                    original_photo_links: [...new Set(commentOriginalUrls)],
                    timestamp: extractedTime,
                    comment_url: commentUrl,
                    text: extractedText
                };
            }).filter(c => c && c.user !== 'Unknown Account');

            // --- DEEP XHR SCAN LOGIC ---
            if (isDeep) {
                // Get unique profiles to avoid spamming the same commenter
                const uniqueComments = [];
                const seenProfiles = new Set();
                for (let c of commentsRaw) {
                    if (!seenProfiles.has(c.profile_url)) {
                        seenProfiles.add(c.profile_url);
                        uniqueComments.push(c);
                    }
                }
                
                for (let i = 0; i < uniqueComments.length; i++) {
                    const c = uniqueComments[i];
                    progressLog.innerHTML = \`Fetching \${i+1}/\${uniqueComments.length}: \${c.user}...\`;
                    progressLog.scrollTop = progressLog.scrollHeight;
                    
                    if (!c.profile_url || c.profile_url.includes('facebook.com/groups')) continue; // skip group links

                    try {
                        const hiResAvatar = await new Promise((resolve) => {
                            GM_xmlhttpRequest({
                                method: "GET",
                                url: c.profile_url,
                                timeout: 5000,
                                onload: function(response) {
                                    const match = response.responseText.match(/<meta property="og:image" content="([^"]+)"/);
                                    if (match && match[1]) {
                                        resolve(match[1].replace(/&amp;/g, '&'));
                                    } else {
                                        resolve(null);
                                    }
                                },
                                onerror: () => resolve(null),
                                ontimeout: () => resolve(null)
                            });
                        });
                        
                        if (hiResAvatar) {
                            // Update all comments by this user
                            commentsRaw.forEach(comm => {
                                if (comm.profile_url === c.profile_url) {
                                    comm.avatar_url = hiResAvatar;
                                    comm.deep_scanned = true;
                                }
                            });
                        }
                    } catch(e) {}
                    
                    // Delay to avoid aggressive rate-limiting
                    await new Promise(r => setTimeout(r, 1000));
                }
                progressLog.innerHTML += '<br/>Scan complete!';
                setTimeout(() => { progressLog.style.display = 'none'; }, 3000);
            }

            const osintPayload = {
                source_url: window.location.href,
                page_title: document.title,
                osint_data: {
                    author: pageName,
                    author_url: pageUrl,
                    author_avatar: pageAvatar,
                    target_photo_link: targetProfilePhotoLink,
                    main_post_text: postText,
                    main_post_timestamp: mainPostTimestamp,
                    main_post_images: postImages,
                    original_photo_links: [...new Set([...originalPhotoLinks, ...(memory.photos || [])])],
                    about_profile_data: (aboutData + "\\n\\n-- BACKGROUND MEMORY --\\n" + (memory.about_data ? memory.about_data.join("\\n---\\n") : "")).substring(0, 15000),
                },
                meta_desc: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
                emails_found: [...new Set([...(document.body.innerText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)/gi) || []), ...(memory.emails || [])])],
                comments: commentsRaw
            };
            
            osintPayload.emails_found = [...new Set(osintPayload.emails_found)];
            GM_setClipboard(JSON.stringify(osintPayload, null, 2));
            
            const btnTarget = isDeep ? btnDeep : btn;
            btnTarget.innerHTML = '✅ COPIED!';
            btnTarget.style.background = '#10b981';
            
            setTimeout(() => {
                btnTarget.innerHTML = originalText;
                btnTarget.style.background = isDeep ? '#00ccff' : '#ff0033';
            }, 3000);
        };

        btn.onclick = () => executeExtraction();
    }

    // Periodic injection check for robust SPA support
    setInterval(() => {
        if (document.body && !document.getElementById('red-horizon-container')) {
            initTrigger();
        }
    }, 2000);
})();
`;

  const handleCopy = () => {
      navigator.clipboard.writeText(scriptTemplate);
      onLog("Tampermonkey script copied to clipboard!", "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 p-4">
      <div className="bg-[#0a0a0a] border border-[#ff0033]/30 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(255,0,51,0.1)] relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#ff0033]/20 bg-black/60 shrink-0">
          <div className="flex items-center gap-3">
            <Webhook className="text-[#ff0033]" size={20} />
            <div>
              <h2 className="text-white font-black uppercase tracking-wider text-sm flex items-center gap-2">
                Web Extension Builder
              </h2>
              <p className="text-gray-500 text-[10px] font-mono">Bypass Browser CORS & DOM Scraping Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-[#ff0033] hover:bg-[#ff0033]/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/5 bg-black/40 flex flex-col p-2 space-y-1 shrink-0">
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center gap-2 p-3 text-xs font-mono uppercase tracking-wider text-left transition-colors border-l-2 ${activeTab === 'info' ? 'border-[#ff0033] bg-[#ff0033]/10 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                    <ShieldCheck size={14} /> Information
                </button>
                <button 
                  onClick={() => setActiveTab('script')}
                  className={`flex items-center gap-2 p-3 text-xs font-mono uppercase tracking-wider text-left transition-colors border-l-2 ${activeTab === 'script' ? 'border-[#00ccff] bg-[#00ccff]/10 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                    <Code size={14} /> Tampermonkey Payload
                </button>
                <button 
                  onClick={() => setActiveTab('guide')}
                  className={`flex items-center gap-2 p-3 text-xs font-mono uppercase tracking-wider text-left transition-colors border-l-2 ${activeTab === 'guide' ? 'border-[#ffcc00] bg-[#ffcc00]/10 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                    <Target size={14} /> Operations Guide
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 p-6">
                
                {activeTab === 'info' && (
                  // ... existing info content
                  <div className="space-y-6 text-gray-300 text-sm leading-relaxed font-mono">
                      <div className="bg-[#ff0033]/5 border border-[#ff0033]/20 p-4 rounded-sm">
                          <h3 className="text-[#ff0033] font-black uppercase text-xs mb-2 flex items-center gap-2"><Globe size={14} /> Apa itu Isu CORS?</h3>
                          <p className="mb-2">
                              Cross-Origin Resource Sharing (CORS) adalah halangan keselamatan standard yang diimplementasikan oleh <strong>semua pelayar web arus perdana (Chrome, Firefox, Safari)</strong>. Ia menghalang aplikasi web dari membaca data daripada domain lain tanpa kebenaran.
                          </p>
                          <p>
                              Walaupun anda membina pelayar berasaskan Chromium anda sendiri, melumpuhkan CORS (contoh: flag <code className="bg-black text-red-400 px-1">--disable-web-security</code>) tidak digalakkan kerana ia akan mendedahkan PC anda kepada serangan siber (XSS/CSRF) ketika melayari web biasa.
                          </p>
                      </div>

                      <div className="bg-[#00ccff]/5 border border-[#00ccff]/20 p-4 rounded-sm">
                          <h3 className="text-[#00ccff] font-black uppercase text-xs mb-2 flex items-center gap-2"><Box size={14} /> Penyelesaian: Extension / Tampermonkey</h3>
                          <p className="mb-2">
                              Idea anda untuk menggunakan Tampermonkey adalah <strong>cemerlang dan merupakan teknik standard yang digunapakai oleh penganalisis OSINT profesional</strong>.
                          </p>
                          <ul className="list-disc pl-5 space-y-2 text-xs">
                              <li><strong>Bypass CORS Sepenuhnya:</strong> Extension (dan skrip Tampermonkey) mempunyai privileges khas (API <code className="text-[#00ccff]">GM_xmlhttpRequest</code>) yang membenarkan anda membuat carian atau POST lintas-domain tanpa disekat oleh pelayar.</li>
                              <li><strong>Akses DOM Secara Natif:</strong> Kod berjalan di dalam konteks tab laman web sasaran (seperti FB/Twitter), membolehkannya mengekstrak struktur HTML, maklumat profil tersembunyi, URL gambar, yang tidak dapat dibaca dari luar profil.</li>
                              <li><strong>Bahasa Pengaturcaraan:</strong> Bahasa yang wajib dan paling sesuai digunakan ialah <strong>JavaScript</strong>. Anda juga boleh menggunakan <strong>TypeScript</strong> dan _compile_ kepada JavaScript.</li>
                          </ul>
                      </div>
                      
                      <button onClick={() => setActiveTab('script')} className="mt-4 flex items-center gap-2 text-[#00ccff] hover:text-white transition-colors text-xs font-bold uppercase tracking-widest bg-[#00ccff]/10 px-4 py-2 border border-[#00ccff]/30">
                          Lihat Contoh Skrip Payload <ArrowRight size={14} />
                      </button>
                  </div>
                )}

                {activeTab === 'script' && (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-[#00ccff] font-black uppercase text-xs">Userscript Payload (JavaScript)</h3>
                                <p className="text-gray-500 text-[10px]">Copy skrip ini dan masukkan (Add New Script) dalam Tampermonkey.</p>
                            </div>
                            <button onClick={handleCopy} className="flex items-center gap-2 bg-[#00ccff]/20 text-[#00ccff] hover:bg-[#00ccff] hover:text-black border border-[#00ccff] px-4 py-2 transition-all font-bold text-xs uppercase">
                                <Copy size={12} /> Salin Skrip
                            </button>
                        </div>
                        
                        <div className="flex-1 bg-[#111] border border-white/10 relative overflow-hidden group">
                            <pre className="p-4 text-[#00ccff] font-mono text-[11px] h-full overflow-y-auto custom-scrollbar outline-none shadow-inner w-full">
                                <code>{scriptTemplate}</code>
                            </pre>
                        </div>
                    </div>
                )}

                {activeTab === 'guide' && (
                    <div className="space-y-8 animate-in fade-in duration-500 font-mono">
                        <div className="border-l-2 border-[#ffcc00] pl-6 space-y-8">
                            <div className="relative">
                                <div className="absolute -left-[31px] top-0 w-4 h-4 bg-[#ffcc00] rounded-full shadow-[0_0_10px_#ffcc00]"></div>
                                <h4 className="text-white font-black uppercase text-sm mb-2">1. Pasang Tampermonkey</h4>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    Muat turun extension Tampermonkey dari Chrome Web Store. Ini adalah enjin yang akan menjalankan skrip pengintipan kita di dalam laman web sasaran.
                                </p>
                            </div>

                            <div className="relative">
                                <div className="absolute -left-[31px] top-0 w-4 h-4 bg-[#ffcc00] rounded-full shadow-[0_0_10px_#ffcc00]"></div>
                                <h4 className="text-white font-black uppercase text-sm mb-2">2. Injek Payload & Padam Versi Lama</h4>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    Pergi ke tab <span className="text-[#00ccff] font-bold">Tampermonkey Payload</span>, salin kod tersebut. Jika anda ada versi lama, <strong className="text-red-400">PADAM sepenuhnya code tersebut</strong> terlebih dahulu, dan paste kod baru ini. Klik File {">"} Save. Refresh halaman sasaran.
                                </p>
                            </div>

                            <div className="relative">
                                <div className="absolute -left-[31px] top-0 w-4 h-4 bg-[#ffcc00] rounded-full shadow-[0_0_10px_#ffcc00]"></div>
                                <h4 className="text-white font-black uppercase text-sm mb-2">3. Aktifkan di Laman Sasaran</h4>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    Buka laman Facebook/Twitter suspek. Anda akan nampak DUA butang di penjuru bawah:
                                    <br/><br/>
                                    <span className="text-[#00ccff] font-bold border border-[#00ccff] p-1 bg-[#00ccff]/10">🕵️ Deep XHR (Hi-Res)</span> - Scan penuh dan dapatkan resolusi maksimun (Mempunyai bar loading, agak perlahan tapi tepat).
                                    <br/><br/>
                                    <span className="text-[#ff0033] font-bold border border-[#ff0033] p-1 bg-[#ff0033]/10">🎯 Extract OSINT (Fast)</span> - Sekadar curi thumbnail yang terpampang untuk pantas.
                                </p>
                            </div>

                            <div className="relative">
                                <div className="absolute -left-[31px] top-0 w-4 h-4 bg-[#ffcc00] rounded-full shadow-[0_0_10px_#ffcc00]"></div>
                                <h4 className="text-white font-black uppercase text-sm mb-2">4. Kembali & Proses</h4>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    Buka menu <span className="text-[#ffcc00] font-bold">AI DATA PROCESSOR</span> (ikon Target di Top Bar). Paste JSON data tadi. Pilih modul <span className="text-[#00ccff] underline">Social Analyzer</span> atau <span className="text-[#00ccff] underline">Stylometry Lab</span>.
                                </p>
                            </div>

                            <div className="relative">
                                <div className="absolute -left-[31px] top-0 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                                <h4 className="text-white font-black uppercase text-sm mb-2">5. Analisis Hasil</h4>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    AI akan memproses lambakan komen dan profil tadi menjadi satu Hubungan Graf yang jelas. Anda kini boleh melihat siapa yang paling aktif berinteraksi dengan sasaran.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default UserscriptBuilder;
