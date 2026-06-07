/**
 * Universal Task Structurer — Server-Side Google Apps Script
 * All functions are top-level (required for google.script.run access).
 *
 * Changelog (2026-06-07):
 *   • doGet: added IFRAME sandbox mode + try-catch with fallback error page
 *   • Every function now logs entry/exit via console.log for Stackdriver debugging
 *   • Added getScriptInfo() diagnostic endpoint
 *   • queryGemini: added generationConfig defaults + systemInstruction key fix
 *   • Robustness: added default parameters for queryGemini to prevent 400 errors when run from Editor
 *   • Diagnostics: added testQueryGemini() helper function for direct Editor testing
 *   • Aesthetics: added emoji indicators for visual scanning in Stackdriver logs
 */

// ─────────────────────────────────────────────
// 🌐 Web-App Entry Point
// ─────────────────────────────────────────────

/**
 * Serves the main index.html with IFRAME sandbox mode.
 * Wrapped in try-catch so deployment issues surface in the browser.
 */
function doGet(e) {
  console.log('🌐 [doGet] ENTRY — params:', JSON.stringify(e && e.parameter ? e.parameter : {}));

  // ── Authorization pre-check (append ?auth=1 to the URL) ──────────
  // This tests UrlFetchApp access and returns a diagnostic page.
  // The act of running ANY server function (like doGet itself) counts
  // toward triggering the OAuth consent if the deployer hasn't authorized yet.
  if (e && e.parameter && e.parameter.auth === '1') {
    try {
      // Attempt a lightweight UrlFetchApp call to test authorization
      UrlFetchApp.fetch('https://httpbin.org/get', { muteHttpExceptions: true });
      return HtmlService.createHtmlOutput(
        '<h2 style="color:green;">✅ Authorization Successful!</h2>' +
        '<p>UrlFetchApp is authorized. Your web app can now make external API calls.</p>' +
        '<p><a href="' + ScriptApp.getService().getUrl() + '">← Go to App</a></p>'
      ).setTitle('Auth Check — Success');
    } catch (authErr) {
      var scriptUrl = 'https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/edit';
      return HtmlService.createHtmlOutput(
        '<h2 style="color:red;">❌ Authorization Required</h2>' +
        '<p>UrlFetchApp is NOT authorized. Error: <code>' + authErr.message + '</code></p>' +
        '<h3>How to fix:</h3>' +
        '<ol>' +
        '<li>Open the <a href="' + scriptUrl + '" target="_blank">Apps Script Editor</a></li>' +
        '<li>Select <strong>forceAuth</strong> from the function dropdown</li>' +
        '<li>Click ▶️ <strong>Run</strong></li>' +
        '<li>Accept the OAuth consent dialog</li>' +
        '<li>Then reload this app</li>' +
        '</ol>'
      ).setTitle('Auth Check — Failed');
    }
  }

  try {
    var output = HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Universal Task Structurer')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    console.log('✅ [doGet] EXIT — serving index.html successfully');
    return output;
  } catch (err) {
    console.error('🚨 [doGet] ERROR:', err.message, err.stack);
    return HtmlService.createHtmlOutput(
      '<h2>⚠️ Deployment Error</h2>' +
      '<p>The web app failed to load. Please check the Apps Script logs.</p>' +
      '<pre>' + err.message + '</pre>'
    ).setTitle('Error — Universal Task Structurer');
  }
}

// ─────────────────────────────────────────────
// 🩺 Diagnostics & Health Checks
// ─────────────────────────────────────────────

/**
 * Returns deployment and runtime info for client-side debugging.
 * Called via google.script.run.getScriptInfo()
 */
