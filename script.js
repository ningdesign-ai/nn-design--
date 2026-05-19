// === 设备认证配置 ===
const DEVICE_REGISTRATION_KEY = "88888886";
const AUTHOR_DEVICE_KEY = "portfolio-author-device";
const AUTHOR_STORAGE_KEY = "portfolio-author";
const BASE_SITE_URL = "https://ningdesign-ai.github.io/nn-design--/";

const bodyElement = document.body;
const siteContent = document.getElementById("site-content");
const uploadSection = document.getElementById("upload");
const authorBadge = document.getElementById("author-badge");
const deauthButton = document.getElementById("deauthorize-device");

const videoFileInput = document.getElementById("video-file");
const imageFileInput = document.getElementById("image-file");
const imageTitleInput = document.getElementById("image-title");
const imageDescriptionInput = document.getElementById("image-description");
const uploadVideoButton = document.getElementById("upload-video");
const uploadImageButton = document.getElementById("upload-image");
const generateShareLinkButton = document.getElementById("generate-share-link");
const shareResult = document.getElementById("share-result");
const shareLinkElement = document.getElementById("share-link");
const shareKeyElement = document.getElementById("share-key");
const shareExpireElement = document.getElementById("share-expire");
const copyShareLinkButton = document.getElementById("copy-share-link");
const videoGrid = document.querySelector("#videos .grid");
const imageGrid = document.querySelector("#images .grid");

// === 设备指纹 ===
function generateDeviceFingerprint() {
  var components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.colorDepth,
    screen.width,
    screen.height,
    navigator.hardwareConcurrency || 0,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  var str = components.join("|");
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "dev-" + Math.abs(hash).toString(36);
}

function isAuthorDevice() {
  var saved = localStorage.getItem(AUTHOR_DEVICE_KEY);
  if (!saved) return false;
  return saved === generateDeviceFingerprint();
}

function registerAuthorDevice(key) {
  if (key !== DEVICE_REGISTRATION_KEY) return false;
  localStorage.setItem(AUTHOR_DEVICE_KEY, generateDeviceFingerprint());
  localStorage.setItem(AUTHOR_STORAGE_KEY, "true");
  return true;
}

function deauthorizeDevice() {
  localStorage.removeItem(AUTHOR_DEVICE_KEY);
  localStorage.removeItem(AUTHOR_STORAGE_KEY);
  window.location.reload();
}

// === 模式切换 ===
function setAuthorMode(enabled) {
  if (uploadSection) {
    uploadSection.classList.toggle("hidden", !enabled);
  }
  if (authorBadge) {
    authorBadge.textContent = enabled ? "作者模式" : "读者模式";
    authorBadge.classList.remove("hidden");
  }
  if (deauthButton) {
    deauthButton.classList.toggle("hidden", !enabled);
  }
  localStorage.setItem(AUTHOR_STORAGE_KEY, enabled ? "true" : "false");
}

// === URL 参数解析 ===
function getUrlAccessCode() {
  var params = new URLSearchParams(window.location.search);
  return (
    params.get("access") ||
    params.get("auth") ||
    params.get("code") ||
    ""
  ).trim();
}

function isShareAccessValid() {
  var params = new URLSearchParams(window.location.search);
  var shareCode = params.get("share");
  var expires = parseInt(params.get("exp"), 10);
  if (!shareCode || !/^\d{4}$/.test(shareCode)) return false;
  if (!expires || isNaN(expires)) return false;
  return Date.now() <= expires;
}

// === 页面授权 ===
function authorizePage() {
  var hash = window.location.hash.slice(1).trim();
  var urlAccess = getUrlAccessCode();
  var registrationKey = urlAccess || hash;

  // 一次性设备注册（通过 URL 参数或 hash）
  if (registrationKey === DEVICE_REGISTRATION_KEY && !isAuthorDevice()) {
    registerAuthorDevice(DEVICE_REGISTRATION_KEY);
    window.location.href = getBaseUrl();
    return;
  }

  var isAuthor = isAuthorDevice();
  var hasShareAccess = isShareAccessValid();

  setAuthorMode(isAuthor);

  if (bodyElement) {
    bodyElement.classList.add("visible");
  }
}

