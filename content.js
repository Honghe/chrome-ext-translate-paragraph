// Store original attributes of anchors
const anchorAttributesMap = new Map();
let anchorIdCounter = 0;
const STORAGE_KEY = 'triggerKey';
let triggerKey = 'Control'; // default

// Load the current setting from storage
async function loadSetting() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  triggerKey = result[STORAGE_KEY] ?? 'Control';
  console.log('[Content] Loaded modifier key:', triggerKey);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[STORAGE_KEY]) {
    triggerKey = changes[STORAGE_KEY].newValue;
    console.log('[Content] Updated triggerKey to', triggerKey);
  }
});

// Function to process HTML content before translation
function preprocessHtml(htmlContent) {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    
    // Process all anchor tags
    const anchors = container.getElementsByTagName('a');
    for (let anchor of Array.from(anchors)) {
        // Save original attributes
        const attributes = Array.from(anchor.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
        }, {});
        
        // Assign a unique id and store attributes
        const uniqueId = anchorIdCounter++;
        anchorAttributesMap.set(uniqueId, attributes);
        
        // Replace anchor with simplified version
        const simplifiedAnchor = document.createElement('a');
        simplifiedAnchor.id = uniqueId;
        simplifiedAnchor.textContent = anchor.textContent;
        anchor.replaceWith(simplifiedAnchor);
    }
    
    return container.innerHTML;
}

// Function to restore HTML content after translation
function postprocessHtml(htmlContent) {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    
    // Process all anchor tags
    const anchors = container.getElementsByTagName('a');
    for (let anchor of Array.from(anchors)) {
        const id = parseInt(anchor.id);
        if (!isNaN(id) && anchorAttributesMap.has(id)) {
            // Restore original attributes
            const attributes = anchorAttributesMap.get(id);
            const restoredAnchor = document.createElement('a');
            restoredAnchor.textContent = anchor.textContent;
            
            for (let [attrName, attrValue] of Object.entries(attributes)) {
                restoredAnchor.setAttribute(attrName, attrValue);
            }
            
            anchor.replaceWith(restoredAnchor);
            anchorAttributesMap.delete(id); // Cleanup
        }
    }
    
    return container.innerHTML;
}

// Track the currently hovered paragraph
let currentParagraph = null;

document.addEventListener('mouseover', (e) => {
    currentParagraph = e.target;
});

document.addEventListener('mouseout', (e) => {
    if (e.target === currentParagraph) {
        currentParagraph = null;
    }
});

// Handle triggerKey key press for translation toggle
document.addEventListener('keydown', async (e) => {
    if (e.key === triggerKey && currentParagraph) {
        console.log('[Translator] triggerKey pressed while hovering paragraph');
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
    console.log('[Translator] Element check:', {
        tagName: paragraph.tagName,
        isTranslated: paragraph.dataset.translated,
        isListItem: paragraph.tagName.toLowerCase() === 'li'
    });
    
    // Always preserve HTML, but handle list items specially
    console.log('[Translator] Processing element:', paragraph);
    
    // Check if target hasn't been translated yet
    if (paragraph.dataset.translated !== 'true') {
        let textToTranslate;
        
        // Create a container for processing
        const container = document.createElement('div');
        container.innerHTML = paragraph.innerHTML;
        
        // If it's a list item, remove any nested lists before processing
        if (paragraph.tagName.toLowerCase() === 'li') {
            const nestedLists = container.querySelectorAll('ul, ol');
            nestedLists.forEach(list => list.remove());
            console.log('[Translator] Removed nested lists for processing');
        }

        // If it contains <font class="notranslate immersive-translate-target-wrapper">, remove this child.
        const notranslateElement = container.querySelector('.notranslate.immersive-translate-target-wrapper');
        if (notranslateElement) {
            notranslateElement.remove();
            console.log('[Translator] Removed notranslate immersive-translate-target-wrapper element');
        }
        
        // Clean up text nodes
        Array.from(container.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                node.textContent = node.textContent
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .join(' ');
            }
        });
        
        // Process the cleaned HTML
        textToTranslate = preprocessHtml(container.innerHTML);
        
        console.log('[Translator] Text to translate:', textToTranslate);
        try {
            // Send translation request to background script
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { action: 'translate', text: textToTranslate },
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
            const restoredHtml = postprocessHtml(translatedText);
            translationElement.innerHTML = restoredHtml;
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

// Initialize
loadSetting().catch(err => console.error('Error loading setting:', err));