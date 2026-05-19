const AUTHOR_CODE = "portfolio-edit";
const MASTER_AUTHOR_CODE = "nn3225154040";
const AUTHOR_STORAGE_KEY = "portfolio-author";
// 部署到网站后，这里可以设成你站点的根地址：
// 例如 https://ningdesign-ai.github.io/nn-design--/
const BASE_SITE_URL = "https://ningdesign-ai.github.io/nn-design--/";
const bodyElement = document.body;
const siteContent = document.getElementById("site-content");
const uploadSection = document.getElementById("upload");
const authorBadge = document.getElementById("author-badge");
const accessInput = document.getElementById("access-code");
const unlockButton = document.getElementById("unlock-button");
const lockError = document.getElementById("lock-error");
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

function getAuthorSaved() {
  return localStorage.getItem(AUTHOR_STORAGE_KEY) === "true";
}

function setAuthorMode(enabled) {
  if (uploadSection) {
    uploadSection.classList.toggle("hidden", !enabled);
  }
  if (authorBadge) {
    authorBadge.textContent = enabled ? "作者模式" : "读者模式";
    authorBadge.classList.remove("hidden");
  }
  localStorage.setItem(AUTHOR_STORAGE_KEY, enabled ? "true" : "false");
}

function setLockError(message) {
  if (!lockError) return;
  if (!message) {
    lockError.textContent = "";
    lockError.classList.add("hidden");
    return;
  }
  lockError.textContent = message;
  lockError.classList.remove("hidden");
}

function getUrlAccessCode() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("access") ||
    params.get("auth") ||
    params.get("code") ||
    params.get("author") ||
    ""
  ).trim();
}

function buildAccessUrl(accessValue) {
  return `${getBaseUrl()}?access=${encodeURIComponent(accessValue)}`;
}

function isAuthorCode(value) {
  return value === AUTHOR_CODE || value === MASTER_AUTHOR_CODE;
}

function isShareAccessValid() {
  const params = new URLSearchParams(window.location.search);
  const shareCode = params.get("share");
  const expires = parseInt(params.get("exp"), 10);
  if (!shareCode || !/^\d{4}$/.test(shareCode)) {
    return false;
  }
  if (!expires || Number.isNaN(expires)) {
    return false;
  }
  return Date.now() <= expires;
}

function authorizePage() {
  const hash = window.location.hash.slice(1).trim();
  const urlAccess = getUrlAccessCode();
  const savedAuthor = getAuthorSaved();
  const hasExplicitAuthorAccess = [hash, urlAccess].some(isAuthorCode);
  const hasInvalidAuthorAttempt = (urlAccess && !isAuthorCode(urlAccess)) || (hash && !isAuthorCode(hash));
  const hasShareAccess = isShareAccessValid();
  const isUnlocked = hasExplicitAuthorAccess || savedAuthor || hasShareAccess;
  const isAuthor = hasExplicitAuthorAccess || savedAuthor;

  if (hasInvalidAuthorAttempt) {
    window.location.href = "lock.html";
    return;
  }

  if (!isUnlocked) {
    window.location.href = "lock.html";
    return;
  }

  setAuthorMode(isAuthor);

  if (bodyElement) {
    bodyElement.classList.add("visible");
  }
}

function handleUnlockClick() {
  const inputValue = accessInput ? accessInput.value.trim() : "";
  if (!inputValue) {
    setLockError("");
    return;
  }

  if (isAuthorCode(inputValue)) {
    const targetUrl = buildAccessUrl(inputValue === AUTHOR_CODE ? AUTHOR_CODE : MASTER_AUTHOR_CODE);
    if (window.location.search !== `?access=${encodeURIComponent(inputValue)}`) {
      window.location.href = targetUrl;
      return;
    }
  }

  setLockError("访问码不正确，请确认输入正确的作者码。");
}

function addVideoWork(file) {
  if (!videoGrid) return;
  const url = URL.createObjectURL(file);
  const item = document.createElement("article");
  item.className = "card";
  item.innerHTML = `
    <div class="video-preview">
      <video controls src="${url}" preload="metadata"></video>
    </div>
    <div class="card-body">
      <h3>${file.name}</h3>
      <p>已上传的视频作品，页面会直接播放。</p>
    </div>
  `;
  videoGrid.prepend(item);
}

function addImageWork(file, title, description) {
  if (!imageGrid) return;
  const url = URL.createObjectURL(file);
  const item = document.createElement("article");
  item.className = "card";
  item.innerHTML = `
    <img src="${url}" alt="${title}" />
    <div class="card-body">
      <h3>${title || file.name}</h3>
      <p>${description || "已上传的图文作品。"}</p>
    </div>
  `;
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

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
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
  const code = generateRandomCode();
  const expires = Date.now() + 3 * 24 * 60 * 60 * 1000;
  const url = `${getBaseUrl()}?share=${code}&exp=${expires}`;
  showShareResult(url, code, expires);
}

function copyShareLink() {
  if (!shareLinkElement || !shareKeyElement || !shareExpireElement) return;
  const url = shareLinkElement.textContent;
  const code = shareKeyElement.textContent;
  const expires = shareExpireElement.textContent;
  if (!url || !code || !expires) return;

  const textToCopy = `链接：${url}\n密码：${code}\n过期时间：${expires}`;
  navigator.clipboard.writeText(textToCopy).then(() => {
    window.alert("分享信息已复制到剪贴板。格式：链接、密码、过期时间。"
    );
  }).catch(() => {
    window.alert("复制失败，请手动复制分享信息。" );
  });
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

if (uploadVideoButton) {
  uploadVideoButton.addEventListener("click", uploadVideo);
}

if (uploadImageButton) {
  uploadImageButton.addEventListener("click", uploadImage);
}

if (generateShareLinkButton) {
  generateShareLinkButton.addEventListener("click", generateShareLink);
}

if (copyShareLinkButton) {
  copyShareLinkButton.addEventListener("click", copyShareLink);
}

window.addEventListener("load", authorizePage);
window.addEventListener("hashchange", authorizePage);