// === 作品上传 ===
function addVideoWork(file) {
  if (!videoGrid) return;
  var url = URL.createObjectURL(file);
  var item = document.createElement("article");
  item.className = "card";
  item.innerHTML =
    '<div class="video-preview">' +
    '<video controls src="' + url + '" preload="metadata"></video>' +
    '</div>' +
    '<div class="card-body">' +
    '<h3>' + file.name + '</h3>' +
    '<p>已上传的视频作品。</p>' +
    '</div>';
  videoGrid.prepend(item);
}

function addImageWork(file, title, description) {
  if (!imageGrid) return;
  var url = URL.createObjectURL(file);
  var item = document.createElement("article");
  item.className = "card";
  item.innerHTML =
    '<img src="' + url + '" alt="' + (title || file.name) + '" />' +
    '<div class="card-body">' +
    '<h3>' + (title || file.name) + '</h3>' +
    '<p>' + (description || "已上传的图文作品。") + '</p>' +
    '</div>';
  imageGrid.prepend(item);
}

function uploadVideo() {
  if (!videoFileInput || !videoFileInput.files.length) {
    window.alert("请选择一个视频文件后再上传。");
    return;
  }
  addVideoWork(videoFileInput.files[0]);
  videoFileInput.value = "";
}

function uploadImage() {
  if (!imageFileInput || !imageFileInput.files.length) {
    window.alert("请选择一张图片后再上传。");
    return;
  }
  addImageWork(imageFileInput.files[0], imageTitleInput.value.trim(), imageDescriptionInput.value.trim());
  imageFileInput.value = "";
  imageTitleInput.value = "";
  imageDescriptionInput.value = "";
}

// === 分享链接 ===
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateRandomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function getBaseUrl() {
  if (BASE_SITE_URL) {
    return BASE_SITE_URL.replace(/\/index\.html$|\/$/, "/index.html");
  }
  if (window.location.protocol.startsWith("http")) {
    return window.location.origin + window.location.pathname;
  }
  return window.location.href.split("?")[0].split("#")[0];
}

function showShareResult(url, code, expires) {
  if (!shareResult || !shareLinkElement || !shareKeyElement || !shareExpireElement) return;
  shareLinkElement.textContent = url;
  shareLinkElement.href = url;
  shareKeyElement.textContent = code;
  shareExpireElement.textContent = formatDate(expires);
  shareResult.classList.remove("hidden");
}

function generateShareLink() {
  var code = generateRandomCode();
  var expires = Date.now() + 3 * 24 * 60 * 60 * 1000;
  var url = getBaseUrl() + "?share=" + code + "&exp=" + expires;
  showShareResult(url, code, expires);
}

function copyShareLink() {
  if (!shareLinkElement || !shareKeyElement || !shareExpireElement) return;
  var url = shareLinkElement.textContent;
  var code = shareKeyElement.textContent;
  var expires = shareExpireElement.textContent;
  if (!url || !code || !expires) return;
  navigator.clipboard.writeText("链接：" + url + "\n密码：" + code + "\n过期时间：" + expires)
    .then(function () { window.alert("分享信息已复制到剪贴板。"); })
    .catch(function () { window.alert("复制失败，请手动复制分享信息。"); });
}

// === 事件绑定 ===
if (uploadVideoButton) uploadVideoButton.addEventListener("click", uploadVideo);
if (uploadImageButton) uploadImageButton.addEventListener("click", uploadImage);
if (generateShareLinkButton) generateShareLinkButton.addEventListener("click", generateShareLink);
if (copyShareLinkButton) copyShareLinkButton.addEventListener("click", copyShareLink);
if (deauthButton) deauthButton.addEventListener("click", deauthorizeDevice);

window.addEventListener("load", authorizePage);
window.addEventListener("hashchange", authorizePage);
