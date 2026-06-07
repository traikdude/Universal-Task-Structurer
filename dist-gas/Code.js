function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Universal Task Structurer')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Proxies external HTML fetching via GAS UrlFetchApp.
 */
function fetchExternalUrl(url) {
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error(`HTTP error ${code}`);
    }
    return { contents: response.getContentText() };
  } catch (err) {
    return { error: err.message || 'Failed to fetch the URL.' };
  }
}

/**
 * Proxies Gemini API requests via GAS UrlFetchApp.
 * Pulls the API key securely from Script Properties.
 */
function queryGemini(modelName, contents, systemInstruction) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { error: 'No GEMINI_API_KEY is configured in Script Properties on the GAS server.' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: contents
  };

  if (systemInstruction) {
    payload.system_instruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const responseText = response.getContentText();

    if (code !== 200) {
      return { error: `Gemini API returned code ${code}: ${responseText}` };
    }

    const json = JSON.parse(responseText);
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text: text };
  } catch (err) {
    return { error: err.message || 'Failed to communicate with Gemini API.' };
  }
}

/**
 * Fetches all Google Tasks lists using native script authentication.
 */
function gasFetchTaskLists() {
  const token = ScriptApp.getOAuthToken();
  const url = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code !== 200) {
      throw new Error(`API returned code ${code}: ${response.getContentText()}`);
    }
    const data = JSON.parse(response.getContentText());
    return { items: data.items || [] };
  } catch (err) {
    return { error: err.message || 'Failed to fetch task lists.' };
  }
}

/**
 * Creates a new task list.
 */
function gasCreateTaskList(title) {
  const token = ScriptApp.getOAuthToken();
  const url = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify({ title: title }),
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code !== 200 && code !== 201) {
      throw new Error(`API returned code ${code}: ${response.getContentText()}`);
    }
    return JSON.parse(response.getContentText());
  } catch (err) {
    return { error: err.message || 'Failed to create task list.' };
  }
}

/**
 * Inserts a single task.
 */
function gasInsertTask(listId, taskPayload) {
  const token = ScriptApp.getOAuthToken();
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`;
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify(taskPayload),
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code !== 200 && code !== 201) {
      throw new Error(`API returned code ${code}: ${response.getContentText()}`);
    }
    return JSON.parse(response.getContentText());
  } catch (err) {
    return { error: err.message || 'Failed to insert task.' };
  }
}

/**
 * Forces the Google Apps Script authorization prompt for UrlFetchApp.
 */
function forceAuth() {
  const response = UrlFetchApp.fetch("https://generativelanguage.googleapis.com");
  console.log("Response status:", response.getResponseCode());
}
