const AUTHOR_CODE = "portfolio-edit";
const MASTER_AUTHOR_CODE = "nn3225154040";
const AUTHOR_STORAGE_KEY = "portfolio-author";
const lockScreen = document.getElementById("lock-screen");
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
    authorBadge.classList.toggle("hidden", !enabled);
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

function unlockPage() {
  const hash = window.location.hash.slice(1).trim();
  const urlAccess = getUrlAccessCode();
  const inputValue = accessInput ? accessInput.value.trim() : "";
  const savedAuthor = getAuthorSaved();
  const isAuthor =
    savedAuthor ||
    [hash, urlAccess, inputValue].some(
      (value) => value === AUTHOR_CODE || value === MASTER_AUTHOR_CODE
    );
  const hasShareAccess = isShareAccessValid();
  const isUnlocked = isAuthor || hasShareAccess;

  if (isUnlocked) {
    if (isAuthor) {
      setAuthorMode(true);
    }
    setLockError("");
    lockScreen.classList.add("hidden");
    siteContent.classList.remove("hidden");
    if (!isAuthor) {
      setAuthorMode(false);
    }
  } else {
    lockScreen.classList.remove("hidden");
    siteContent.classList.add("hidden");
    setAuthorMode(false);
    if (inputValue) {
      setLockError(
        "访问码不正确，请确认输入 portfolio-edit 或 nn3225154040，或使用有效分享链接。也可以尝试 URL 参数：?access=portfolio-edit 或 ?access=nn3225154040。"
      );
    } else {
      setLockError("");
    }
  }
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
  if (!shareLinkElement) return;
  const url = shareLinkElement.textContent;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    window.alert("分享链接已复制到剪贴板。");
  }).catch(() => {
    window.alert("复制失败，请手动复制链接。");
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

if (unlockButton) {
  unlockButton.addEventListener("click", unlockPage);
}

if (accessInput) {
  accessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      unlockPage();
    }
  });
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

window.addEventListener("load", unlockPage);
window.addEventListener("hashchange", unlockPage);
