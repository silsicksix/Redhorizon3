# Panduan Pertahanan OSINT: Lure & Sting

Panduan ini bertujuan untuk pendidikan keselamatan bagi mengelakkan anda menjadi mangsa teknik "Sting" (penangkapan maklumat lokasi & peranti).

## 1. Bagaimana Teknik Ini Berfungsi?
Teknik yang digunakan dalam modul ini adalah gabungan **Social Engineering** dan **Browser Fingerprinting**:

1.  **Lure (Umpan):** Penyerang mencipta alasan yang munasabah untuk anda membuka link (Contoh: "Unlock PDF", "Claim Prize").
2.  **Metadata Capture (Senyap):** Sebaik sahaja link dibuka, browser anda secara automatik menghantar:
    *   **Alamat IP:** Mengetahui lokasi kasar anda dan pembekal internet (ISP).
    *   **User Agent:** Mengetahui jenis telefon/laptop, model, dan OS anda.
    *   **Battery Level:** Digunakan untuk membezakan peranti yang unik (Fingerprinting).
3.  **GPS Sting (Aktif):** Penyerang meminta kebenaran "Location/GPS". Jika anda klik "Allow", mereka akan mendapat koordinat tepat rumah atau lokasi anda (ketepatan sehingga 1-5 meter).

## 2. Mengapa Link Google AI Studio Meminta Login?
Aplikasi yang dihoskan di Google AI Studio (seperti app ini) mempunyai lapisan keselamatan Google:
*   **Google Auth:** Google mahu memastikan hanya pengguna yang sah menggunakan sumber platform mereka.
*   **Red Flag:** Secara teknikal, teknik penangkapan maklumat sebenar **tidak akan meminta anda login Google** (kerana ia akan menakutkan mangsa). Penyerang akan menggunakan custom domain (seperti `check-secure-file.com`) untuk kelihatan lebih profesional.

## 3. Cara Mengenalpasti Link Berbahaya
Walaupun penyerang menggunakan **URL Shortener** (seperti bit.ly), anda boleh mengesannya:
1.  **Gunakan URL Expander:** Gunakan perkhidmatan seperti `expandurl.net` untuk melihat destinasi sebenar sebelum klik.
2.  **Periksa Parameter:** Jika link asal nampak seperti `...?target_id=xyz`, itu adalah sistem penjejakan.
3.  **Logik Kebenaran:** Mengapa PDF perlukan GPS? Tiada dokumen statik yang memerlukan lokasi tepat anda untuk dibuka. Jika diminta, ia adalah **Sting**.

## 4. Langkah Perlindungan
*   **Gunakan VPN:** Ini akan memberikan IP server VPN kepada penyerang, bukan IP rumah anda.
*   **Deny GPS:** Selalu klik "Deny" jika diminta kebenaran lokasi oleh laman web yang tidak dipercayai.
*   **Incognito/Private Mode:** Tidak menghalang IP capture, tetapi membantu mengurangkan data fingerprinting yang tersimpan dalam cookies.
*   **Browser Tor:** Cara terbaik untuk kekal anonim, walaupun anda secara tidak sengaja klik link "Sting".
