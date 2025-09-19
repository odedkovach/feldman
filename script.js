// Mathpix API configuration
const MATHPIX_CONFIG = {
    app_id: 'matematikaly_ce5eaa_1720c2',
    app_key: 'd7ef5fd9b9975460d3f74927d390a4d18e07f82a03dda45124252fbe982e2c74',
    endpoint: 'https://api.mathpix.com/v3/text'
};


const demo_CONFIG = {
    demo: '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',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
};

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const processBtn = document.getElementById('processBtn');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const extractedText = document.getElementById('extractedText');
const renderedMath = document.getElementById('renderedMath');
const imageInfo = document.getElementById('imageInfo');
const rawResponse = document.getElementById('rawResponse');
const errorMessage = document.getElementById('errorMessage');
const checkExerciseBtn = document.getElementById('checkExerciseBtn');
const aiResultsSection = document.getElementById('aiResultsSection');
const aiAnalysis = document.getElementById('aiAnalysis');
const correctnessStatus = document.getElementById('correctnessStatus');
const aiSuggestions = document.getElementById('aiSuggestions');
const debugBtn = document.getElementById('debugBtn');
const debugModal = document.getElementById('debugModal');
const closeModal = document.getElementById('closeModal');

// Debug data storage
let debugData = {
    request: null,
    response: null,
    prompt: null,
    parsedResponse: null,
    issues: []
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    // Click to upload
    uploadArea.addEventListener('click', () => imageInput.click());
    
    // File input change
    imageInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Process button
    processBtn.addEventListener('click', processImage);
    
    // Check exercise button
    checkExerciseBtn.addEventListener('click', checkExerciseWithAI);
    
    // Debug button
    debugBtn.addEventListener('click', showDebugModal);
    
    // Modal close events
    closeModal.addEventListener('click', hideDebugModal);
    debugModal.addEventListener('click', function(e) {
        if (e.target === debugModal) {
            hideDebugModal();
        }
    });
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file.');
        return;
    }
    
    // Validate file size (max 5MB as per Mathpix limits)
    if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB.');
        return;
    }
    
    // Display preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImg.src = e.target.result;
        uploadArea.style.display = 'none';
        imagePreview.style.display = 'block';
        hideError();
        hideResults();
    };
    reader.readAsDataURL(file);
    
    // Store file for processing
    window.selectedFile = file;
}

