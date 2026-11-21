/**
 * Field Notes contact form endpoint.
 *
 * Deploy as a web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Required script properties:
 *   SHEET_ID       The spreadsheet that receives messages.
 *   NOTIFY_EMAIL   The private address that receives notifications.
 *   SITE_ORIGIN    Optional. For example, https://po-man.github.io
 */

var SHEET_NAME = "Messages";
var TOPICS = ["role", "meerkat", "project", "other"];
var MIN_MESSAGE = 10;
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var LIMITS = {
  name: 80,
  email: 120,
  message: 4000,
  page: 200
};

function doGet() {
  return out("ok");
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return out("error: rejected");
    }

    var data = JSON.parse(e.postData.contents);

    // A bot that fills the hidden field gets a success response and no row.
    if (String(data.website || "").trim() !== "") {
      return out("ok");
    }

    // The client sets this when the page loads. Very fast submits are bots.
    var startedAt = Number(data.started_at || 0);
    if (!startedAt || Date.now() - startedAt < 2500) {
      return out("ok");
    }

    var siteOrigin = PropertiesService.getScriptProperties().getProperty("SITE_ORIGIN");
    if (siteOrigin && String(data.origin || "") !== siteOrigin) {
      return out("error: rejected");
    }

    var result = validate(data);
    if (!result.ok) {
      return out("error: " + result.code);
    }

    var wait = rateLimited(result.message);
    if (wait) {
      return out("error: " + wait);
    }

    append(result.message, data);

    // A failed notification should not lose the message that was already stored.
    try {
      notify(result.message, data);
    } catch (error) {
      console.error(error);
    }

    return out("ok");
  } catch (error) {
    console.error(error);
    return out("error: server");
  }
}

function validate(data) {
  var name = String(data.name || "").trim();
  var email = String(data.email || "").trim();
  var topic = String(data.topic || "").trim();
  var body = String(data.message || "").trim();
  var page = String(data.page || "").trim();

  if (!name || name.length > LIMITS.name) {
    return { ok: false, code: "name" };
  }
  if (!email || email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, code: "email" };
  }
  if (TOPICS.indexOf(topic) === -1) {
    return { ok: false, code: "topic" };
  }
  if (body.length < MIN_MESSAGE) {
    return { ok: false, code: "message_short" };
  }
  if (body.length > LIMITS.message) {
    return { ok: false, code: "message_long" };
  }
  if (page.length > LIMITS.page) {
    return { ok: false, code: "rejected" };
  }

  return {
    ok: true,
    message: {
      name: name,
      email: email,
      topic: topic,
      message: body,
      page: page
    }
  };
}

/**
 * Returns null when the message may be stored, or a code that names the
 * limit that was hit.
 */
function rateLimited(message) {
  var cache = CacheService.getScriptCache();
  var emailHash = hash(message.email.toLowerCase());
  var emailKey = "contact:email:" + emailHash;
  var duplicateKey = "contact:hash:" + hash(message.email.toLowerCase() + "|" + message.message);

  if (cache.get(duplicateKey)) {
    return "duplicate";
  }

  if (cache.get(emailKey)) {
    return "throttled";
  }

  var minuteKey = "contact:minute:" + Math.floor(Date.now() / 60000);
  var count = Number(cache.get(minuteKey) || 0);
  if (count >= 8) {
    return "busy";
  }

  cache.put(emailKey, "1", 600);
  cache.put(duplicateKey, "1", 600);
  cache.put(minuteKey, String(count + 1), 120);
  return null;
}

function append(message, data) {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("SHEET_ID");
  if (!sheetId) throw new Error("SHEET_ID is not set");

  var spreadsheet = SpreadsheetApp.openById(sheetId);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "received_at",
      "name",
      "email",
      "topic",
      "message",
      "page",
      "origin"
    ]);
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    sheet.appendRow([
      new Date(),
      safeCell(message.name),
      safeCell(message.email),
      safeCell(message.topic),
      safeCell(message.message),
      safeCell(message.page),
      safeCell(data.origin || "")
    ]);
  } finally {
    lock.releaseLock();
  }
}

function notify(message, data) {
  var notifyEmail = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
  if (!notifyEmail) return;

  var body = [
    "New message from the Field Notes contact form.",
    "",
    "Name: " + message.name,
    "Email: " + message.email,
    "Topic: " + message.topic,
    "Page: " + (message.page || "unknown"),
    "Origin: " + (data.origin || "unknown"),
    "",
    message.message
  ].join("\n");

  var senderName = PropertiesService.getScriptProperties().getProperty("SENDER_NAME");

  MailApp.sendEmail({
    to: notifyEmail,
    subject: "Field Notes contact: " + message.name,
    replyTo: message.email,
    name: `${message.name} via ${senderName}`,
    body: body
  });
}

function safeCell(value) {
  var text = String(value == null ? "" : value);
  if (/^[=+\-@\t\r]/.test(text)) {
    return "'" + text;
  }
  return text;
}

function hash(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)
    .map(function (byte) {
      var n = byte < 0 ? byte + 256 : byte;
      return ("0" + n.toString(16)).slice(-2);
    })
    .join("");
}

function out(text) {
  return ContentService.createTextOutput(text);
}

/**
 * Run this once from the Apps Script editor to create the Sheet.
 * Then set NOTIFY_EMAIL and SITE_ORIGIN in Project Settings.
 */
function setup() {
  var spreadsheet = SpreadsheetApp.create("Field Notes contact");
  var sheet = spreadsheet.getActiveSheet();
  sheet.setName(SHEET_NAME);
  sheet.appendRow([
    "received_at",
    "name",
    "email",
    "topic",
    "message",
    "page",
    "origin"
  ]);

  PropertiesService.getScriptProperties().setProperty("SHEET_ID", spreadsheet.getId());

  Logger.log("SHEET_ID=" + spreadsheet.getId());
  Logger.log("Sheet URL: " + spreadsheet.getUrl());
  Logger.log("Now set NOTIFY_EMAIL and SITE_ORIGIN in Project Settings > Script properties.");
}
