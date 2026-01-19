/**
 * Google Doc AI Comments Bot
 *
 * This script monitors comments on a Google Doc and replies to comments
 * addressed to the AI bot with intelligent, context-aware responses.
 *
 * Setup:
 * 1. Open your Google Doc
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code
 * 4. Set your ANTHROPIC_API_KEY in Script Properties
 * 5. Run setupTrigger() once to enable automatic monitoring
 *
 * Usage:
 * - Add a comment starting with "@AI" or "@Bot" followed by your question
 * - The bot will reply with context-aware answers
 */

// Configuration
const CONFIG = {
  BOT_TRIGGERS: ['@ai', '@bot', '@claude'],  // Case-insensitive triggers
  MODEL: 'claude-sonnet-4-20250514',
  MAX_CONTEXT_CHARS: 8000,  // Max document context to send
  CHECK_INTERVAL_MINUTES: 1
};

/**
 * Main function - checks for new comments and responds
 */
function checkAndReplyToComments() {
  const doc = DocumentApp.getActiveDocument();
  if (!doc) {
    Logger.log('No active document found. Run this from within a Google Doc.');
    return;
  }

  const docId = doc.getId();
  const comments = getDocumentComments(docId);
  const processedIds = getProcessedCommentIds();

  for (const comment of comments) {
    // Skip if already processed
    if (processedIds.includes(comment.id)) {
      continue;
    }

    // Check if comment is addressed to the bot
    if (!isAddressedToBot(comment.content)) {
      continue;
    }

    // Skip if already has a reply (bot might have replied before tracking)
    if (comment.replies && comment.replies.length > 0) {
      markCommentAsProcessed(comment.id);
      continue;
    }

    Logger.log(`Processing comment: ${comment.content}`);

    // Get context from the document
    const documentContext = getDocumentContext(doc, comment.quotedFileContent);

    // Generate AI response
    const response = generateAIResponse(comment.content, documentContext, comment.quotedFileContent);

    // Post reply
    if (response) {
      postReply(docId, comment.id, response);
      Logger.log(`Replied to comment ${comment.id}`);
    }

    // Mark as processed
    markCommentAsProcessed(comment.id);
  }
}

/**
 * Check if a comment is addressed to the bot
 */
function isAddressedToBot(content) {
  if (!content) return false;
  const lowerContent = content.toLowerCase().trim();
  return CONFIG.BOT_TRIGGERS.some(trigger => lowerContent.startsWith(trigger));
}

/**
 * Get all comments on a document using Drive API
 */
function getDocumentComments(docId) {
  try {
    const comments = Drive.Comments.list(docId, {
      fields: 'comments(id,content,quotedFileContent,replies(content,author),resolved,author)',
      includeDeleted: false
    });

    // Filter to only unresolved comments
    return (comments.comments || []).filter(c => !c.resolved);
  } catch (error) {
    Logger.log(`Error fetching comments: ${error.message}`);
    return [];
  }
}

/**
 * Get document context - the full text or relevant sections
 */
function getDocumentContext(doc, quotedContent) {
  const body = doc.getBody();
  const fullText = body.getText();

  // If document is small enough, return it all
  if (fullText.length <= CONFIG.MAX_CONTEXT_CHARS) {
    return fullText;
  }

  // If we have quoted content, try to find and return surrounding context
  if (quotedContent && quotedContent.value) {
    const quotedText = quotedContent.value;
    const index = fullText.indexOf(quotedText);

    if (index !== -1) {
      // Get context around the quoted section
      const contextPadding = Math.floor((CONFIG.MAX_CONTEXT_CHARS - quotedText.length) / 2);
      const start = Math.max(0, index - contextPadding);
      const end = Math.min(fullText.length, index + quotedText.length + contextPadding);

      let context = fullText.substring(start, end);
      if (start > 0) context = '...' + context;
      if (end < fullText.length) context = context + '...';

      return context;
    }
  }

  // Fallback: return beginning of document
  return fullText.substring(0, CONFIG.MAX_CONTEXT_CHARS) + '...';
}

/**
 * Generate AI response using Claude API
 */