async function processImage() {
    if (!window.selectedFile) {
        showError('Please select an image first.');
        return;
    }
    
    showLoading();
    hideError();
    hideResults();
    
    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', window.selectedFile);
        
        // Add options for math processing
        const options = {
            math_inline_delimiters: ["$", "$"],
            math_display_delimiters: ["$$", "$$"],
            rm_spaces: true,
            formats: ["text", "latex_styled"]
        };
        
        formData.append('options_json', JSON.stringify(options));
        
        // Make API request
        const response = await fetch(MATHPIX_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'app_id': MATHPIX_CONFIG.app_id,
                'app_key': MATHPIX_CONFIG.app_key
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Check for API errors
        if (result.error) {
            throw new Error(result.error_info || result.error);
        }
        
        displayResults(result);
        
        // Store the result for AI analysis
        window.mathpixResult = result;
        
    } catch (error) {
        console.error('Error processing image:', error);
        showError(`Failed to process image: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function displayResults(result) {
    // Display extracted text
    extractedText.textContent = result.text || 'No text detected';
    
    // Render math using KaTeX if available
    if (result.latex_styled) {
        try {
            // Try to render as display math first
            katex.render(result.latex_styled, renderedMath, {
                displayMode: true,
                throwOnError: false
            });
        } catch (e) {
            // Fallback to showing the LaTeX code
            renderedMath.textContent = result.latex_styled;
        }
    } else if (result.text) {
        // Try to render the text content
        try {
            // Extract math from text (assuming it's in $ delimiters)
            const mathMatch = result.text.match(/\$([^$]+)\$/);
            if (mathMatch) {
                katex.render(mathMatch[1], renderedMath, {
                    displayMode: true,
                    throwOnError: false
                });
            } else {
                renderedMath.textContent = 'No mathematical content detected';
            }
        } catch (e) {
            renderedMath.textContent = result.text;
        }
    } else {
        renderedMath.textContent = 'No mathematical content detected';
    }
    
    // Display image information
    displayImageInfo(result);
    
    // Display raw response
    rawResponse.textContent = JSON.stringify(result, null, 2);
    
    // Show results section
    resultsSection.style.display = 'block';
}

function displayImageInfo(result) {
    const info = [
        { label: 'Image Width', value: result.image_width || 'N/A' },
        { label: 'Image Height', value: result.image_height || 'N/A' },
        { label: 'Confidence', value: result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A' },
        { label: 'Is Handwritten', value: result.is_handwritten ? 'Yes' : 'No' },
        { label: 'Is Printed', value: result.is_printed ? 'Yes' : 'No' },
        { label: 'Auto Rotate', value: result.auto_rotate_degrees ? `${result.auto_rotate_degrees}°` : 'None' },
        { label: 'Request ID', value: result.request_id || 'N/A' },
        { label: 'Version', value: result.version || 'N/A' }
    ];
    
    const infoGrid = document.createElement('div');
    infoGrid.className = 'info-grid';
    
    info.forEach(item => {
        const infoItem = document.createElement('div');
        infoItem.className = 'info-item';
        infoItem.innerHTML = `
            <strong>${item.label}:</strong>
            <span>${item.value}</span>
        `;
        infoGrid.appendChild(infoItem);
    });
    
    imageInfo.innerHTML = '';
    imageInfo.appendChild(infoGrid);
}

function showLoading() {
    loading.style.display = 'block';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
}

function hideError() {
    errorSection.style.display = 'none';
}

function hideResults() {
    resultsSection.style.display = 'none';
    aiResultsSection.style.display = 'none';
}

// OpenAI Integration for Exercise Checking
async function checkExerciseWithAI() {
    if (!window.mathpixResult || !window.mathpixResult.text) {
        showError('Please process an image with Mathpix first.');
        return;
    }
    
    // Disable button and show loading
    checkExerciseBtn.disabled = true;
    checkExerciseBtn.textContent = '🤖 Analyzing...';
    showLoading();
    hideError();
    
    try {
        const extractedText = window.mathpixResult.text;
        const latexStyled = window.mathpixResult.latex_styled || extractedText;
        
        // Clear previous debug data
        debugData = {
            request: null,
            response: null,
            prompt: null,
            parsedResponse: null,
            issues: []
        };
        
        // Create the new improved prompt
        const prompt = `**Student's solution to check (plain text):**

${extractedText}

**Task:**
1. Analyse each step.
2. Decide if the entire solution is mathematically correct.
3. Respond ONLY with the JSON object below – no other text.

\`\`\`json
{
  "analysis": "<your step-by-step reasoning - respond in Hebrew>",
  "status": "correct | incorrect | unclear",
  "confidence": "high | medium | low",
  "explanation": "<why you chose that status - respond in Hebrew>"
}
\`\`\``;

        // Store prompt in debug data
        debugData.prompt = prompt;

        // Prepare request body
        const requestBody = {
            model: demo_CONFIG.model,
            temperature: 0.1,
            max_tokens: 800,
            messages: [
                {
                    role: 'system',
                    content: 'You are an accurate, methodical math tutor. Decide whether a student\'s worked solution is correct. Only flag an error if you are CERTAIN. Otherwise mark it correct.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        };

        // Store request in debug data
        debugData.request = requestBody;

        // Make request to OpenAI API
        const response = await fetch(demo_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${demo_CONFIG.demo}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Store raw response in debug data
        debugData.response = result;
        
        if (result.error) {
            throw new Error(result.error.message || 'OpenAI API error');
        }
        
        const aiResponse = result.choices[0].message.content;
        
        // Try to parse as JSON, handling markdown code blocks
        let parsedResponse;
        try {
            // First, try to extract JSON from markdown code blocks
            let jsonString = aiResponse;
            
            // Check if response is wrapped in markdown code blocks
            const codeBlockMatch = aiResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
            if (codeBlockMatch) {
                jsonString = codeBlockMatch[1].trim();
            }
            
            // Parse the JSON
            parsedResponse = JSON.parse(jsonString);
            
        } catch (e) {
            // If JSON parsing fails, create a structured response from plain text
            parsedResponse = {
                analysis: aiResponse,
                status: 'unclear',
                confidence: 'low',
                explanation: 'AI provided analysis in text format - unable to parse JSON response'
            };
        }
        
        // Store parsed response in debug data
        debugData.parsedResponse = parsedResponse;
        
        // Add verification logic to catch obvious AI errors
        parsedResponse = verifyAIResponse(parsedResponse, extractedText);
        
        // Show debug button now that we have data
        debugBtn.style.display = 'inline-block';
        
        displayAIResults(parsedResponse);
        
    } catch (error) {
        console.error('Error checking exercise with AI:', error);
        showError(`Failed to analyze exercise: ${error.message}`);
    } finally {
        // Re-enable button and hide loading
        checkExerciseBtn.disabled = false;
        checkExerciseBtn.textContent = '🤖 Check Exercise with AI';
        hideLoading();
    }
}

function displayAIResults(aiResponse) {
    // Display analysis with confidence indicator
    const confidenceIndicator = getConfidenceIndicator(aiResponse.confidence);
    aiAnalysis.innerHTML = `
        ${confidenceIndicator}
        ${formatText(aiResponse.analysis || 'No analysis provided')}
        ${aiResponse.ocr_concerns ? `<div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;"><strong>⚠️ OCR Concerns:</strong><br>${formatText(aiResponse.ocr_concerns)}</div>` : ''}
    `;
    
    // Add Hebrew class for RTL text display
    aiAnalysis.className = 'result-content hebrew';
    
    // Display correctness status with appropriate styling
    const status = aiResponse.status?.toLowerCase() || 'unclear';
    const statusText = getStatusText(status);
    const statusClass = getStatusClass(status);
    
    correctnessStatus.className = `result-content status-indicator ${statusClass}`;
    correctnessStatus.innerHTML = `
        <div style="font-size: 1.5rem; margin-bottom: 10px;">${getStatusEmoji(status)}</div>
        <div>${statusText}</div>
        ${aiResponse.confidence ? `<div style="margin-top: 5px; font-size: 0.9rem; opacity: 0.8;">Confidence: ${aiResponse.confidence.toUpperCase()}</div>` : ''}
        ${aiResponse.explanation ? `<div class="hebrew" style="margin-top: 10px; font-size: 1rem; font-weight: normal; direction: rtl; text-align: right;">${aiResponse.explanation}</div>` : ''}
        ${aiResponse.verification_note ? `<div style="margin-top: 10px; font-size: 0.9rem; color: #666; font-style: italic;">${aiResponse.verification_note}</div>` : ''}
    `;
    
    // Display additional information (simplified for new format)
    let additionalContent = '';
    if (aiResponse.explanation && aiResponse.status !== 'correct') {
        additionalContent += `<div class="hebrew" style="direction: rtl; text-align: right;"><strong>💡 Additional Notes:</strong><br>${formatText(aiResponse.explanation)}</div>`;
    } else if (aiResponse.status === 'correct') {
        additionalContent = '<div style="color: #28a745; font-weight: 600;">✅ Great work! The solution is mathematically correct.</div>';
    }
    
    aiSuggestions.innerHTML = additionalContent || 'No additional information provided.';
    
    // Show AI results section
    aiResultsSection.style.display = 'block';
    
    // Scroll to AI results
    aiResultsSection.scrollIntoView({ behavior: 'smooth' });
}

function getStatusText(status) {
    switch (status) {
        case 'correct': return 'Exercise is Correct! ✅';
        case 'incorrect': return 'Exercise contains errors ❌';
        case 'partial': return 'Partially Correct ⚠️';
        case 'unclear': return 'Analysis Unclear 🤔';
        default: return 'Status Unknown';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'correct': return 'status-correct';
        case 'incorrect': return 'status-incorrect';
        case 'partial': return 'status-partial';
        case 'unclear': return 'status-unclear';
        default: return 'status-unclear';
    }
}

function getStatusEmoji(status) {
    switch (status) {
        case 'correct': return '🎉';
        case 'incorrect': return '❌';
        case 'partial': return '⚠️';
        case 'unclear': return '🤔';
        default: return '❓';
    }
}

function formatText(text) {
    if (!text) return '';
    
    // Convert newlines to <br> and preserve formatting
    return text
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// Verification function to catch obvious AI errors
function verifyAIResponse(aiResponse, originalText) {
    let verificationNote = '';
    let adjustedResponse = { ...aiResponse };
    debugData.issues = []; // Reset issues array
    
    // Check for self-contradictory statements in the explanation
    const explanation = (aiResponse.explanation || aiResponse.analysis || '').toLowerCase();
    
    // Look for contradictions like "would result in X, not X" or "should result in X, not X"
    const contradictionPatterns = [
        /would result in (.+?), not \1/i,
        /should result in (.+?), not \1/i,
        /gives (.+?), not \1/i,
        /equals (.+?), not \1/i
    ];
    
    for (const pattern of contradictionPatterns) {
        if (pattern.test(explanation)) {
            const issue = {
                type: 'Self-Contradiction',
                description: 'The AI made a self-contradictory statement, saying something "results in X, not X" where X is identical.',
                severity: 'high',
                found_text: explanation.match(pattern)[0]
            };
            debugData.issues.push(issue);
            verificationNote = '⚠️ Note: The AI analysis contained a self-contradictory statement and may be inaccurate.';
            adjustedResponse.confidence = 'low';
            adjustedResponse.status = 'unclear';
            break;
        }
    }
    
    // Check for nonsensical mathematical statements
    const nonsensicalPatterns = [
        /(\d+)\s*=\s*\1,?\s*not\s*\1/i, // "2 = 2, not 2"
        /result(?:s)?\s+in\s+(.+?),\s*not\s+\1/i // "results in X, not X"
    ];
    
    for (const pattern of nonsensicalPatterns) {
        if (pattern.test(explanation)) {
            const issue = {
                type: 'Nonsensical Statement',
                description: 'The AI made a statement that doesn\'t make logical sense.',
                severity: 'high',
                found_text: explanation.match(pattern)[0]
            };
            debugData.issues.push(issue);
            break;
        }
    }
    
    // Check for basic arithmetic that the AI might have gotten wrong
    if (explanation.includes('subtract') || explanation.includes('add')) {
        const basicArithmetic = originalText.match(/(\d+)\s*[\+\-\*\/]\s*(\d+)\s*=\s*(\d+)/);
        if (basicArithmetic) {
            const issue = {
                type: 'Basic Arithmetic Warning',
                description: 'Basic arithmetic detected. AI sometimes makes errors with simple calculations.',
                severity: 'medium',
                found_text: basicArithmetic[0]
            };
            debugData.issues.push(issue);
            verificationNote += ' Basic arithmetic detected - please verify the AI analysis carefully.';
        }
    }
    
    // If AI marked as incorrect but confidence is not high, suggest caution
    if (aiResponse.status === 'incorrect' && aiResponse.confidence !== 'high') {
        const issue = {
            type: 'Low Confidence Error Detection',
            description: 'AI marked the exercise as incorrect but with non-high confidence. This could be a false positive.',
            severity: 'medium',
            found_text: `Status: ${aiResponse.status}, Confidence: ${aiResponse.confidence}`
        };
        debugData.issues.push(issue);
        verificationNote += ' The AI marked this as incorrect with non-high confidence. Please double-check.';
    }
    
    // Add verification note if any concerns were found
    if (verificationNote) {
        adjustedResponse.verification_note = verificationNote;
    }
    
    return adjustedResponse;
}

function getConfidenceIndicator(confidence) {
    if (!confidence) return '';
    
    const indicators = {
        'high': '<div style="display: inline-block; padding: 5px 10px; background: #d4edda; color: #155724; border-radius: 15px; font-size: 0.8rem; margin-bottom: 10px;">🎯 High Confidence</div>',
        'medium': '<div style="display: inline-block; padding: 5px 10px; background: #fff3cd; color: #856404; border-radius: 15px; font-size: 0.8rem; margin-bottom: 10px;">⚡ Medium Confidence</div>',
        'low': '<div style="display: inline-block; padding: 5px 10px; background: #f8d7da; color: #721c24; border-radius: 15px; font-size: 0.8rem; margin-bottom: 10px;">⚠️ Low Confidence</div>'
    };
    
    return indicators[confidence.toLowerCase()] || '';
}

// Reset function to start over
function resetApp() {
    uploadArea.style.display = 'block';
    imagePreview.style.display = 'none';
    hideLoading();
    hideError();
    hideResults();
    imageInput.value = '';
    window.selectedFile = null;
}

// Add reset button functionality
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        resetApp();
    }
});

// Debug Modal Functions
function showDebugModal() {
    if (!debugData.request || !debugData.response) {
        showError('No debug data available. Please run an AI analysis first.');
        return;
    }
    
    // Populate debug modal with data
    document.getElementById('debugPrompt').textContent = debugData.prompt || 'No prompt data';
    document.getElementById('debugRequest').textContent = JSON.stringify(debugData.request, null, 2);
    document.getElementById('debugResponse').textContent = JSON.stringify(debugData.response, null, 2);
    document.getElementById('debugParsed').textContent = JSON.stringify(debugData.parsedResponse, null, 2);
    
    // Populate issues section
    const issuesContainer = document.getElementById('debugIssues');
    if (debugData.issues && debugData.issues.length > 0) {
        issuesContainer.innerHTML = debugData.issues.map(issue => `
            <div class="debug-issue">
                <h5>${issue.type} (${issue.severity.toUpperCase()} severity)</h5>
                <p><strong>Description:</strong> ${issue.description}</p>
                <p><strong>Found in text:</strong> "${issue.found_text}"</p>
            </div>
        `).join('');
    } else {
        issuesContainer.innerHTML = '<p style="color: #28a745; font-weight: 600;">✅ No issues detected in the AI response.</p>';
    }
    
    // Show modal
    debugModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function hideDebugModal() {
    debugModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (debugModal.style.display === 'block') {
            hideDebugModal();
        } else {
            resetApp();
        }
    }
});

// Add a reset button to the page
document.addEventListener('DOMContentLoaded', function() {
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 Start Over';
    resetBtn.className = 'process-btn';
    resetBtn.style.marginLeft = '10px';
    resetBtn.addEventListener('click', resetApp);
    
    // Add reset button next to process button
    processBtn.parentNode.appendChild(resetBtn);
});