function getScriptInfo() {
  console.log('🩺 [getScriptInfo] ENTRY');
  try {
    var info = {
      scriptId: ScriptApp.getScriptId(),
      serviceUrl: ScriptApp.getService().getUrl(),
      runtimeVersion: 'V8',
      timeZone: Session.getScriptTimeZone(),
      effectiveUser: Session.getEffectiveUser().getEmail(),
      activeUser: Session.getActiveUser().getEmail(),
      hasGeminiKey: !!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
      timestamp: new Date().toISOString()
    };
    console.log('✅ [getScriptInfo] EXIT — info:', JSON.stringify(info));
    return info;
  } catch (err) {
    console.error('🚨 [getScriptInfo] ERROR:', err.message);
    return { error: err.message };
  }
}

// ─────────────────────────────────────────────
// 🔌 External URL Proxy
// ─────────────────────────────────────────────

/**
 * Proxies external HTML fetching via GAS UrlFetchApp.
 */
function fetchExternalUrl(url) {
  // ── Input validation check ──────────────────────────────────────────
  if (!url || typeof url !== 'string' || url.trim() === '') {
    console.warn('⚠️ [fetchExternalUrl] Warning: Missing or invalid URL parameter. Defaulting to diagnostic test URL.');
    url = 'https://httpbin.org/get'; // Fallback test URL to prevent crash
  }

  console.log('🔌 [fetchExternalUrl] ENTRY — url:', url);
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    console.log('🔌 [fetchExternalUrl] HTTP response:', code);
    if (code < 200 || code >= 300) {
      throw new Error('HTTP error ' + code);
    }
    console.log('✅ [fetchExternalUrl] EXIT — success');
    return { contents: response.getContentText() };
  } catch (err) {
    console.error('🚨 [fetchExternalUrl] ERROR:', err.message);
    return { error: err.message || 'Failed to fetch the URL.' };
  }
}

// ─────────────────────────────────────────────
// 🧠 Gemini API Proxy
// ─────────────────────────────────────────────

/**
 * Proxies Gemini API requests via GAS UrlFetchApp.
 * Pulls the API key securely from Script Properties.
 *
 * @param {string} modelName   – e.g. "gemini-2.5-flash"
 * @param {Array}  contents    – Gemini-format contents array
 * @param {string} [systemInstruction] – optional system prompt text
 * @returns {{ text: string } | { error: string }}
 */
function queryGemini(modelName, contents, systemInstruction) {
  // ── Robustness fallback for direct Apps Script Editor runs ──────────
  if (!modelName) {
    modelName = 'gemini-3.5-flash';
    console.log('💡 [queryGemini] No modelName provided. Defaulting to:', modelName);
  }
  if (!contents) {
    contents = [{ role: 'user', parts: [{ text: 'Hello Gemini! Please reply with a short greeting and a waving hand emoji.' }] }];
    console.log('💡 [queryGemini] No contents provided. Using default test content.');
  }

  console.log('🧠 [queryGemini] ENTRY — model:', modelName, 'hasSystem:', !!systemInstruction);
  
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('🚨 [queryGemini] No GEMINI_API_KEY configured in Script Properties');
    return { error: 'No GEMINI_API_KEY is configured in Script Properties on the GAS server.' };
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + apiKey;

  var payload = {
    contents: contents,
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: 65536
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    var responseText = response.getContentText();
    console.log('🧠 [queryGemini] HTTP response:', code, '— length:', responseText.length);

    if (code !== 200) {
      console.error('🚨 [queryGemini] API error:', responseText.substring(0, 500));
      return { error: 'Gemini API returned code ' + code + ': ' + responseText };
    }

    var json = JSON.parse(responseText);

    // Check for blocked or empty candidates
    if (!json.candidates || json.candidates.length === 0) {
      var blockReason = json.promptFeedback && json.promptFeedback.blockReason
        ? json.promptFeedback.blockReason
        : 'unknown';
      console.error('🚨 [queryGemini] No candidates returned — blockReason:', blockReason);
      return { error: 'Gemini returned no candidates. Block reason: ' + blockReason };
    }

    var text = '';
    if (json.candidates[0].content && json.candidates[0].content.parts) {
      text = json.candidates[0].content.parts[0].text || '';
    }

    console.log('✅ [queryGemini] EXIT — responseTextLen:', text.length);
    return { text: text };
  } catch (err) {
    console.error('🚨 [queryGemini] ERROR:', err.message);
    return { error: err.message || 'Failed to communicate with Gemini API.' };
  }
}

