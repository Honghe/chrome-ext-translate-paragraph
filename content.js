// Track the currently hovered paragraph
let currentParagraph = null;

document.addEventListener('mouseover', (e) => {
    if (e.target.tagName.toLowerCase() === 'p') {
        currentParagraph = e.target;
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target === currentParagraph) {
        currentParagraph = null;
    }
});

// Handle shift key press for translation toggle
document.addEventListener('keydown', async (e) => {
    if (e.key === 'Shift' && currentParagraph) {
        console.log('[Translator] Shift pressed while hovering paragraph');
        const isTranslated = currentParagraph.dataset.translated === 'true';
        
        if (isTranslated) {
            // Remove translation
            const nextElement = currentParagraph.nextElementSibling;
            if (nextElement && nextElement.className === 'translation-text') {
                nextElement.remove();
            }
            currentParagraph.dataset.translated = 'false';
            console.log('[Translator] Removed translation');
        } else {
            // Add translation
            await translateParagraph(currentParagraph);
        }
    }
});

// Function to handle translation
async function translateParagraph(paragraph) {
    // More specific paragraph check
    const isParagraph = paragraph.tagName.toLowerCase() === 'p';
    console.log('[Translator] Paragraph check:', {
        isParagraph: isParagraph,
        tagName: paragraph.tagName,
        isTranslated: paragraph.dataset.translated
    });
    
    // Check if target is a paragraph and hasn't been translated yet
    if (isParagraph && paragraph.dataset.translated !== 'true') {
        console.log('[Translator] Processing paragraph element:', paragraph);
        const originalText = paragraph.textContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ');
        console.log('[Translator] Text to translate:', originalText);
        
        try {
            // Send translation request to background script
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { action: 'translate', text: originalText },
                    response => {
                        if (response.success) {
                            resolve(response.data);
                        } else {
                            reject(new Error(response.error));
                        }
                    }
                );
            });
            
            console.log('[Translator] Received translation data:', result);
            const translatedText = result[0][0];
            console.log('[Translator] Processed translated text:', translatedText);

            // Create translation element
            const translationElement = document.createElement('div');
            translationElement.textContent = translatedText;
            translationElement.style.display = 'block';
            translationElement.style.marginTop = '10px';
            translationElement.style.color = '#333';
            translationElement.style.fontStyle = 'normal';
            translationElement.className = 'translation-text';
            console.log('[Translator] Created translation element:', translationElement);

            // Insert translation after original paragraph
            paragraph.parentNode.insertBefore(translationElement, paragraph.nextSibling);
            console.log('[Translator] Inserted translation into DOM');
            
            // Mark paragraph as translated
            paragraph.dataset.translated = 'true';
            console.log('[Translator] Marked paragraph as translated');
        } catch (error) {
            console.error('[Translator] Translation failed:', error);
        }
    }
};