function generateAIResponse(commentContent, documentContext, quotedContent) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    Logger.log('ANTHROPIC_API_KEY not set in Script Properties');
    return 'Error: API key not configured. Please set ANTHROPIC_API_KEY in Script Properties.';
  }

  // Remove the bot trigger from the question
  let question = commentContent;
  for (const trigger of CONFIG.BOT_TRIGGERS) {
    if (question.toLowerCase().startsWith(trigger)) {
      question = question.substring(trigger.length).trim();
      break;
    }
  }

  const highlightedText = quotedContent ? quotedContent.value : null;

  const systemPrompt = `You are a helpful AI assistant responding to comments in a Google Doc.
Your responses will appear as comment replies, so keep them concise but informative.
Be direct and helpful. If you need clarification, ask for it.
Format your response appropriately for a comment thread - no excessive markdown, keep it readable.`;

  let userMessage = '';

  if (highlightedText) {
    userMessage = `The user highlighted this text in the document:
---
${highlightedText}
---

And asked: "${question}"

Here is the broader document context for reference:
---
${documentContext}
---

Please provide a helpful response to their question about the highlighted text.`;
  } else {
    userMessage = `The user left this comment on the document: "${question}"

Here is the document content for context:
---
${documentContext}
---

Please provide a helpful response.`;
  }

  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      }),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
      Logger.log(`API Error: ${responseCode} - ${JSON.stringify(responseBody)}`);
      return `Error: Unable to generate response (${responseCode})`;
    }

    return responseBody.content[0].text;
  } catch (error) {
    Logger.log(`Error calling Claude API: ${error.message}`);
    return `Error: ${error.message}`;
  }
}

/**
 * Post a reply to a comment
 */
function postReply(docId, commentId, replyContent) {
  try {
    Drive.Comments.Replies.insert(
      { content: replyContent },
      docId,
      commentId
    );
  } catch (error) {
    Logger.log(`Error posting reply: ${error.message}`);
  }
}

/**
 * Get list of already processed comment IDs
 */
function getProcessedCommentIds() {
  const stored = PropertiesService.getScriptProperties().getProperty('PROCESSED_COMMENTS');
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Mark a comment as processed
 */
function markCommentAsProcessed(commentId) {
  const processed = getProcessedCommentIds();
  if (!processed.includes(commentId)) {
    processed.push(commentId);
    // Keep only last 1000 to avoid property size limits
    const trimmed = processed.slice(-1000);
    PropertiesService.getScriptProperties().setProperty('PROCESSED_COMMENTS', JSON.stringify(trimmed));
  }
}

/**
 * Clear processed comments (useful for testing)
 */
function clearProcessedComments() {
  PropertiesService.getScriptProperties().deleteProperty('PROCESSED_COMMENTS');
  Logger.log('Cleared processed comments list');
}

// ============ SETUP FUNCTIONS ============

/**
 * Set up the automatic trigger to check for comments periodically
 */
function setupTrigger() {
  // Remove any existing triggers first
  removeTriggers();

  // Create new trigger
  ScriptApp.newTrigger('checkAndReplyToComments')
    .timeDriven()
    .everyMinutes(CONFIG.CHECK_INTERVAL_MINUTES)
    .create();

  Logger.log(`Trigger set up to run every ${CONFIG.CHECK_INTERVAL_MINUTES} minute(s)`);
}

/**
 * Remove all triggers for this script
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    ScriptApp.deleteTrigger(trigger);
  }
  Logger.log('All triggers removed');
}

/**
 * Initial setup - run this first!
 */
function initialSetup() {
  // Check if API key is set
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    Logger.log('='.repeat(60));
    Logger.log('SETUP REQUIRED');
    Logger.log('='.repeat(60));
    Logger.log('Please set your Anthropic API key:');
    Logger.log('1. Go to Project Settings (gear icon)');
    Logger.log('2. Scroll to "Script Properties"');
    Logger.log('3. Click "Add script property"');
    Logger.log('4. Property: ANTHROPIC_API_KEY');
    Logger.log('5. Value: your-api-key-here');
    Logger.log('='.repeat(60));
    return;
  }

  Logger.log('API key is configured!');
  Logger.log('Setting up automatic trigger...');
  setupTrigger();
  Logger.log('');
  Logger.log('Setup complete! The bot will now monitor this document.');
  Logger.log('Add a comment starting with @AI or @Bot to test.');
}

/**
 * Test function - manually check and reply to comments
 */
function testRun() {
  Logger.log('Running manual check...');
  checkAndReplyToComments();
  Logger.log('Done!');
}

/**
 * Test the API connection
 */
function testAPIConnection() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    Logger.log('ERROR: ANTHROPIC_API_KEY not set');
    return;
  }

  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say "API connection successful!" and nothing else.' }]
      }),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = JSON.parse(response.getContentText());

    if (code === 200) {
      Logger.log('SUCCESS: ' + body.content[0].text);
    } else {
      Logger.log(`ERROR ${code}: ${JSON.stringify(body)}`);
    }
  } catch (error) {
    Logger.log(`ERROR: ${error.message}`);
  }
}