/**
 * Diagnostic helper to test Gemini query directly from Apps Script Editor.
 * Select "testQueryGemini" from the function dropdown and click Run.
 */
function testQueryGemini() {
  console.log('🧠 [testQueryGemini] Starting manual test run...');
  var result = queryGemini();
  if (result.error) {
    console.error('🚨 [testQueryGemini] Test failed:', result.error);
  } else {
    console.log('🎉 [testQueryGemini] Test succeeded! Response:');
    console.log(result.text);
  }
}

// ─────────────────────────────────────────────
// 📋 Google Tasks API Integrations
// ─────────────────────────────────────────────

/**
 * Fetches all Google Tasks lists using native script authentication.
 */
function gasFetchTaskLists() {
  console.log('📋 [gasFetchTaskLists] ENTRY');
  var token = ScriptApp.getOAuthToken();
  var url = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    console.log('📋 [gasFetchTaskLists] HTTP response:', code);
    if (code !== 200) {
      throw new Error('API returned code ' + code + ': ' + response.getContentText());
    }
    var data = JSON.parse(response.getContentText());
    console.log('✅ [gasFetchTaskLists] EXIT — listCount:', (data.items || []).length);
    return { items: data.items || [] };
  } catch (err) {
    console.error('🚨 [gasFetchTaskLists] ERROR:', err.message);
    return { error: err.message || 'Failed to fetch task lists.' };
  }
}

/**
 * Creates a new task list.
 */
function gasCreateTaskList(title) {
  console.log('📋 [gasCreateTaskList] ENTRY — title:', title);
  var token = ScriptApp.getOAuthToken();
  var url = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ title: title }),
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    console.log('📋 [gasCreateTaskList] HTTP response:', code);
    if (code !== 200 && code !== 201) {
      throw new Error('API returned code ' + code + ': ' + response.getContentText());
    }
    console.log('✅ [gasCreateTaskList] EXIT — success');
    return JSON.parse(response.getContentText());
  } catch (err) {
    console.error('🚨 [gasCreateTaskList] ERROR:', err.message);
    return { error: err.message || 'Failed to create task list.' };
  }
}

/**
 * Inserts a single task into a task list.
 */
function gasInsertTask(listId, taskPayload) {
  console.log('📋 [gasInsertTask] ENTRY — listId:', listId);
  var token = ScriptApp.getOAuthToken();
  var url = 'https://tasks.googleapis.com/tasks/v1/lists/' + listId + '/tasks';
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify(taskPayload),
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    console.log('📋 [gasInsertTask] HTTP response:', code);
    if (code !== 200 && code !== 201) {
      throw new Error('API returned code ' + code + ': ' + response.getContentText());
    }
    console.log('✅ [gasInsertTask] EXIT — success');
    return JSON.parse(response.getContentText());
  } catch (err) {
    console.error('🚨 [gasInsertTask] ERROR:', err.message);
    return { error: err.message || 'Failed to insert task.' };
  }
}

// ─────────────────────────────────────────────
// 🔑 Authentication & OAuth Helpers
// ─────────────────────────────────────────────

/**
 * Forces the Google Apps Script authorization prompt for UrlFetchApp.
 * Run this manually from the Script Editor to trigger OAuth consent.
 */
function forceAuth() {
  console.log('🔑 [forceAuth] ENTRY');
  try {
    var response = UrlFetchApp.fetch('https://generativelanguage.googleapis.com');
    console.log('✅ [forceAuth] EXIT — status:', response.getResponseCode());
  } catch (err) {
    console.error('⚠️ [forceAuth] ERROR (expected if no endpoint):', err.message);
  }
}
