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
      return out("error: invalid");
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
      return out("error: invalid");
    }

    var message = validate(data);
    if (!message) {
      return out("error: invalid");
    }

    if (rateLimited(message)) {
      return out("error: wait");
    }

    append(message, data);

    // A failed notification should not lose the message that was already stored.
    try {
      notify(message, data);
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

  if (!name || name.length > LIMITS.name) return null;
  if (!email || email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (TOPICS.indexOf(topic) === -1) return null;
  if (body.length < 10 || body.length > LIMITS.message) return null;
  if (page.length > LIMITS.page) return null;

  return {
    name: name,
    email: email,
    topic: topic,
    message: body,
    page: page
  };
}

function rateLimited(message) {
  var cache = CacheService.getScriptCache();
  var emailKey = "contact:email:" + message.email.toLowerCase();
  if (cache.get(emailKey)) {
    return true;
  }

  var duplicateKey = "contact:hash:" + hash(message.email.toLowerCase() + "|" + message.message);
  if (cache.get(duplicateKey)) {
    return true;
  }

  var minuteKey = "contact:minute:" + Math.floor(Date.now() / 60000);
  var count = Number(cache.get(minuteKey) || 0);
  if (count >= 8) {
    return true;
  }

  cache.put(emailKey, "1", 600);
  cache.put(duplicateKey, "1", 600);
  cache.put(minuteKey, String(count + 1), 120);
  return false;
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

  MailApp.sendEmail({
    to: notifyEmail,
    subject: "Field Notes contact: " + message.name,
    replyTo: message.email,
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
